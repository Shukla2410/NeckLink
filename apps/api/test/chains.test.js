import assert from "node:assert";
import test, { after } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool, query } from "../src/db.js";
import { createUser } from '../src/services/accounts.js';

test("API Health & DB Connectivity", async () => {
  const res = await request(app).get("/api/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");

  const dbRes = await request(app).get("/api/db-test");
  assert.strictEqual(dbRes.status, 200);
  assert.strictEqual(dbRes.body.status, "ok");
  assert.ok(dbRes.body.postgis);
});

test('production login protects driver vehicle and shipment scope',async()=>{
  const username=`driver_${Date.now()}`;
  await createUser({username,display_name:'Test driver',role:'driver',password:'Test-password-2026!',vehicle_id:'NL-MED-01'});
  const mode=process.env.APP_MODE;process.env.APP_MODE='production';
  try{
    assert.equal((await request(app).get('/api/vehicles')).status,401);
    const login=await request(app).post('/api/auth/login').send({username,password:'Test-password-2026!'});assert.equal(login.status,200);
    const cookie=login.headers['set-cookie'][0].split(';')[0];
    const fleet=await request(app).get('/api/vehicles').set('Cookie',cookie);assert.equal(fleet.status,200);assert.equal(fleet.body.vehicles.length,1);assert.equal(fleet.body.vehicles[0].id,'NL-MED-01');
    const forbidden=await request(app).post('/api/vehicles/NL-RAT-04/location').set('Cookie',cookie).set('X-Necklink-Client','web').send({lat:25,lng:90});assert.equal(forbidden.status,403);
    const admin=await request(app).post('/api/admin/users').set('Cookie',cookie).set('X-Necklink-Client','web').send({});assert.equal(admin.status,403);
    const overview=await request(app).get('/api/operations/overview').set('Cookie',cookie);assert.ok(overview.body.shipments.every(s=>s.vehicle_id==='NL-MED-01'));assert.equal(overview.body.inventory.length,0);
    await request(app).post('/api/auth/logout').set('Cookie',cookie);assert.equal((await request(app).get('/api/vehicles').set('Cookie',cookie)).status,401);
  }finally{process.env.APP_MODE=mode||'demo';}
});

test('data import is atomic and invalid datasets preserve existing records',async()=>{
  const id=`IMPORT-${Date.now()}`;
  const response=await request(app).post('/api/data-import').send({kind:'facilities',source:'Integration test',records:[{id,name:'Test facility',district_id:'D-GANGTOK',type:'HOSPITAL',hub:'Gangtok'},{id:id+'-bad',name:'Invalid',district_id:'missing',type:'HOSPITAL',hub:'Gangtok'}]});
  assert.equal(response.status,400);assert.equal((await query('SELECT id FROM facility WHERE id=$1',[id])).rows.length,0);
});

test("Chain 1: Rain -> Risk -> Route -> ETA -> Alert", async () => {
  const res = await request(app)
    .post("/api/roads/CORR-NH10/rainfall-spike")
    .send({ rainfall_mm: 120.0 });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");
  assert.ok(res.body.chain_result.risk_score >= 0.7);
  assert.ok(res.body.chain_result.recalculated_route);

  // Verify in PostgreSQL database
  const dbCheck = await query(
    "SELECT risk_score, status, rainfall_mm FROM corridor WHERE id = 'CORR-NH10'",
  );
  assert.ok(Number(dbCheck.rows[0].risk_score) >= 0.7);
  assert.strictEqual(Number(dbCheck.rows[0].rainfall_mm), 120.0);
});

test("Chain 2: Vehicle -> Risk Zone -> Geofence -> Alert", async () => {
  // Coordinates inside Teesta Basin GLOF/Landslide risk polygon (88.48, 27.10)
  const res = await request(app)
    .post("/api/vehicles/NL-POL-09/location")
    .send({ lat: 27.1, lng: 88.48, speed: 22.0 });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, "IN_RISK_ZONE");
  assert.strictEqual(res.body.data.geofence_breach, true);

  // Check alert was logged in DB
  const alertCheck = await query(
    "SELECT * FROM alert WHERE type = 'GEOFENCE_BREACH' ORDER BY created_at DESC LIMIT 1",
  );
  assert.ok(alertCheck.rows.length > 0);
  assert.ok(alertCheck.rows[0].translations.hi);
});

test("Chain 3: Field Report -> Offline Queue -> Sync -> Dashboard Update", async () => {
  const incId = `TEST-INC-${Date.now()}`;
  const res = await request(app).post("/api/incidents").send({
    id: incId,
    type: "LANDSLIDE",
    corridor_id: "CORR-NH29",
    lat: 25.76,
    lng: 93.83,
    description: "Severe slope failure across both lanes at Pagla Pahar",
    severity: "CRITICAL",
    source: "FIELD_OFFICER_OFFLINE_SYNC",
    sync_status: "SYNCED",
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, "ok");

  // Verify DB state
  const incCheck = await query("SELECT * FROM incident WHERE id = $1", [incId]);
  assert.strictEqual(incCheck.rows.length, 1);
  assert.strictEqual(incCheck.rows[0].sync_status, "SYNCED");

  const roadCheck = await query(
    "SELECT status FROM corridor WHERE id = 'CORR-NH29'",
  );
  assert.strictEqual(roadCheck.rows[0].status, "BLOCKED");
});

test("Chain 4: Satellite/GLOF -> Mock Seismic Trigger -> Downstream Impact -> Travel Time -> Red Zone -> Alert", async () => {
  const res = await request(app).post("/api/seismic-events").send({
    magnitude: 4.8,
    depth_km: 4.5,
    lake_id: "LAKE-SLHONAK",
  });

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.chain_result.downstream_cascade.length >= 3);
  assert.strictEqual(res.body.chain_result.corridor_status, "GLOF_ALERT");
  assert.ok(res.body.chain_result.corridor_risk_score >= 0.9);

  // Verify lake status escalated
  const lakeCheck = await query(
    "SELECT monitoring_status FROM glacial_lake WHERE id = 'LAKE-SLHONAK'",
  );
  assert.strictEqual(lakeCheck.rows[0].monitoring_status, "CRITICAL_ALERT");

  // Verify emergency alert with regional translation
  const alertCheck = await query(
    "SELECT * FROM alert WHERE type = 'GLOF_SURGE' ORDER BY created_at DESC LIMIT 1",
  );
  assert.ok(alertCheck.rows.length > 0);
  assert.ok(alertCheck.rows[0].translations.as);
});

test("Chain 5: Vehicle Speed Anomaly -> Early Disruption Signal -> Risk Update", async () => {
  const res = await request(app).post("/api/vehicles/simulate-anomaly").send({
    corridor_id: "CORR-NH29",
    speed_drop_kmh: -25.0,
  });

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.chain_result.updated_risk_score >= 0.7);

  // Verify corridor speed and risk updated in DB
  const roadCheck = await query(
    "SELECT current_speed, risk_score FROM corridor WHERE id = 'CORR-NH29'",
  );
  assert.ok(Number(roadCheck.rows[0].current_speed) <= 25.0);
  assert.ok(Number(roadCheck.rows[0].risk_score) >= 0.7);
});

after(async () => {
  await pool.end();
});

test("duplicate offline reports have exactly-once side effects", async () => {
  const id = `RETRY-${Date.now()}`;
  const body = {
    id,
    type: "LANDSLIDE",
    corridor_id: "CORR-NH29",
    lat: 25.76,
    lng: 93.83,
    description: `Retry regression ${id}`,
    severity: "HIGH",
  };
  const before = await query(
    "SELECT historical_incidents FROM corridor WHERE id='CORR-NH29'",
  );
  const a = await request(app).post("/api/incidents").send(body);
  const b = await request(app).post("/api/incidents").send(body);
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(b.body.duplicate, true);
  const after = await query(
    "SELECT historical_incidents FROM corridor WHERE id='CORR-NH29'",
  );
  assert.equal(
    after.rows[0].historical_incidents,
    before.rows[0].historical_incidents + 1,
  );
  const alerts = await query(
    "SELECT COUNT(*)::int AS n FROM alert WHERE message LIKE $1",
    [`%${id}%`],
  );
  assert.equal(alerts.rows[0].n, 1);
});
test("invalid GPS and report input are rejected", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/vehicles/NL-POL-09/location")
        .send({ lat: 200, lng: 88 })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/incidents")
        .send({ lat: "not a coordinate" })
    ).status,
    400,
  );
});
test("shipment lifecycle requires receiver proof and prevents delivery reversal", async () => {
  const result = await request(app)
    .post("/api/operations/shipments")
    .send({
      vehicle_id: "NL-MED-01",
      origin: "Siliguri",
      destination: "Gangtok",
      cargo: "Test medical kits",
      quantity: 2,
    });
  assert.equal(result.status, 201);
  const id = result.body.shipment.id;
  for (const status of ["DISPATCHED", "IN_TRANSIT"])
    assert.equal(
      (
        await request(app)
          .patch(`/api/operations/shipments/${id}/status`)
          .send({ status })
      ).status,
      200,
    );
  assert.equal(
    (
      await request(app)
        .patch(`/api/operations/shipments/${id}/status`)
        .send({ status: "DELIVERED" })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/operations/shipments/${id}/status`)
        .send({ status: "DELIVERED", delivery_note: "Receiver TEST" })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/operations/shipments/${id}/status`)
        .send({ status: "IN_TRANSIT" })
    ).status,
    409,
  );
});
test("operations overview returns districts, deliveries and stock", async () => {
  const response = await request(app).get("/api/operations/overview");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.districts));
  assert.ok(Array.isArray(response.body.inventory));
});

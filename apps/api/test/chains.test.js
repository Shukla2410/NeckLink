import assert from "node:assert";
import test, { after } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool, query } from "../src/db.js";

test("API Health & DB Connectivity", async () => {
  const res = await request(app).get("/api/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");

  const dbRes = await request(app).get("/api/db-test");
  assert.strictEqual(dbRes.status, 200);
  assert.strictEqual(dbRes.body.status, "ok");
  assert.ok(dbRes.body.postgis);
});

test("Chain 1: Rain -> Risk -> Route -> ETA -> Alert", async () => {
  const res = await request(app)
    .post("/api/roads/CORR-NH10/rainfall-spike")
    .send({ rainfall_mm: 120.0 });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");
  assert.ok(res.body.chain_result.risk_score >= 0.70);
  assert.ok(res.body.chain_result.recalculated_route);

  // Verify in PostgreSQL database
  const dbCheck = await query("SELECT risk_score, status, rainfall_mm FROM corridor WHERE id = 'CORR-NH10'");
  assert.ok(Number(dbCheck.rows[0].risk_score) >= 0.70);
  assert.strictEqual(Number(dbCheck.rows[0].rainfall_mm), 120.0);
});

test("Chain 2: Vehicle -> Risk Zone -> Geofence -> Alert", async () => {
  // Coordinates inside Teesta Basin GLOF/Landslide risk polygon (88.48, 27.10)
  const res = await request(app)
    .post("/api/vehicles/NL-POL-09/location")
    .send({ lat: 27.10, lng: 88.48, speed: 22.0 });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, "IN_RISK_ZONE");
  assert.strictEqual(res.body.data.geofence_breach, true);

  // Check alert was logged in DB
  const alertCheck = await query("SELECT * FROM alert WHERE type = 'GEOFENCE_BREACH' ORDER BY created_at DESC LIMIT 1");
  assert.ok(alertCheck.rows.length > 0);
  assert.ok(alertCheck.rows[0].translations.hi);
});

test("Chain 3: Field Report -> Offline Queue -> Sync -> Dashboard Update", async () => {
  const incId = `TEST-INC-${Date.now()}`;
  const res = await request(app)
    .post("/api/incidents")
    .send({
      id: incId,
      type: "LANDSLIDE",
      corridor_id: "CORR-NH29",
      lat: 25.76,
      lng: 93.83,
      description: "Severe slope failure across both lanes at Pagla Pahar",
      severity: "CRITICAL",
      source: "FIELD_OFFICER_OFFLINE_SYNC",
      sync_status: "SYNCED"
    });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, "ok");

  // Verify DB state
  const incCheck = await query("SELECT * FROM incident WHERE id = $1", [incId]);
  assert.strictEqual(incCheck.rows.length, 1);
  assert.strictEqual(incCheck.rows[0].sync_status, "SYNCED");

  const roadCheck = await query("SELECT status FROM corridor WHERE id = 'CORR-NH29'");
  assert.strictEqual(roadCheck.rows[0].status, "BLOCKED");
});

test("Chain 4: Satellite/GLOF -> Mock Seismic Trigger -> Downstream Impact -> Travel Time -> Red Zone -> Alert", async () => {
  const res = await request(app)
    .post("/api/seismic-events")
    .send({
      magnitude: 4.8,
      depth_km: 4.5,
      lake_id: "LAKE-SLHONAK"
    });

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.chain_result.downstream_cascade.length >= 3);
  assert.strictEqual(res.body.chain_result.corridor_status, "GLOF_ALERT");
  assert.ok(res.body.chain_result.corridor_risk_score >= 0.90);

  // Verify lake status escalated
  const lakeCheck = await query("SELECT monitoring_status FROM glacial_lake WHERE id = 'LAKE-SLHONAK'");
  assert.strictEqual(lakeCheck.rows[0].monitoring_status, "CRITICAL_ALERT");

  // Verify emergency alert with regional translation
  const alertCheck = await query("SELECT * FROM alert WHERE type = 'GLOF_SURGE' ORDER BY created_at DESC LIMIT 1");
  assert.ok(alertCheck.rows.length > 0);
  assert.ok(alertCheck.rows[0].translations.as);
});

test("Chain 5: Vehicle Speed Anomaly -> Early Disruption Signal -> Risk Update", async () => {
  const res = await request(app)
    .post("/api/vehicles/simulate-anomaly")
    .send({
      corridor_id: "CORR-NH29",
      speed_drop_kmh: -25.0
    });

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.chain_result.updated_risk_score >= 0.70);

  // Verify corridor speed and risk updated in DB
  const roadCheck = await query("SELECT current_speed, risk_score FROM corridor WHERE id = 'CORR-NH29'");
  assert.ok(Number(roadCheck.rows[0].current_speed) <= 25.0);
  assert.ok(Number(roadCheck.rows[0].risk_score) >= 0.70);
});

after(async () => {
  await pool.end();
});


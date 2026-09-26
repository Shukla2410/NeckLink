import "dotenv/config";
import { pool } from "./db.js";
// Explicitly fictional operational fixtures; additive and safe to run twice.
const c = await pool.connect();
try {
  await c.query("BEGIN");
  for (const [id, state, name, corridor, hub] of [
    ["D-GANGTOK", "SK", "Gangtok", "CORR-NH10", "Siliguri"],
    ["D-KOHIMA", "NL", "Kohima", "CORR-NH29", "Dimapur"],
    ["D-SHILLONG", "ML", "East Khasi Hills", "CORR-NH06", "Guwahati"],
    ["D-IMPHAL", "MN", "Imphal West", "CORR-NH102", "Moreh"],
  ]) {
    await c.query(
      "INSERT INTO district(id,state_id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [id, state, name],
    );
    await c.query(
      "INSERT INTO district_connection(district_id,corridor_id,hub) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [id, corridor, hub],
    );
  }
  for (const [id, name, district, type, hub, lat, lng] of [
    [
      "FAC-GANGTOK",
      "Demo Gangtok Medical Store",
      "D-GANGTOK",
      "HOSPITAL",
      "Gangtok",
      27.33,
      88.6,
    ],
    [
      "FAC-KOHIMA",
      "Demo Kohima Food Depot",
      "D-KOHIMA",
      "WAREHOUSE",
      "Kohima",
      25.67,
      94.11,
    ],
    [
      "FAC-SHILLONG",
      "Demo Shillong Relief Centre",
      "D-SHILLONG",
      "RELIEF_CENTRE",
      "Shillong",
      25.58,
      91.89,
    ],
  ]) {
    await c.query(
      "INSERT INTO facility(id,name,district_id,type,hub,lat,lng) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
      [id, name, district, type, hub, lat, lng],
    );
  }
  await c.query(
    `INSERT INTO inventory(facility_id,commodity,quantity,daily_usage,unit) VALUES ('FAC-GANGTOK','Medical kits',40,25,'boxes'),('FAC-KOHIMA','Rice',600,100,'kg'),('FAC-SHILLONG','Water packs',120,50,'boxes') ON CONFLICT DO NOTHING`,
  );
  await c.query(
    `INSERT INTO shipment(id,vehicle_id,facility_id,origin,destination,cargo,quantity,priority,status,deadline) VALUES ('DEMO-MED-001','NL-MED-01','FAC-GANGTOK','Siliguri','Gangtok','Medical kits',60,'URGENT','DISPATCHED',NOW()+INTERVAL '8 hours'),('DEMO-FOOD-002','NL-RAT-04','FAC-KOHIMA','Dimapur','Kohima','Rice bags',100,'HIGH','PLANNED',NOW()+INTERVAL '12 hours') ON CONFLICT DO NOTHING`,
  );
  await c.query(
    `INSERT INTO bridge(id,name,corridor_id,status,max_weight_tonnes) VALUES('DEMO-BRIDGE-01','Demonstration bridge restriction — verify before travel','CORR-NH10','RESTRICTED',20) ON CONFLICT DO NOTHING`,
  );
  await c.query("COMMIT");
  console.log(
    "Added fictional district, facility, delivery and stock examples.",
  );
} catch (e) {
  await c.query("ROLLBACK");
  console.error(e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}

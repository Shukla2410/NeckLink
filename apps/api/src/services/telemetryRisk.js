import { query } from "../db.js";
import { predictRisk } from "../mlClient.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";
import { randomUUID } from "node:crypto";
export async function evaluateFleetSlowdown(corridorId) {
  if (!corridorId) return;
  const result = await query(
    `SELECT COUNT(DISTINCT l.vehicle_id)::int AS vehicles,COUNT(*)::int AS samples,AVG(l.speed)::float AS speed FROM vehicle_location l JOIN vehicle v ON v.id=l.vehicle_id WHERE v.corridor_id=$1 AND l.timestamp>NOW()-INTERVAL '5 minutes'`,
    [corridorId],
  );
  const signal = result.rows[0];
  if (signal.vehicles < 2 || signal.samples < 6) return;
  const road = (await query("SELECT * FROM corridor WHERE id=$1", [corridorId]))
    .rows[0];
  if (!road) return;
  const anomaly = signal.speed - Number(road.baseline_speed);
  if (anomaly > -15) return;
  const recent = await query(
    "SELECT id FROM alert WHERE corridor_id=$1 AND type='SPEED_ANOMALY' AND created_at>NOW()-INTERVAL '15 minutes'",
    [corridorId],
  );
  if (recent.rows.length) return;
  const prediction = await predictRisk({
    corridor_id: corridorId,
    rainfall_mm: Number(road.rainfall_mm),
    slope_deg: Number(road.slope_deg),
    historical_incidents: road.historical_incidents,
    vehicle_speed_anomaly: anomaly,
  });
  const risk = Math.max(Number(road.risk_score), prediction.risk_score);
  const updated = await query(
    "UPDATE corridor SET current_speed=$1,risk_score=$2,status=CASE WHEN status IN ('BLOCKED','GLOF_ALERT') THEN status ELSE 'AT_RISK' END,updated_at=NOW() WHERE id=$3 RETURNING status",
    [signal.speed, risk, corridorId],
  );
  const message = `${signal.vehicles} vehicles are moving unusually slowly on ${road.name}. Average ${Math.round(signal.speed)} km/h across ${signal.samples} recent observations. Possible congestion; cause unverified.`;
  const id = randomUUID(),
    translations = await translateAlert("SPEED_ANOMALY", message);
  await query(
    "INSERT INTO alert(id,type,severity,corridor_id,title,message,translations,status) VALUES($1,'SPEED_ANOMALY','WARNING',$2,'Traffic slowdown detected',$3,$4,'CREATED')",
    [id, corridorId, message, JSON.stringify(translations)],
  );
  broadcastEvent("ROAD_STATUS_CHANGED", {
    corridor_id: corridorId,
    risk_score: risk,
    current_speed: signal.speed,
    status: updated.rows[0].status,
  });
  broadcastEvent("ALERT_CREATED", {
    id,
    title: "Traffic slowdown detected",
    message,
    translations,
    severity: "WARNING",
    corridor_id: corridorId,
    created_at: new Date().toISOString(),
  });
}

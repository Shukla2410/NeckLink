import express from "express";
import { query } from "../db.js";
import { predictRisk } from "../mlClient.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";

const router = express.Router();

// GET all vehicles
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT 
        v.id, v.plate_number, v.operator, v.type, v.status, v.corridor_id,
        v.current_lat, v.current_lng, v.current_speed, v.heading, v.cargo_summary, v.updated_at,
        c.name as corridor_name, c.code as corridor_code
      FROM vehicle v
      LEFT JOIN corridor c ON v.corridor_id = c.id
      WHERE ($1::text IS NULL OR v.id=$1)
      ORDER BY v.id ASC
    `,
      [
        req.actor === "driver"
          ? req.user?.vehicle_id || "__unassigned__"
          : null,
      ],
    );

    res.json({
      status: "ok",
      count: result.rows.length,
      vehicles: result.rows.map((v) => ({
        ...v,
        current_lat: Number(v.current_lat),
        current_lng: Number(v.current_lng),
        current_speed: Number(v.current_speed),
        heading: Number(v.heading),
      })),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET location history
router.get("/:id/locations", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT id, lat, lng, speed, heading, timestamp
      FROM vehicle_location
      WHERE vehicle_id = $1
      ORDER BY timestamp DESC
      LIMIT 100
    `,
      [req.params.id],
    );

    res.json({
      status: "ok",
      vehicle_id: req.params.id,
      locations: result.rows.map((l) => ({
        ...l,
        lat: Number(l.lat),
        lng: Number(l.lng),
        speed: Number(l.speed),
      })),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Helper point-in-polygon in JS if PostGIS polygon test needs fallback
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// POST vehicle location update (Chain 2: Vehicle -> Risk Zone -> Geofence -> Alert)
router.post("/:id/location", async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const { lat, lng, speed = 40.0, heading = 90.0 } = req.body;

    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng)) ||
      Math.abs(Number(lat)) > 90 ||
      Math.abs(Number(lng)) > 180 ||
      !Number.isFinite(Number(speed)) ||
      Number(speed) < 0 ||
      Number(speed) > 200
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "lat and lng are required" });
    }

    // 1. Check geofence breach against active risk zones
    const existing = await query("SELECT * FROM vehicle WHERE id=$1", [
      vehicleId,
    ]);
    if (!existing.rows.length)
      return res.status(404).json({ message: "Vehicle not found" });
    const zonesRes = await query(
      "SELECT id, name, type, severity, polygon_coordinates FROM risk_zone WHERE active_from<=NOW() AND (active_until IS NULL OR active_until>NOW()) ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 ELSE 1 END",
    );
    let breachZone = null;

    for (const z of zonesRes.rows) {
      if (z.polygon_coordinates && Array.isArray(z.polygon_coordinates)) {
        // coordinates are [lng, lat]
        if (
          isPointInPolygon([Number(lng), Number(lat)], z.polygon_coordinates)
        ) {
          breachZone = z;
          break;
        }
      }
    }

    const newStatus = breachZone ? "IN_RISK_ZONE" : "ACTIVE";

    // 2. Update vehicle current position and status
    await query(
      `
      UPDATE vehicle
      SET current_lat = $1::numeric, current_lng = $2::numeric, current_speed = $3, heading = $4, status = $5, geometry=ST_SetSRID(ST_MakePoint($2::numeric::double precision,$1::numeric::double precision),4326), updated_at = NOW()
      WHERE id = $6
    `,
      [lat, lng, speed, heading, newStatus, vehicleId],
    );

    // 3. Log history trail
    await query(
      `
      INSERT INTO vehicle_location (vehicle_id, lat, lng, speed, heading, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
      [vehicleId, lat, lng, speed, heading],
    );

    let alertData = null;
    if (breachZone && existing.rows[0].status !== "IN_RISK_ZONE") {
      const alertId = `ALT-GEO-${Date.now()}`;
      const alertMsg = `Vehicle ${vehicleId} entered active danger polygon: ${breachZone.name} (${breachZone.type}). Proximity telematics alerted.`;
      const translations = await translateAlert("GEOFENCE_BREACH", alertMsg);

      await query(
        `
        INSERT INTO alert (id, type, severity, title, message, translations, recipients, status)
        VALUES ($1, 'GEOFENCE_BREACH', 'CRITICAL', $2, $3, $4, 'ALL_CIVIL_AND_LOGISTICS_TEAMS', 'DISPATCHED')
      `,
        [
          alertId,
          `Geofence Breach: ${vehicleId}`,
          alertMsg,
          JSON.stringify(translations),
        ],
      );

      alertData = {
        id: alertId,
        type: "GEOFENCE_BREACH",
        severity: "CRITICAL",
        title: `Geofence Breach: ${vehicleId}`,
        message: alertMsg,
        translations,
      };

      // Broadcast geofence event
      broadcastEvent("VEHICLE_ENTERED_RISK_ZONE", {
        vehicle_id: vehicleId,
        lat: Number(lat),
        lng: Number(lng),
        speed: Number(speed),
        zone_id: breachZone.id,
        zone_name: breachZone.name,
        alert: alertData,
      });
      broadcastEvent("ALERT_CREATED", alertData);
    }

    const updatePayload = {
      vehicle_id: vehicleId,
      lat: Number(lat),
      lng: Number(lng),
      speed: Number(speed),
      heading: Number(heading),
      status: newStatus,
      geofence_breach: Boolean(breachZone),
      breached_zone: breachZone ? breachZone.name : null,
    };

    broadcastEvent("VEHICLE_LOCATION_UPDATED", updatePayload);
    const { evaluateFleetSlowdown } =
      await import("../services/telemetryRisk.js");
    await evaluateFleetSlowdown(existing.rows[0].corridor_id);

    res.json({
      status: "ok",
      data: updatePayload,
    });
  } catch (err) {
    console.error("Vehicle location update error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST simulate speed anomaly (Chain 5: Vehicle Speed Anomaly -> Early Signal -> Risk Update)
router.post("/simulate-anomaly", async (req, res) => {
  try {
    const { corridor_id = "CORR-NH29", speed_drop_kmh = -26.0 } = req.body;

    const roadRes = await query("SELECT * FROM corridor WHERE id = $1", [
      corridor_id,
    ]);
    if (roadRes.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Corridor not found" });
    }

    const road = roadRes.rows[0];
    const newSpeed = Math.max(
      8.0,
      Number(road.baseline_speed) + Number(speed_drop_kmh),
    );

    // Call ML Risk engine with speed anomaly signal
    const prediction = await predictRisk({
      corridor_id,
      rainfall_mm: Number(road.rainfall_mm || 15.0),
      rainfall_trend: 1,
      slope_deg: Number(road.slope_deg || 20.0),
      historical_incidents: Number(road.historical_incidents || 5),
      vehicle_speed_anomaly: Number(speed_drop_kmh),
      season: 2,
    });

    const elevatedRisk = Math.max(0.72, prediction.risk_score);
    const newStatus = elevatedRisk >= 0.7 ? "AT_RISK" : "OPEN";

    // Update corridor in DB
    await query(
      `
      UPDATE corridor
      SET current_speed = $1, risk_score = GREATEST(risk_score,$2), status = CASE WHEN status IN ('BLOCKED','GLOF_ALERT') THEN status ELSE $3 END, updated_at = NOW()
      WHERE id = $4
    `,
      [newSpeed, elevatedRisk, newStatus, corridor_id],
    );

    // Also update attached fleet vehicles on this corridor to reflect slowdown
    await query(
      `
      UPDATE vehicle
      SET current_speed = $1, status = 'DELAYED', updated_at = NOW()
      WHERE corridor_id = $2
    `,
      [newSpeed, corridor_id],
    );

    // Create Early-Signal Alert
    const alertId = `ALT-ANOMALY-${Date.now()}`;
    const alertMsg = `Early warning telematic signal on ${road.name}: Multiple convoys slowed by ${Math.abs(speed_drop_kmh)} km/h. Unreported roadblock or mud accumulation detected before civilian reports.`;
    const translations = await translateAlert("SPEED_ANOMALY", alertMsg);

    await query(
      `
      INSERT INTO alert (id, type, severity, corridor_id, title, message, translations, recipients, status)
      VALUES ($1, 'SPEED_ANOMALY', 'WARNING', $2, $3, $4, $5, 'ALL_CIVIL_AND_LOGISTICS_TEAMS', 'DISPATCHED')
    `,
      [
        alertId,
        corridor_id,
        `Speed Anomaly: ${road.code}`,
        alertMsg,
        JSON.stringify(translations),
      ],
    );

    const payload = {
      corridor_id,
      corridor_name: road.name,
      baseline_speed: Number(road.baseline_speed),
      current_speed: newSpeed,
      speed_anomaly: speed_drop_kmh,
      updated_risk_score: elevatedRisk,
      status: newStatus,
      alert_id: alertId,
      reason: "Automated fleet velocity deceleration telemetry",
    };

    broadcastEvent("VEHICLE_SPEED_ANOMALY", payload);
    broadcastEvent("RISK_SCORE_UPDATED", payload);
    broadcastEvent("ROAD_STATUS_CHANGED", { corridor_id, status: newStatus });
    broadcastEvent("ALERT_CREATED", {
      id: alertId,
      type: "SPEED_ANOMALY",
      severity: "WARNING",
      title: `Speed Anomaly: ${road.code}`,
      message: alertMsg,
      translations,
    });

    res.json({
      status: "ok",
      message:
        "Speed anomaly processed, corridor risk elevated without manual incident filing",
      chain_result: payload,
    });
  } catch (err) {
    console.error("Anomaly simulation error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

import express from "express";
import { query } from "../db.js";
import { calculateGlofTravelTime } from "../mlClient.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";

const router = express.Router();

// POST trigger seismic event (Chain 4: GLOF -> Mock Seismic Trigger -> Travel Time -> Red Zone -> Alert)
router.post("/", async (req, res) => {
  try {
    const {
      magnitude = 4.8,
      depth_km = 4.5,
      lat = 27.915,
      lng = 88.204,
      classification = "ICE_ROCK_AVALANCHE_TRIGGER",
      lake_id = "LAKE-SLHONAK",
    } = req.body;

    const lake = (
      await query("SELECT * FROM glacial_lake WHERE id=$1", [lake_id])
    ).rows[0];
    if (!lake) return res.status(404).json({ message: "Lake not found" });
    if (lake_id !== "LAKE-SLHONAK")
      return res
        .status(422)
        .json({ message: "No downstream scenario configured for this lake" });
    if (!Number.isFinite(Number(magnitude)) || magnitude < 0 || magnitude > 10)
      return res.status(400).json({ message: "Invalid magnitude" });
    const eventId = `SEIS-${Date.now()}`;

    // 1. Calculate downstream flood surge propagation and travel time
    const cascadeResult = await calculateGlofTravelTime(
      lake_id,
      "South Lhonak Glacial Lake",
      48000000,
    );

    const downstreamImpactSummary = `Surge wave velocity: ${cascadeResult.surge_velocity_range_kmh}. First community ETA: ${cascadeResult.critical_evacuation_window}. Affected corridor: NH-10 Teesta Axis.`;

    // 2. Insert seismic event record
    await query(
      `
      INSERT INTO seismic_event (
        id, timestamp, lat, lng, depth_km, magnitude, classification, downstream_impact, simulated
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, TRUE)
    `,
      [
        eventId,
        lat,
        lng,
        depth_km,
        magnitude,
        classification,
        downstreamImpactSummary,
      ],
    );

    // 3. Escalate lake monitoring status to CRITICAL_ALERT
    await query(
      `
      UPDATE glacial_lake
      SET monitoring_status = 'CRITICAL_ALERT'
      WHERE id = $1
    `,
      [lake_id],
    );

    // 4. Turn downstream corridor NH-10 into GLOF_ALERT with 0.96 risk score
    await query(`
      UPDATE corridor
      SET status = 'GLOF_ALERT', risk_score = 0.96, updated_at = NOW()
      WHERE id = 'CORR-NH10'
    `);

    // 5. Ensure red risk zone exists and is marked CRITICAL
    await query(`
      UPDATE risk_zone
      SET severity = 'CRITICAL', active_from = NOW()
      WHERE corridor_id = 'CORR-NH10' AND type = 'GLOF_PATH'
    `);

    // 6. Create cascading multilingual alert
    const alertId = `ALT-GLOF-${Date.now()}`;
    const alertMsg = `SIMULATED GLOF SCENARIO: ${lake.name}, magnitude ${magnitude}. Illustrative downstream arrival: ${cascadeResult.downstream_cascade
      .slice(0, 2)
      .map((t) => `${t.target}: ${t.estimated_arrival_formatted}`)
      .join(
        "; ",
      )}. NH-10 marked closed in this scenario. Not an official evacuation order.`;
    const translations = await translateAlert("GLOF_SURGE", alertMsg);

    await query(
      `
      INSERT INTO alert (id, type, severity, corridor_id, title, message, translations, recipients, status)
      VALUES ($1, 'GLOF_SURGE', 'EMERGENCY', 'CORR-NH10', 'EMERGENCY: South Lhonak GLOF Outburst Triggered', $2, $3, 'STATE_DISASTER_MANAGEMENT_AUTHORITY', 'DISPATCHED')
    `,
      [alertId, alertMsg, JSON.stringify(translations)],
    );

    const payload = {
      event_id: eventId,
      magnitude: Number(magnitude),
      depth_km: Number(depth_km),
      epicenter: { lat: Number(lat), lng: Number(lng) },
      classification,
      downstream_cascade: cascadeResult.downstream_cascade,
      first_settlement_eta: cascadeResult.critical_evacuation_window,
      affected_corridor: "CORR-NH10",
      corridor_status: "GLOF_ALERT",
      corridor_risk_score: 0.96,
      lake_id,
      alert_id: alertId,
    };

    // Broadcast cause-and-effect chain real-time event
    broadcastEvent("SEISMIC_ANOMALY", payload);
    broadcastEvent("GLOF_TRIGGERED", payload);
    broadcastEvent("ROAD_STATUS_CHANGED", {
      corridor_id: "CORR-NH10",
      status: "GLOF_ALERT",
      risk_score: 0.96,
    });
    broadcastEvent("ALERT_CREATED", {
      id: alertId,
      type: "GLOF_SURGE",
      severity: "EMERGENCY",
      title: "EMERGENCY: South Lhonak GLOF Outburst Triggered",
      message: alertMsg,
      translations,
    });

    res.json({
      status: "ok",
      message:
        "Seismic GLOF trigger executed successfully. Downstream travel-time computed and alerts dispatched.",
      chain_result: payload,
    });
  } catch (err) {
    console.error("Seismic trigger error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET seismic history
router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT id, timestamp, lat, lng, depth_km, magnitude, classification, downstream_impact, simulated
      FROM seismic_event
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    res.json({
      status: "ok",
      count: result.rows.length,
      events: result.rows.map((e) => ({
        ...e,
        lat: Number(e.lat),
        lng: Number(e.lng),
        depth_km: Number(e.depth_km),
        magnitude: Number(e.magnitude),
      })),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

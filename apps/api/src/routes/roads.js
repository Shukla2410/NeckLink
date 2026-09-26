import express from "express";
import { query } from "../db.js";
import { predictRisk, requestRoute } from "../mlClient.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";

const router = express.Router();

// GET all corridors
router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, name, code, origin, destination, state, distance_km, status,
        risk_score, current_speed, baseline_speed, rainfall_mm, rainfall_trend,
        slope_deg, historical_incidents, path_coordinates, updated_at
      FROM corridor
      ORDER BY id ASC
    `);

    res.json({
      status: "ok",
      count: result.rows.length,
      roads: result.rows.map((r) => ({
        ...r,
        distance_km: Number(r.distance_km),
        risk_score: Number(r.risk_score),
        current_speed: Number(r.current_speed),
        baseline_speed: Number(r.baseline_speed),
        rainfall_mm: Number(r.rainfall_mm),
        slope_deg: Number(r.slope_deg),
        coordinates: r.path_coordinates,
      })),
    });
  } catch (err) {
    console.error("Error fetching corridors:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET single corridor details with attached incidents
router.get("/:id", async (req, res) => {
  try {
    const roadRes = await query("SELECT * FROM corridor WHERE id = $1", [
      req.params.id,
    ]);
    if (roadRes.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Corridor not found" });
    }

    const incidentsRes = await query(
      "SELECT * FROM incident WHERE corridor_id = $1 ORDER BY created_at DESC",
      [req.params.id],
    );
    const zonesRes = await query(
      "SELECT * FROM risk_zone WHERE corridor_id = $1",
      [req.params.id],
    );

    const road = roadRes.rows[0];
    res.json({
      status: "ok",
      road: {
        ...road,
        distance_km: Number(road.distance_km),
        risk_score: Number(road.risk_score),
        current_speed: Number(road.current_speed),
        baseline_speed: Number(road.baseline_speed),
        rainfall_mm: Number(road.rainfall_mm),
        slope_deg: Number(road.slope_deg),
        coordinates: road.path_coordinates,
        incidents: incidentsRes.rows,
        risk_zones: zonesRes.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST rainfall spike trigger (Chain 1: Rain -> Risk -> Route -> ETA -> Dashboard)
router.post("/:id/rainfall-spike", async (req, res) => {
  try {
    const corridorId = req.params.id;
    const { rainfall_mm = 115.0 } = req.body;
    if (
      !Number.isFinite(Number(rainfall_mm)) ||
      Number(rainfall_mm) < 0 ||
      Number(rainfall_mm) > 1000
    )
      return res
        .status(400)
        .json({ message: "Rainfall must be between 0 and 1000 mm" });

    const roadRes = await query("SELECT * FROM corridor WHERE id = $1", [
      corridorId,
    ]);
    if (roadRes.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Corridor not found" });
    }

    const road = roadRes.rows[0];

    // Predict new risk using ML engine
    const prediction = await predictRisk({
      corridor_id: corridorId,
      rainfall_mm: Number(rainfall_mm),
      rainfall_trend: 2, // RISING
      slope_deg: Number(road.slope_deg || 25),
      historical_incidents: Number(road.historical_incidents || 5),
      vehicle_speed_anomaly: -15.0,
      season: 2,
    });

    const newRisk = prediction.risk_score;
    let newStatus = "AT_RISK";
    if (newRisk >= 0.8) newStatus = "BLOCKED";
    else if (newRisk < 0.4) newStatus = "OPEN";
    if (["BLOCKED", "GLOF_ALERT"].includes(road.status))
      newStatus = road.status;

    // Update database
    await query(
      `
      UPDATE corridor
      SET rainfall_mm = $1, rainfall_trend = 'RISING', risk_score = $2, status = $3, updated_at = NOW()
      WHERE id = $4
    `,
      [rainfall_mm, newRisk, newStatus, corridorId],
    );

    // Recalculate route across network
    const allRoads = (await query("SELECT id,risk_score,status FROM corridor"))
      .rows;
    const routeRecalc = await requestRoute(
      road.origin,
      road.destination,
      4.0,
      Object.fromEntries(allRoads.map((r) => [r.id, Number(r.risk_score)])),
      {
        closed_corridors: allRoads
          .filter((r) => ["BLOCKED", "GLOF_ALERT"].includes(r.status))
          .map((r) => r.id),
      },
    ).catch((error) => ({ unavailable: true, message: error.message }));

    // Create an alert for the rainfall spike
    const alertId = `ALT-RAIN-${Date.now()}`;
    const alertMsg = `Precipitation surge (${rainfall_mm}mm) triggered on ${road.name}. Risk probability elevated to ${Math.round(newRisk * 100)}%. Rerouting recommended.`;
    const translations = await translateAlert("RISK_SPIKE", alertMsg);

    await query(
      `
      INSERT INTO alert (id, type, severity, corridor_id, title, message, translations, recipients, status)
      VALUES ($1, 'RISK_SPIKE', 'WARNING', $2, $3, $4, $5, 'ALL_CIVIL_AND_LOGISTICS_TEAMS', 'DISPATCHED')
    `,
      [
        alertId,
        corridorId,
        `Rainfall Surge on ${road.code}`,
        alertMsg,
        JSON.stringify(translations),
      ],
    );

    const payload = {
      corridor_id: corridorId,
      corridor_name: road.name,
      rainfall_mm: Number(rainfall_mm),
      risk_score: newRisk,
      risk_level: prediction.risk_level,
      status: newStatus,
      recalculated_route: routeRecalc,
      alert_id: alertId,
      explanation: prediction.explanation,
    };

    // Broadcast cause-and-effect chain real-time event
    broadcastEvent("ROAD_STATUS_CHANGED", payload);
    broadcastEvent("RISK_SCORE_UPDATED", payload);
    broadcastEvent("ROUTE_RECALCULATED", payload);
    broadcastEvent("ALERT_CREATED", {
      id: alertId,
      type: "RISK_SPIKE",
      severity: "WARNING",
      title: `Rainfall Surge on ${road.code}`,
      message: alertMsg,
      translations,
    });

    res.json({
      status: "ok",
      message: "Rainfall spike applied and real-time rerouting triggered",
      chain_result: payload,
    });
  } catch (err) {
    console.error("Rainfall spike error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

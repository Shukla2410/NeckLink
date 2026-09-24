import express from "express";
import { query } from "../db.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";

const router = express.Router();

// GET all incidents
router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        i.id, i.type, i.corridor_id, i.lat, i.lng, i.description,
        i.severity, i.source, i.image_ref, i.sync_status, i.created_at,
        c.name as corridor_name, c.code as corridor_code
      FROM incident i
      LEFT JOIN corridor c ON i.corridor_id = c.id
      ORDER BY i.created_at DESC
    `);

    res.json({
      status: "ok",
      count: result.rows.length,
      incidents: result.rows.map(r => ({
        ...r,
        lat: Number(r.lat),
        lng: Number(r.lng)
      }))
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST report incident (Chain 3: Field Report -> Offline Queue -> Sync -> Dashboard)
router.post("/", async (req, res) => {
  try {
    const {
      type = "LANDSLIDE",
      corridor_id = "CORR-NH29",
      lat = 25.75,
      lng = 93.82,
      description = "Slope collapse observed obstructing transit",
      severity = "HIGH",
      source = "FIELD_OFFICER_OFFLINE_SYNC",
      image_ref = null,
      sync_status = "SYNCED"
    } = req.body;

    const incidentId = req.body.id || `INC-${Date.now()}`;

    // Insert incident into DB
    await query(`
      INSERT INTO incident (
        id, type, corridor_id, lat, lng, description, severity, source, image_ref, sync_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (id) DO UPDATE SET sync_status = 'SYNCED', description = EXCLUDED.description
    `, [incidentId, type, corridor_id, lat, lng, description, severity, source, image_ref, sync_status]);

    // If severity is HIGH or CRITICAL, elevate corridor risk and status
    if (severity === "CRITICAL" || severity === "HIGH") {
      await query(`
        UPDATE corridor
        SET status = CASE WHEN $1 = 'CRITICAL' THEN 'BLOCKED' ELSE 'AT_RISK' END,
            risk_score = GREATEST(risk_score, 0.78),
            historical_incidents = historical_incidents + 1,
            updated_at = NOW()
        WHERE id = $2
      `, [severity, corridor_id]);
    }

    // Create central alert
    const alertId = `ALT-INC-${Date.now()}`;
    const alertMsg = `Verified field incident: ${type} reported on ${corridor_id}. ${description}`;
    const translations = await translateAlert("FIELD_INCIDENT", alertMsg);

    await query(`
      INSERT INTO alert (id, type, severity, corridor_id, title, message, translations, recipients, status)
      VALUES ($1, 'FIELD_INCIDENT', $2, $3, $4, $5, $6, 'ALL_CIVIL_AND_LOGISTICS_TEAMS', 'DISPATCHED')
    `, [alertId, severity === "CRITICAL" ? "CRITICAL" : "WARNING", corridor_id, `Incident: ${type}`, alertMsg, JSON.stringify(translations)]);

    const payload = {
      incident: {
        id: incidentId,
        type,
        corridor_id,
        lat: Number(lat),
        lng: Number(lng),
        description,
        severity,
        source,
        sync_status: "SYNCED",
        created_at: new Date().toISOString()
      },
      alert_id: alertId
    };

    // Broadcast cause-and-effect chain real-time event
    broadcastEvent("INCIDENT_REPORTED", payload);
    broadcastEvent("INCIDENT_SYNCED", payload);
    broadcastEvent("ROAD_STATUS_CHANGED", { corridor_id, status: severity === "CRITICAL" ? "BLOCKED" : "AT_RISK" });
    broadcastEvent("ALERT_CREATED", {
      id: alertId,
      type: "FIELD_INCIDENT",
      severity: severity === "CRITICAL" ? "CRITICAL" : "WARNING",
      title: `Incident: ${type}`,
      message: alertMsg,
      translations
    });

    res.status(201).json({
      status: "ok",
      message: "Incident logged and synchronized successfully to central command",
      data: payload
    });
  } catch (err) {
    console.error("Incident sync error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

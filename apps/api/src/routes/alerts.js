import express from "express";
import { query } from "../db.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";

const router = express.Router();

// GET all alerts
router.get("/", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, type, severity, corridor_id, title, message, translations, recipients, status, created_at
      FROM alert
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      status: "ok",
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST new alert
router.post("/", async (req, res) => {
  try {
    const {
      type = "RISK_SPIKE",
      severity = "WARNING",
      corridor_id = null,
      title,
      message,
      recipients = "ALL_CIVIL_AND_LOGISTICS_TEAMS"
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ status: "error", message: "title and message are required" });
    }

    const alertId = `ALT-${Date.now()}`;
    const translations = await translateAlert(type, message);

    await query(`
      INSERT INTO alert (id, type, severity, corridor_id, title, message, translations, recipients, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DISPATCHED')
    `, [alertId, type, severity, corridor_id, title, message, JSON.stringify(translations), recipients]);

    const newAlert = {
      id: alertId,
      type,
      severity,
      corridor_id,
      title,
      message,
      translations,
      recipients,
      status: "DISPATCHED",
      created_at: new Date().toISOString()
    };

    broadcastEvent("ALERT_CREATED", newAlert);

    // If critical or emergency, asynchronously attempt Twilio SMS dispatch
    if (newAlert.severity === "CRITICAL" || newAlert.severity === "EMERGENCY") {
      import("../services/twilioService.js")
        .then(m => m.sendSmsAlert(process.env.TEST_ALERT_PHONE || "+17372212163", `${newAlert.title}: ${newAlert.message}`))
        .catch(() => {});
    }

    res.status(201).json({ status: "ok", alert: newAlert });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST send explicit SMS to a responder or user
router.post("/send-sms", async (req, res) => {
  try {
    const { to, message = "NECKLINK Alert: Highway landslide warning on NH-29. Alternate route recommended." } = req.body;
    if (!to) {
      return res.status(400).json({ status: "error", message: "Phone number (to) is required" });
    }

    const { sendSmsAlert } = await import("../services/twilioService.js");
    const result = await sendSmsAlert(to, message);

    res.json({
      status: result.success ? "ok" : "failed",
      result
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

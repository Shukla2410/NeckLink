import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [roadsRes, vehiclesRes, alertsRes, lakesRes, zonesRes] =
      await Promise.all([
        query("SELECT status, risk_score FROM corridor"),
        query("SELECT status FROM vehicle"),
        query(
          "SELECT severity FROM alert WHERE acknowledged_at IS NULL AND expires_at>NOW()",
        ),
        query("SELECT monitoring_status FROM glacial_lake"),
        query("SELECT severity FROM risk_zone"),
      ]);

    const totalCorridors = roadsRes.rows.length;
    let openCount = 0;
    let atRiskCount = 0;
    let blockedCount = 0;
    let glofAlertCount = 0;

    for (const r of roadsRes.rows) {
      if (r.status === "OPEN") openCount++;
      else if (r.status === "AT_RISK") atRiskCount++;
      else if (r.status === "BLOCKED") blockedCount++;
      else if (r.status === "GLOF_ALERT") glofAlertCount++;
    }

    const trackedVehicles = vehiclesRes.rows.length;
    const activeAlerts = alertsRes.rows.length;
    const glacialLakesMonitored = lakesRes.rows.length;
    const criticalZones = zonesRes.rows.filter(
      (z) => z.severity === "CRITICAL" || z.severity === "HIGH",
    ).length;

    res.json({
      status: "ok",
      stats: {
        active_corridors: totalCorridors,
        corridors_open: openCount,
        corridors_at_risk: atRiskCount,
        corridors_blocked: blockedCount,
        corridors_glof_alert: glofAlertCount,
        vehicles_tracked: trackedVehicles,
        active_alerts: activeAlerts,
        glacial_lakes_monitored: glacialLakesMonitored,
        critical_hazard_zones: criticalZones,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

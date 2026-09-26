import express from "express";
import { randomUUID } from "node:crypto";
import { query } from "../db.js";
import { broadcastEvent } from "../realtime.js";
import { requireDispatcher } from "../auth.js";
const router = express.Router();
router.get("/overview", async (req, res, next) => {
  try {
    const [shipments, facilities, inventory, bridges, districts, incidents] =
      await Promise.all([
        query(
          `SELECT s.*,v.plate_number,v.current_lat,v.current_lng,v.updated_at AS gps_updated_at,v.corridor_id,c.status AS road_status,f.name AS facility_name FROM shipment s LEFT JOIN vehicle v ON v.id=s.vehicle_id LEFT JOIN corridor c ON c.id=v.corridor_id LEFT JOIN facility f ON f.id=s.facility_id ORDER BY s.deadline NULLS LAST`,
        ),
        query("SELECT * FROM facility ORDER BY name"),
        query(
          "SELECT i.*,f.name AS facility_name,ROUND(i.quantity/i.daily_usage,1) AS days_remaining FROM inventory i JOIN facility f ON f.id=i.facility_id ORDER BY i.quantity/i.daily_usage",
        ),
        query("SELECT * FROM bridge ORDER BY name"),
        query(
          `SELECT d.id,d.name,s.name AS state,ST_AsGeoJSON(d.geometry)::json AS geometry,COALESCE(json_agg(json_build_object('corridor_id',c.id,'status',c.status,'hub',dc.hub,'updated_at',c.updated_at)) FILTER(WHERE c.id IS NOT NULL),'[]') AS connections FROM district d LEFT JOIN state s ON s.id=d.state_id LEFT JOIN district_connection dc ON dc.district_id=d.id LEFT JOIN corridor c ON c.id=dc.corridor_id GROUP BY d.id,s.name ORDER BY d.name`,
        ),
        query("SELECT * FROM incident ORDER BY created_at DESC LIMIT 100"),
      ]);
    const closedBridges = new Set(
      bridges.rows
        .filter((b) => b.status === "CLOSED")
        .map((b) => b.corridor_id),
    );
    res.json({
      status: "ok",
      shipments: shipments.rows.filter(
        (s) => req.actor !== "driver" || s.vehicle_id === req.user?.vehicle_id,
      ),
      facilities: facilities.rows,
      inventory: req.actor === "driver" ? [] : inventory.rows,
      bridges: bridges.rows,
      districts: districts.rows.map((d) => {
        d.connections = d.connections.map((c) =>
          closedBridges.has(c.corridor_id) ? { ...c, status: "BLOCKED" } : c,
        );
        const known = d.connections.filter(
          (c) => Date.now() - new Date(c.updated_at).getTime() < 24 * 3600000,
        );
        const passable = known.filter(
          (c) => !["BLOCKED", "GLOF_ALERT"].includes(c.status),
        );
        return {
          ...d,
          accessibility: !known.length
            ? "UNKNOWN"
            : !passable.length
              ? "ISOLATED"
              : passable.length < d.connections.length
                ? "PARTIAL"
                : "ACCESSIBLE",
          coverage:
            "Mapped supply links only; not a complete district road survey",
        };
      }),
      incidents: req.actor === "driver" ? [] : incidents.rows,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/shipments", requireDispatcher, async (req, res, next) => {
  try {
    const b = req.body;
    if (
      !b.origin ||
      !b.destination ||
      !b.cargo ||
      !b.vehicle_id ||
      !Number.isFinite(Number(b.quantity)) ||
      Number(b.quantity) <= 0 ||
      !["NORMAL", "HIGH", "URGENT"].includes(b.priority || "NORMAL") ||
      (b.deadline && !Number.isFinite(Date.parse(b.deadline)))
    )
      return res
        .status(400)
        .json({
          message:
            "Vehicle, locations, cargo, valid deadline and positive quantity are required",
        });
    const r = await query(
      `INSERT INTO shipment(id,vehicle_id,facility_id,origin,destination,cargo,quantity,unit,priority,deadline) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        randomUUID(),
        b.vehicle_id,
        b.facility_id || null,
        b.origin,
        b.destination,
        b.cargo,
        Number(b.quantity),
        b.unit || "boxes",
        b.priority || "NORMAL",
        b.deadline || null,
      ],
    );
    broadcastEvent("SHIPMENT_UPDATED", r.rows[0]);
    res.status(201).json({ status: "ok", shipment: r.rows[0] });
  } catch (e) {
    next(e);
  }
});
router.patch("/shipments/:id/status", async (req, res, next) => {
  try {
    const { status, delivery_note } = req.body;
    const allowed = {
      PLANNED: ["DISPATCHED"],
      DISPATCHED: ["IN_TRANSIT", "DELAYED"],
      IN_TRANSIT: ["DELAYED", "DELIVERED"],
      DELAYED: ["IN_TRANSIT", "DELIVERED"],
    };
    const existing = await query("SELECT * FROM shipment WHERE id=$1", [
      req.params.id,
    ]);
    if (!existing.rows[0])
      return res.status(404).json({ message: "Delivery not found" });
    if (
      req.actor === "driver" &&
      (existing.rows[0].vehicle_id !== req.user?.vehicle_id ||
        status === "DISPATCHED")
    )
      return res
        .status(403)
        .json({
          message: "Only your dispatcher can release or reassign deliveries",
        });
    if (!allowed[existing.rows[0].status]?.includes(status))
      return res
        .status(409)
        .json({ message: "This delivery status transition is not allowed" });
    if (status === "DELIVERED" && !String(delivery_note || "").trim())
      return res
        .status(400)
        .json({ message: "Add the receiver name or delivery reference" });
    const r = await query(
      `UPDATE shipment SET status=$1,delivery_note=$2,delivered_at=CASE WHEN $1='DELIVERED' THEN NOW() ELSE delivered_at END,updated_at=NOW() WHERE id=$3 AND status=$4 RETURNING *`,
      [status, delivery_note || null, req.params.id, existing.rows[0].status],
    );
    if (!r.rows.length)
      return res
        .status(409)
        .json({ message: "Delivery changed. Refresh and try again." });
    await query(
      "INSERT INTO audit_event(actor,action,target) VALUES($1,$2,$3)",
      [req.actor || "demo", `SHIPMENT_${status}`, req.params.id],
    );
    broadcastEvent("SHIPMENT_UPDATED", r.rows[0]);
    res.json({ status: "ok", shipment: r.rows[0] });
  } catch (e) {
    next(e);
  }
});
router.patch("/inventory", requireDispatcher, async (req, res, next) => {
  try {
    const b = req.body;
    if (
      !b.facility_id ||
      !b.commodity ||
      !Number.isFinite(Number(b.quantity)) ||
      Number(b.quantity) < 0 ||
      !Number.isFinite(Number(b.daily_usage)) ||
      Number(b.daily_usage) <= 0
    )
      return res
        .status(400)
        .json({ message: "Enter valid stock and daily usage" });
    await query(
      `INSERT INTO inventory(facility_id,commodity,quantity,daily_usage,unit) VALUES($1,$2,$3,$4,$5) ON CONFLICT(facility_id,commodity) DO UPDATE SET quantity=EXCLUDED.quantity,daily_usage=EXCLUDED.daily_usage,unit=EXCLUDED.unit,updated_at=NOW()`,
      [
        b.facility_id,
        b.commodity,
        b.quantity,
        b.daily_usage,
        b.unit || "units",
      ],
    );
    res.json({ status: "ok" });
  } catch (e) {
    next(e);
  }
});
router.patch("/incidents/:id", requireDispatcher, async (req, res, next) => {
  try {
    const { workflow_status, assigned_to } = req.body;
    if (
      !["SUBMITTED", "VERIFIED", "ASSIGNED", "RESOLVED", "REJECTED"].includes(
        workflow_status,
      )
    )
      return res.status(400).json({ message: "Invalid report status" });
    const r = await query(
      "UPDATE incident SET workflow_status=$1,assigned_to=$2 WHERE id=$3 RETURNING *",
      [workflow_status, assigned_to || null, req.params.id],
    );
    if (!r.rows.length)
      return res.status(404).json({ message: "Report not found" });
    broadcastEvent("INCIDENT_REVIEWED", r.rows[0]);
    res.json({ status: "ok" });
  } catch (e) {
    next(e);
  }
});
router.patch("/roads/:id", requireDispatcher, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["OPEN", "AT_RISK", "BLOCKED", "GLOF_ALERT"].includes(status))
      return res.status(400).json({ message: "Invalid road status" });
    const r = await query(
      "UPDATE corridor SET status=$1,status_source='VERIFIED_OFFICIAL',updated_at=NOW() WHERE id=$2 RETURNING *",
      [status, req.params.id],
    );
    if (!r.rows.length)
      return res.status(404).json({ message: "Road not found" });
    await query(
      "INSERT INTO audit_event(actor,action,target) VALUES($1,$2,$3)",
      [req.actor || "demo", `ROAD_${status}`, req.params.id],
    );
    broadcastEvent("ROAD_STATUS_CHANGED", {
      corridor_id: req.params.id,
      status,
    });
    res.json({ status: "ok" });
  } catch (e) {
    next(e);
  }
});
router.get("/risk-zones", async (req, res, next) => {
  try {
    res.json({
      zones: (
        await query(
          "SELECT * FROM risk_zone WHERE active_from<=NOW() AND (active_until IS NULL OR active_until>NOW())",
        )
      ).rows,
    });
  } catch (e) {
    next(e);
  }
});
export default router;

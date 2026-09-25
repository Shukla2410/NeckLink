import { query } from "../db.js";
import { planRoute } from "./routePlanner.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";
import { randomUUID } from "node:crypto";
let running = false;
export async function monitorShipments() {
  if (running) return;
  running = true;
  try {
    const shipments = (
      await query(
        "SELECT s.*,v.corridor_id FROM shipment s LEFT JOIN vehicle v ON v.id=s.vehicle_id WHERE s.status IN ('DISPATCHED','IN_TRANSIT','DELAYED')",
      )
    ).rows;
    for (const shipment of shipments) {
      let reason = null;
      try {
        const route = await planRoute(shipment.origin, shipment.destination);
        const expected = new Date(
          Date.now() + route.optimal_route.eta_hours * 3600000,
        );
        // This is a full remaining-plan estimate, not GPS map-matched turn-by-turn ETA.
        await query("UPDATE shipment SET expected_arrival=$1 WHERE id=$2", [
          expected,
          shipment.id,
        ]);
        if (shipment.deadline && expected > new Date(shipment.deadline))
          reason = "Estimated arrival is after the delivery deadline";
      } catch (e) {
        if (e.status === 422)
          reason = "No accessible route on the mapped network";
        else continue;
      }
      if (!reason) continue;
      const existing = await query(
        "SELECT id FROM alert WHERE type='DELAYED_DELIVERY' AND message LIKE $1 AND created_at>NOW()-INTERVAL '6 hours'",
        [`%[${shipment.id}]%`],
      );
      if (existing.rows.length) continue;
      const message = `Delivery [${shipment.id}] carrying ${shipment.cargo} to ${shipment.destination}: ${reason}. Dispatcher review required.`;
      const id = randomUUID(),
        translations = await translateAlert("DELAYED_DELIVERY", message);
      await query(
        "INSERT INTO alert(id,type,severity,corridor_id,title,message,translations,status) VALUES($1,'DELAYED_DELIVERY','WARNING',$2,'Delivery needs attention',$3,$4,'CREATED')",
        [id, shipment.corridor_id, message, JSON.stringify(translations)],
      );
      broadcastEvent("ALERT_CREATED", {
        id,
        type: "DELAYED_DELIVERY",
        title: "Delivery needs attention",
        message,
        translations,
        severity: "WARNING",
        corridor_id: shipment.corridor_id,
        created_at: new Date().toISOString(),
      });
    }
  } finally {
    running = false;
  }
}

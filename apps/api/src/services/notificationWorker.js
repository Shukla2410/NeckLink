import { query } from "../db.js";
import { sendSmsAlert, getSmsDeliveryStatus } from "./twilioService.js";
import webpush from "web-push";
export const pushReady = () =>
  Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
let running = false;
export async function dispatchPendingAlerts() {
  if (running || process.env.DISABLE_EXTERNAL_DELIVERY === "true") return;
  const sms = process.env.ENABLE_SMS_DELIVERY === "true";
  const push = pushReady();
  if (!sms && !push) return;
  running = true;
  try {
    if (sms)
      await query(`INSERT INTO notification_delivery(alert_id,subscription_id,channel)
      SELECT a.id,s.id,'SMS' FROM alert a JOIN notification_subscription s ON s.enabled AND s.phone IS NOT NULL AND (s.corridor_id IS NULL OR s.corridor_id=a.corridor_id)
      WHERE a.created_at>NOW()-INTERVAL '1 hour' AND a.acknowledged_at IS NULL AND a.expires_at>NOW() AND a.severity IN ('CRITICAL','EMERGENCY','WARNING') ON CONFLICT DO NOTHING`);
    if (push) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      await query(
        `INSERT INTO notification_delivery(alert_id,subscription_id,channel) SELECT a.id,s.id,'PUSH' FROM alert a JOIN notification_subscription s ON s.enabled AND s.push_subscription IS NOT NULL AND (s.corridor_id IS NULL OR s.corridor_id=a.corridor_id) WHERE a.created_at>NOW()-INTERVAL '1 hour' AND a.acknowledged_at IS NULL AND a.expires_at>NOW() ON CONFLICT DO NOTHING`,
      );
    }
    const pending =
      await query(`WITH picked AS (SELECT id FROM notification_delivery WHERE status IN ('QUEUED','RETRY') AND next_attempt<=NOW() AND attempts<3 ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10)
      UPDATE notification_delivery SET status='SENDING',attempts=attempts+1,updated_at=NOW() WHERE id IN(SELECT id FROM picked) RETURNING *`);
    for (const delivery of pending.rows) {
      const details = await query(
        "SELECT a.*,s.phone,s.language,s.push_subscription FROM alert a JOIN notification_subscription s ON s.id=$2 WHERE a.id=$1",
        [delivery.alert_id, delivery.subscription_id],
      );
      const row = details.rows[0];
      let result;
      if (delivery.channel === "PUSH") {
        try {
          await webpush.sendNotification(
            row.push_subscription,
            JSON.stringify({
              title: row.title,
              body: row.translations?.[row.language] || row.message,
              id: row.id,
            }),
            { TTL: 3600, timeout: 10000 },
          );
          result = { success: true };
        } catch (e) {
          result = { success: false, message: e.message };
          if (e.statusCode === 410 || e.statusCode === 404)
            await query(
              "UPDATE notification_subscription SET enabled=FALSE WHERE id=$1",
              [delivery.subscription_id],
            );
        }
      } else
        result = await sendSmsAlert(
          row.phone,
          row.translations?.[row.language] || row.message,
        );
      await query(
        "UPDATE notification_delivery SET status=$1,provider_id=$2,error=$3,next_attempt=NOW()+INTERVAL '2 minutes',updated_at=NOW() WHERE id=$4",
        [
          result.success ? "SENT" : delivery.attempts >= 3 ? "FAILED" : "RETRY",
          result.sid || null,
          result.success ? null : result.message,
          delivery.id,
        ],
      );
    }
    // Ambiguous submissions are reviewed, never blindly resent after process failure.
    await query(
      "UPDATE notification_delivery SET status='REVIEW',error='Delivery outcome unknown; check provider before retrying' WHERE status='SENDING' AND updated_at<NOW()-INTERVAL '5 minutes'",
    );
    if (sms) {
      const sent = await query(
        "SELECT id,provider_id FROM notification_delivery WHERE channel='SMS' AND status='SENT' AND provider_id IS NOT NULL AND updated_at>NOW()-INTERVAL '24 hours' LIMIT 20",
      );
      for (const delivery of sent.rows) {
        try {
          const status = await getSmsDeliveryStatus(delivery.provider_id);
          if (["delivered", "undelivered", "failed"].includes(status))
            await query(
              "UPDATE notification_delivery SET status=$1,updated_at=NOW() WHERE id=$2",
              [status === "delivered" ? "DELIVERED" : "FAILED", delivery.id],
            );
        } catch {
          /* keep last known provider state */
        }
      }
    }
  } finally {
    running = false;
  }
}

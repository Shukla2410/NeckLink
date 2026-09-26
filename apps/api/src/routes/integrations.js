import express from "express";
import { randomUUID } from "node:crypto";
import { query } from "../db.js";
import { bhashiniReady } from "../services/bhashiniService.js";
import { requireDispatcher, demoMode } from "../auth.js";
import { refreshWeatherRisk } from "../services/weatherRisk.js";
import { pushReady } from "../services/notificationWorker.js";
const router = express.Router();
router.get("/status", (req, res) =>
  res.json({
    demo: demoMode(),
    bhashini: bhashiniReady(),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.ENABLE_SMS_DELIVERY === "true" &&
      process.env.DISABLE_EXTERNAL_DELIVERY !== "true",
    ),
    weather: "Open-Meteo forecast + optional OpenWeather current conditions",
    model: "Synthetic Random Forest / labelled heuristic fallback",
    map: "Simplified demonstration corridors",
    push: pushReady() && process.env.DISABLE_EXTERNAL_DELIVERY !== "true",
    vapid_public_key: process.env.VAPID_PUBLIC_KEY || null,
  }),
);
router.post("/push-subscription", async (req, res, next) => {
  try {
    const { subscription, language = "en", corridor_id = null } = req.body;
    const endpoint = new URL(subscription?.endpoint);
    const allowed = [
      "fcm.googleapis.com",
      "updates.push.services.mozilla.com",
      "web.push.apple.com",
    ];
    if (
      endpoint.protocol !== "https:" ||
      !allowed.some(
        (host) =>
          endpoint.hostname === host || endpoint.hostname.endsWith("." + host),
      ) ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    )
      return res.status(400).json({ message: "Unsupported push subscription" });
    const existing = await query(
      "SELECT id FROM notification_subscription WHERE push_subscription->>'endpoint'=$1",
      [subscription.endpoint],
    );
    if (existing.rows.length)
      await query(
        "UPDATE notification_subscription SET language=$1,corridor_id=$2,enabled=TRUE WHERE id=$3",
        [language, corridor_id, existing.rows[0].id],
      );
    else
      await query(
        "INSERT INTO notification_subscription(id,name,language,corridor_id,push_subscription) VALUES($1,'Browser subscriber',$2,$3,$4)",
        [randomUUID(), language, corridor_id, JSON.stringify(subscription)],
      );
    res.status(201).json({ status: "ok" });
  } catch (e) {
    e.status = 400;
    next(e);
  }
});
router.post("/weather/refresh", requireDispatcher, async (req, res, next) => {
  try {
    res.json({ status: "ok", results: await refreshWeatherRisk() });
  } catch (e) {
    next(e);
  }
});
router.get("/subscriptions", requireDispatcher, async (req, res, next) => {
  try {
    res.json({
      subscriptions: (
        await query(
          "SELECT id,name,phone,language,corridor_id,enabled FROM notification_subscription ORDER BY name",
        )
      ).rows,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/subscriptions", requireDispatcher, async (req, res, next) => {
  try {
    const { name, phone, language = "en", corridor_id = null } = req.body;
    if (
      !name ||
      !/^\+[1-9]\d{7,14}$/.test(phone || "") ||
      !["en", "hi", "as", "kha", "lus", "mni", "brx"].includes(language)
    )
      return res
        .status(400)
        .json({
          message:
            "Enter a name, language and phone number including country code",
        });
    await query(
      "INSERT INTO notification_subscription(id,name,phone,language,corridor_id) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), name, phone, language, corridor_id || null],
    );
    res.status(201).json({ status: "ok" });
  } catch (e) {
    next(e);
  }
});
router.get("/deliveries", requireDispatcher, async (req, res, next) => {
  try {
    res.json({
      deliveries: (
        await query(
          "SELECT d.*,s.name FROM notification_delivery d JOIN notification_subscription s ON s.id=d.subscription_id ORDER BY d.id DESC LIMIT 100",
        )
      ).rows,
    });
  } catch (e) {
    next(e);
  }
});
router.patch("/alerts/:id/acknowledge", async (req, res, next) => {
  try {
    const r = await query(
      "UPDATE alert SET acknowledged_at=NOW(),status='ACKNOWLEDGED' WHERE id=$1 RETURNING id",
      [req.params.id],
    );
    res
      .status(r.rows.length ? 200 : 404)
      .json({ status: r.rows.length ? "ok" : "not_found" });
  } catch (e) {
    next(e);
  }
});
export default router;

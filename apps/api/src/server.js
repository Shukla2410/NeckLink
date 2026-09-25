import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { pool, query } from "./db.js";
import { setupRealtime } from "./realtime.js";

import roadsRouter from "./routes/roads.js";
import incidentsRouter from "./routes/incidents.js";
import vehiclesRouter from "./routes/vehicles.js";
import glacialLakesRouter from "./routes/glacialLakes.js";
import seismicRouter from "./routes/seismic.js";
import routingRouter from "./routes/routing.js";
import alertsRouter from "./routes/alerts.js";
import statsRouter from "./routes/stats.js";
import weatherRouter from "./routes/weather.js";
import operationsRouter from "./routes/operations.js";
import languageRouter from "./routes/language.js";
import integrationsRouter from "./routes/integrations.js";
import dataImportRouter from "./routes/dataImport.js";
import { installAuth, demoMode } from "./auth.js";
import { dispatchPendingAlerts } from "./services/notificationWorker.js";
import { refreshWeatherRisk } from "./services/weatherRisk.js";
import { monitorShipments } from "./services/shipmentMonitor.js";
import { fileURLToPath } from "node:url";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(
  cors({
    origin: process.env.WEB_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
const rateWindows = new Map();
app.use("/api", (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return next();
  if (
    req.headers.origin &&
    ![
      process.env.WEB_ORIGIN || "http://localhost:5173",
      `http://${req.headers.host}`,
      `https://${req.headers.host}`,
    ].includes(req.headers.origin)
  )
    return res.status(403).json({ message: "Untrusted request origin" });
  const key = req.ip + req.path;
  const now = Date.now();
  let entry = rateWindows.get(key);
  if (!entry || entry.until < now) {
    entry = { count: 0, until: now + 60000 };
    rateWindows.set(key, entry);
  }
  if (++entry.count > (req.path.includes("login") ? 10 : 120))
    return res
      .status(429)
      .json({ message: "Too many requests. Try again in a minute." });
  if (rateWindows.size > 10000)
    for (const [k, v] of rateWindows) if (v.until < now) rateWindows.delete(k);
  next();
});
installAuth(app);

// Setup WebSocket and SSE realtime layer
setupRealtime(server, app);

// Core health endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "NECKLINK Unified Intelligence API",
    version: "1.0.0",
    time: new Date().toISOString(),
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await query("SELECT current_database(), PostGIS_Version();");
    res.json({
      status: "ok",
      database: result.rows[0].current_database,
      postgis: result.rows[0].postgis_version,
    });
  } catch (error) {
    console.error("DB Test error:", error);
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      detail: error.message,
    });
  }
});

// Mounted domain routes
app.use("/api/roads", roadsRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/glacial-lakes", glacialLakesRouter);
app.use("/api/seismic-events", seismicRouter);
app.use("/api/routes", routingRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/language", languageRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/data-import", dataImportRouter);
app.get("/api/ready", async (req, res) => {
  try {
    await query("SELECT 1");
    const ml = await fetch(
      `${process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"}/health`,
      { signal: AbortSignal.timeout(3000) },
    );
    res.status(ml.ok ? 200 : 503).json({ database: true, ml: ml.ok });
  } catch {
    res.status(503).json({ message: "A required service is unavailable" });
  }
});
app.use(
  express.static(fileURLToPath(new URL("../../web/dist/", import.meta.url))),
);
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ message: "Endpoint not found" });
  res.sendFile(
    fileURLToPath(new URL("../../web/dist/index.html", import.meta.url)),
  );
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

export function startServer(port = PORT) {
  if (!demoMode() && !process.env.ADMIN_PASSWORD)
    throw new Error("ADMIN_PASSWORD is required in production");
  const notifications = setInterval(
    () =>
      dispatchPendingAlerts().catch((e) =>
        console.error("Notification worker:", e.message),
      ),
    30000,
  );
  notifications.unref();
  const shipments = setInterval(
    () =>
      monitorShipments().catch((e) =>
        console.error("Shipment monitor:", e.message),
      ),
    60000,
  );
  shipments.unref();
  if (process.env.ENABLE_WEATHER_INGESTION === "true") {
    const weather = setInterval(
      () => refreshWeatherRisk().catch((e) => console.error(e.message)),
      15 * 60000,
    );
    weather.unref();
  }
  return server.listen(port, process.env.HOST || "127.0.0.1", () => {
    console.log(`NECKLINK Dispatch API running on http://localhost:${port}`);
    console.log(
      `WebSocket telemetry stream active on ws://localhost:${port}/ws`,
    );
    console.log(
      `SSE realtime stream active on http://localhost:${port}/api/events`,
    );
  });
}

if (process.argv[1]?.endsWith("server.js")) {
  startServer();
}

export { app, server };
export default app;

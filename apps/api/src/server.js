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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Setup WebSocket and SSE realtime layer
setupRealtime(server, app);

// Core health endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "NECKLINK Unified Intelligence API",
    version: "1.0.0",
    time: new Date().toISOString()
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
      detail: error.message
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    message: err.message || "Internal server error"
  });
});

export function startServer(port = PORT) {
  return server.listen(port, () => {
    console.log(`NECKLINK Dispatch API running on http://localhost:${port}`);
    console.log(`WebSocket telemetry stream active on ws://localhost:${port}/ws`);
    console.log(`SSE realtime stream active on http://localhost:${port}/api/events`);
  });
}

if (process.argv[1]?.endsWith("server.js")) {
  startServer();
}

export { app, server };
export default app;
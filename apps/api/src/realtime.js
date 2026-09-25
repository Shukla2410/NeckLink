import { WebSocketServer } from "ws";
import { demoMode } from "./auth.js";
import { lookupSession } from "./services/accounts.js";

let wss = null;
const sseClients = new Set();

export function setupRealtime(server, app) {
  // 1. WebSocket Server setup
  wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", async (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }
    try {
      const user = await lookupSession(req);
      if (!demoMode() && !user) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.user = user;
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    ws.send(
      JSON.stringify({
        type: "SYSTEM_CONNECTED",
        timestamp: new Date().toISOString(),
        message: "Connected to NECKLINK Real-time Dispatch Telemetry",
      }),
    );

    ws.on("error", (err) => console.error("WS client error:", err.message));
  });

  // 2. Server-Sent Events (SSE) Endpoint
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders?.();

    // Initial heartbeat
    res.write(
      `data: ${JSON.stringify({ type: "INIT", message: "SSE stream active", timestamp: new Date().toISOString() })}\n\n`,
    );

    sseClients.add(res);
    res.telemetryUser = req.user;

    req.on("close", () => {
      sseClients.delete(res);
    });
  });

  // Keep-alive heartbeat every 25s
  const heartbeatTimer = setInterval(() => {
    broadcastEvent("HEARTBEAT", { time: new Date().toISOString() });
  }, 25000);
  heartbeatTimer.unref();
}

export function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({
    type: eventType,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  // Broadcast to WebSocket clients
  if (wss) {
    wss.clients.forEach((client) => {
      if (
        client.readyState === 1 &&
        canReceive(client.user, eventType, payload)
      ) {
        // OPEN
        client.send(data);
      }
    });
  }

  // Broadcast to SSE clients
  sseClients.forEach((res) => {
    if (!canReceive(res.telemetryUser, eventType, payload)) return;
    try {
      res.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  });

  // Mirror to Firebase Realtime Database
  if (eventType !== "HEARTBEAT") {
    import("./services/firebaseService.js")
      .then((m) => m.syncEventToFirebase(eventType, payload))
      .catch(() => {});
  }
}

function canReceive(user, type, payload) {
  if (user?.role !== "driver") return true;
  if (type.startsWith("VEHICLE_") || type === "SHIPMENT_UPDATED")
    return (payload.vehicle_id || payload.id) === user.vehicle_id;
  if (type.startsWith("INCIDENT_")) return false;
  return true;
}

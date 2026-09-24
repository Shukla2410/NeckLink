import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  Send, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Camera, 
  RefreshCw 
} from "lucide-react";
import { queueOfflineIncident, getQueuedIncidents, syncQueuedIncidents } from "../utils/offlineQueue.js";

export default function FieldReportingPwa({
  corridors = [],
  apiBase = "http://localhost:5000",
  onSyncComplete
}) {
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [queuedItems, setQueuedItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    type: "LANDSLIDE",
    corridor_id: "CORR-NH29",
    lat: "25.75",
    lng: "93.82",
    severity: "HIGH",
    description: "Slope mud displacement across 60m of roadway. Vehicle passage blocked."
  });

  const loadQueue = async () => {
    try {
      const items = await getQueuedIncidents();
      setQueuedItems(items);
    } catch (e) {
      console.error("Queue load error:", e);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleToggleOffline = (val) => {
    setIsSimulatedOffline(val);
    if (!val) {
      // Reconnected online -> trigger auto-sync
      handleSyncNow();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const incidentData = {
      id: `INC-PWA-${Date.now()}`,
      ...formData,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      source: "FIELD_OFFICER_OFFLINE_SYNC"
    };

    if (isSimulatedOffline) {
      // Offline mode: Write to IndexedDB first
      await queueOfflineIncident(incidentData);
      await loadQueue();
      setSyncSuccessMsg("Report saved to local IndexedDB queue (Offline)");
      setTimeout(() => setSyncSuccessMsg(""), 4000);
    } else {
      // Online mode: Send directly to central API
      try {
        const res = await fetch(`${apiBase}/api/incidents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incidentData)
        });
        if (res.ok) {
          setSyncSuccessMsg("Report uploaded directly to Central Command");
          setTimeout(() => setSyncSuccessMsg(""), 4000);
          onSyncComplete?.();
        }
      } catch (err) {
        // Fallback to queue if network failed
        await queueOfflineIncident(incidentData);
        await loadQueue();
      }
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await syncQueuedIncidents(apiBase);
      await loadQueue();
      if (res.synced > 0) {
        setSyncSuccessMsg(`Synchronized ${res.synced} offline incident(s) to central command!`);
        setTimeout(() => setSyncSuccessMsg(""), 5000);
        onSyncComplete?.();
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{
      maxWidth: "680px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      height: "100%",
      overflowY: "auto",
      paddingRight: "8px"
    }}>
      {/* Offline/Online Network Simulator Bar */}
      <div className="necklink-card" style={{
        background: isSimulatedOffline ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
        border: isSimulatedOffline ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isSimulatedOffline ? (
            <WifiOff size={22} color="#EF4444" />
          ) : (
            <Wifi size={22} color="#10B981" />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#FFFFFF" }}>
              {isSimulatedOffline ? "OFFLINE MODE ACTIVE (Zero Connectivity Simulation)" : "ONLINE MODE (Connected to Central Command)"}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
              {isSimulatedOffline ? "Reports will buffer into local browser IndexedDB" : "Live synchronization active via Express / Postgres"}
            </div>
          </div>
        </div>

        <button
          onClick={() => handleToggleOffline(!isSimulatedOffline)}
          className={`pill-btn ${isSimulatedOffline ? "pill-btn-primary" : "pill-btn-danger"}`}
          style={{ padding: "8px 18px", fontSize: "0.8rem" }}
        >
          {isSimulatedOffline ? "Restore Connectivity" : "Simulate Offline"}
        </button>
      </div>

      {/* Queued Items Indicator */}
      {queuedItems.length > 0 && (
        <div style={{
          background: "var(--bg-surface-2)",
          border: "1px solid var(--primary-accent)",
          borderRadius: "16px",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Database size={18} color="var(--primary-accent)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFFFFF" }}>
              {queuedItems.length} report(s) waiting in IndexedDB queue
            </span>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={syncing || isSimulatedOffline}
            className="pill-btn pill-btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.78rem" }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Offline Queue"}</span>
          </button>
        </div>
      )}

      {syncSuccessMsg && (
        <div style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid #10B981",
          color: "#10B981",
          borderRadius: "14px",
          padding: "12px 16px",
          fontSize: "0.85rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <CheckCircle2 size={16} />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Incident Form Card */}
      <form onSubmit={handleSubmit} className="necklink-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(232, 121, 249, 0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <AlertTriangle size={18} color="var(--primary-accent)" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF" }}>
              Field Incident Emergency Dispatch Form
            </h3>
            <p style={{ fontSize: "0.76rem", color: "var(--text-sub)" }}>
              Optimized for mobile responders in remote hilly terrain with intermittent signal
            </p>
          </div>
        </div>

        {/* Incident Type & Corridor */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Hazard Category
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#FFFFFF",
                fontSize: "0.85rem",
                outline: "none"
              }}
            >
              <option value="LANDSLIDE">Landslide / Debris Slope</option>
              <option value="FLASH_FLOOD">Flash Flood Inundation</option>
              <option value="ROAD_EROSION">Embankment / Road Erosion</option>
              <option value="BRIDGE_DAMAGE">Bridge / Culvert Structural Damage</option>
              <option value="GLOF_SURGE">GLOF Outburst Surge Wave</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Affected Strategic Corridor
            </label>
            <select
              value={formData.corridor_id}
              onChange={(e) => setFormData({ ...formData, corridor_id: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#FFFFFF",
                fontSize: "0.85rem",
                outline: "none"
              }}
            >
              {corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* GPS Coordinates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Latitude (°N)
            </label>
            <input
              type="text"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#FFFFFF",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Longitude (°E)
            </label>
            <input
              type="text"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#FFFFFF",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Severity */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            Severity Level
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            {["MODERATE", "HIGH", "CRITICAL"].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setFormData({ ...formData, severity: s })}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "12px",
                  border: formData.severity === s ? "1px solid var(--primary-accent)" : "1px solid var(--border-subtle)",
                  background: formData.severity === s ? "rgba(232, 121, 249, 0.2)" : "var(--bg-surface-2)",
                  color: formData.severity === s ? "var(--primary-accent)" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            Field Observation Notes
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              outline: "none",
              resize: "none"
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="pill-btn pill-btn-primary"
          style={{ width: "100%", padding: "14px 20px", fontSize: "0.9rem" }}
        >
          <Send size={16} />
          <span>{isSimulatedOffline ? "Queue Report Offline (IndexedDB)" : "Submit Live Incident Report"}</span>
        </button>
      </form>
    </div>
  );
}

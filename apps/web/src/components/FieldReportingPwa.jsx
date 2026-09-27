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
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Check,
  Trash2,
  Radio,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import {
  queueOfflineIncident,
  getQueuedIncidents,
  removeQueuedIncident,
  syncQueuedIncidents,
} from "../utils/offlineQueue.js";
import { API_BASE } from "../utils/api.js";

export default function FieldReportingPwa({
  corridors = [],
  apiBase = API_BASE,
  onSyncComplete,
}) {
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [queuedItems, setQueuedItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null); // { type: 'success' | 'info' | 'warning', message: string }
  const [activePreset, setActivePreset] = useState(null);

  const [formData, setFormData] = useState({
    type: "LANDSLIDE",
    corridor_id: "CORR-NH29",
    lat: "25.75",
    lng: "93.82",
    severity: "CRITICAL",
    description: "Slope failure & mud displacement across 60m of roadway. Vehicle passage blocked at Paglapahar.",
  });

  const DEMO_PRESETS = [
    {
      id: "preset_landslide",
      title: "Landslide Blockage",
      subtitle: "NH-29 Dimapur → Kohima",
      type: "LANDSLIDE",
      corridor_id: "CORR-NH29",
      lat: "25.75",
      lng: "93.82",
      severity: "CRITICAL",
      description: "Severe mudslide & rock displacement across both lanes near Paglapahar. All vehicle transit halted.",
    },
    {
      id: "preset_flood",
      title: "Flash Flood Overflow",
      subtitle: "NH-10 Siliguri → Gangtok",
      type: "FLASH_FLOOD",
      corridor_id: "CORR-NH10",
      lat: "27.05",
      lng: "88.48",
      severity: "HIGH",
      description: "Teesta river surge water flowing 0.8m over low-lying culvert section. Heavy vehicle transit high hazard.",
    },
    {
      id: "preset_rockfall",
      title: "Rockfall Hazard",
      subtitle: "NH-06 Shillong → Silchar",
      type: "ROAD_BLOCK",
      corridor_id: "CORR-NH06A",
      lat: "25.58",
      lng: "91.89",
      severity: "MODERATE",
      description: "Boulder debris covering inbound lane. Single-lane slow convoy movement operational.",
    },
  ];

  const loadQueue = async () => {
    try {
      const items = await getQueuedIncidents();
      setQueuedItems(items || []);
    } catch (e) {
      console.error("Queue load error:", e);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleToggleOffline = async (newOfflineState) => {
    setIsSimulatedOffline(newOfflineState);
    if (!newOfflineState) {
      // Reconnected online -> trigger auto-sync
      setStatusBanner({
        type: "info",
        message: "Connectivity restored! Auto-flushing queued offline reports to Central Command...",
      });
      await handleSyncNow();
    } else {
      setStatusBanner({
        type: "warning",
        message: "Simulated Offline Mode Active. Cellular network disconnected. Reports will buffer to device IndexedDB.",
      });
      setTimeout(() => setStatusBanner(null), 6000);
    }
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setFormData({
      type: preset.type,
      corridor_id: preset.corridor_id,
      lat: preset.lat,
      lng: preset.lng,
      severity: preset.severity,
      description: preset.description,
    });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
          }));
          setStatusBanner({
            type: "info",
            message: `Acquired device GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          });
          setTimeout(() => setStatusBanner(null), 3000);
        },
        () => {
          setStatusBanner({
            type: "warning",
            message: "GPS unavailable or permission denied. Using selected corridor coordinates.",
          });
          setTimeout(() => setStatusBanner(null), 3000);
        },
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const incidentData = {
      id: `INC-PWA-${Date.now()}`,
      ...formData,
      lat: parseFloat(formData.lat) || 25.75,
      lng: parseFloat(formData.lng) || 93.82,
      observed_at: new Date().toISOString(),
      source: "FIELD_OFFICER_OFFLINE_SYNC",
    };

    if (isSimulatedOffline) {
      // Offline mode: Write to IndexedDB first
      await queueOfflineIncident(incidentData);
      await loadQueue();
      setStatusBanner({
        type: "warning",
        message: `Report #${incidentData.id.slice(-6)} securely saved to local device IndexedDB. (Queued for sync)`,
      });
      setTimeout(() => setStatusBanner(null), 6000);
    } else {
      // Online mode: Send directly to central API
      try {
        const res = await fetch(`${apiBase}/api/incidents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incidentData),
        });
        if (res.ok) {
          setStatusBanner({
            type: "success",
            message: `Report #${incidentData.id.slice(-6)} uploaded directly to Central Dispatch & Live Corridor Map!`,
          });
          setTimeout(() => setStatusBanner(null), 6000);
          onSyncComplete?.();
        } else {
          // Fallback to queue if server responded with error
          await queueOfflineIncident(incidentData);
          await loadQueue();
          setStatusBanner({
            type: "warning",
            message: "Direct upload failed. Report safely queued in local IndexedDB.",
          });
        }
      } catch (err) {
        // Fallback to queue if network error
        await queueOfflineIncident(incidentData);
        await loadQueue();
        setStatusBanner({
          type: "warning",
          message: "Network unreachable. Report safely buffered into local IndexedDB.",
        });
      }
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await syncQueuedIncidents(apiBase);
      await loadQueue();
      if (res && res.synced > 0) {
        setStatusBanner({
          type: "success",
          message: `Successfully synchronized ${res.synced} offline report(s) to Central PostgreSQL & Live Dashboard!`,
        });
        setTimeout(() => setStatusBanner(null), 6000);
        onSyncComplete?.();
      } else if (queuedItems.length === 0) {
        setStatusBanner({
          type: "info",
          message: "IndexedDB queue is clean. No pending offline reports to sync.",
        });
        setTimeout(() => setStatusBanner(null), 4000);
      }
    } catch (err) {
      console.error("Sync error:", err);
      setStatusBanner({
        type: "warning",
        message: "Failed to connect during sync. Reports remain safely in IndexedDB.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteQueued = async (id) => {
    await removeQueuedIncident(id);
    await loadQueue();
  };

  return (
    <div
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        height: "100%",
        overflowY: "auto",
        paddingRight: "6px",
        paddingBottom: "32px",
      }}
    >
      {/* 1. Network Status Simulation Bar */}
      <div
        className="necklink-card"
        style={{
          background: isSimulatedOffline
            ? "linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(35, 31, 36, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(35, 31, 36, 0.95) 100%)",
          border: isSimulatedOffline
            ? "1px solid rgba(239, 68, 68, 0.5)"
            : "1px solid rgba(16, 185, 129, 0.5)",
          boxShadow: isSimulatedOffline
            ? "0 4px 20px rgba(239, 68, 68, 0.15)"
            : "0 4px 20px rgba(16, 185, 129, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderRadius: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: isSimulatedOffline
                ? "rgba(239, 68, 68, 0.2)"
                : "rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isSimulatedOffline
                ? "1px solid rgba(239, 68, 68, 0.4)"
                : "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            {isSimulatedOffline ? (
              <WifiOff size={22} color="#EF4444" />
            ) : (
              <Wifi size={22} color="#10B981" />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#FFFFFF",
                  letterSpacing: "0.02em",
                }}
              >
                {isSimulatedOffline
                  ? "OFFLINE MODE ACTIVE"
                  : "ONLINE CONNECTED"}
              </span>
              <span
                className={`status-pill ${isSimulatedOffline ? "BLOCKED" : "OPEN"}`}
                style={{ fontSize: "0.68rem", padding: "2px 8px" }}
              >
                {isSimulatedOffline ? "Zero Cell Signal" : "Live Socket & REST"}
              </span>
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              {isSimulatedOffline
                ? "Local IndexedDB storage active · Zero packets leaving device"
                : "Synchronized with Central Postgres & Real-time Telematics"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleToggleOffline(!isSimulatedOffline)}
          className={`pill-btn ${isSimulatedOffline ? "pill-btn-primary" : "pill-btn-danger"}`}
          style={{
            padding: "10px 18px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isSimulatedOffline ? (
            <>
              <Radio size={15} />
              <span>Restore Online (Auto-Sync)</span>
            </>
          ) : (
            <>
              <WifiOff size={15} />
              <span>Simulate Offline Dead-Zone</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Interactive Status Notification Banner */}
      {statusBanner && (
        <div
          style={{
            background:
              statusBanner.type === "success"
                ? "rgba(16, 185, 129, 0.15)"
                : statusBanner.type === "warning"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(232, 121, 249, 0.15)",
            border:
              statusBanner.type === "success"
                ? "1px solid #10B981"
                : statusBanner.type === "warning"
                  ? "1px solid #F59E0B"
                  : "1px solid var(--primary-accent)",
            color:
              statusBanner.type === "success"
                ? "#10B981"
                : statusBanner.type === "warning"
                  ? "#F59E0B"
                  : "#f0abfc",
            borderRadius: "14px",
            padding: "12px 16px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          {statusBanner.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : statusBanner.type === "warning" ? (
            <AlertTriangle size={18} />
          ) : (
            <Radio size={18} />
          )}
          <span>{statusBanner.message}</span>
        </div>
      )}

      {/* 3. Demo Quick Scenario Buttons */}
      <div
        className="necklink-card"
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color="var(--primary-accent)" />
            <span
              style={{
                fontSize: "0.86rem",
                fontWeight: 700,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Demo Quick-Fill Scenarios
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-sub)" }}>
            Click to auto-populate field report
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          {DEMO_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              style={{
                background:
                  activePreset === p.id
                    ? "rgba(232, 121, 249, 0.18)"
                    : "var(--bg-surface-2)",
                border:
                  activePreset === p.id
                    ? "1px solid var(--primary-accent)"
                    : "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "10px 14px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: activePreset === p.id ? "var(--primary-accent)" : "#FFF",
                }}
              >
                {p.title}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                {p.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Incident Reporting Form Card */}
      <form
        onSubmit={handleSubmit}
        className="necklink-card"
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "rgba(232, 121, 249, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileCheck size={18} color="var(--primary-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#FFF" }}>
                Field Responder Incident Report
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-sub)" }}>
                PWA Offline Buffering · Autonomous Resynchronization
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isSimulatedOffline ? "#EF4444" : "#10B981",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: isSimulatedOffline ? "#EF4444" : "#10B981",
              }}
            >
              {isSimulatedOffline ? "Queuing Locally" : "Online Live Upload"}
            </span>
          </div>
        </div>

        {/* Corridor Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            Target Corridor / Arterial Road
          </label>
          <select
            value={formData.corridor_id}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, corridor_id: e.target.value }))
            }
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#FFF",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            {corridors.length > 0 ? (
              corridors.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.code} · {c.name || `${c.origin} → ${c.destination}`}
                </option>
              ))
            ) : (
              <>
                <option value="CORR-NH29">NH-29 Dimapur - Kohima - Imphal</option>
                <option value="CORR-NH10">NH-10 Siliguri - Gangtok (Teesta Valley)</option>
                <option value="CORR-NH27">NH-27 Siliguri - Guwahati Lifeline</option>
                <option value="CORR-NH06A">NH-06 Guwahati - Shillong Expressway</option>
              </>
            )}
          </select>
        </div>

        {/* Problem Type & Severity */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              Hazard Classification
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, type: e.target.value }))
              }
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#FFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              <option value="LANDSLIDE">Landslide / Mudflow</option>
              <option value="FLASH_FLOOD">Flash Flood / Inundation</option>
              <option value="ROAD_BLOCK">Road Blockage / Debris</option>
              <option value="ROAD_EROSION">Road Surface Subsidence</option>
              <option value="BRIDGE_DAMAGE">Bridge Structural Failure</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              Transit Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, severity: e.target.value }))
              }
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#FFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              <option value="CRITICAL">Critical (Total Transit Halt)</option>
              <option value="HIGH">High (Passage Obstructed / Severe)</option>
              <option value="MODERATE">Moderate (Pass with Caution)</option>
            </select>
          </div>
        </div>

        {/* GPS Coordinates */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              GPS Coordinates (Lat / Lng)
            </label>
            <button
              type="button"
              onClick={handleGetLocation}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-accent)",
                fontSize: "0.76rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
              }}
            >
              <MapPin size={13} />
              <span>Fetch Device GPS</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <input
              type="text"
              required
              placeholder="Latitude"
              value={formData.lat}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lat: e.target.value }))
              }
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#FFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <input
              type="text"
              required
              placeholder="Longitude"
              value={formData.lng}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lng: e.target.value }))
              }
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#FFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Description / Field Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            Field Situation & Tactical Description
          </label>
          <textarea
            required
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Detailed description of ground condition..."
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#FFF",
              fontSize: "0.85rem",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>

        {/* Dynamic Action Submit Button */}
        <button
          type="submit"
          className={`pill-btn ${isSimulatedOffline ? "pill-btn-secondary" : "pill-btn-primary"}`}
          style={{
            padding: "14px 20px",
            fontSize: "0.92rem",
            fontWeight: 700,
            marginTop: "6px",
            background: isSimulatedOffline
              ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.15) 100%)"
              : undefined,
            borderColor: isSimulatedOffline ? "#F59E0B" : undefined,
            color: isSimulatedOffline ? "#F59E0B" : undefined,
          }}
        >
          {isSimulatedOffline ? (
            <>
              <Database size={17} />
              <span>Save Report to Local IndexedDB (Offline Buffer)</span>
            </>
          ) : (
            <>
              <Send size={17} />
              <span>Submit Direct to Central Command</span>
            </>
          )}
        </button>
      </form>

      {/* 5. Live IndexedDB Queue Inspector */}
      <div
        className="necklink-card"
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(232, 121, 249, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Database size={16} color="var(--primary-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#FFF" }}>
                IndexedDB Local Device Queue
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-sub)" }}>
                {queuedItems.length} buffered report(s) awaiting server synchronization
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || queuedItems.length === 0 || isSimulatedOffline}
            className="pill-btn pill-btn-primary"
            style={{
              padding: "8px 16px",
              fontSize: "0.78rem",
              opacity:
                syncing || queuedItems.length === 0 || isSimulatedOffline ? 0.5 : 1,
              cursor:
                syncing || queuedItems.length === 0 || isSimulatedOffline
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Offline Queue"}</span>
          </button>
        </div>

        {queuedItems.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "4px",
            }}
          >
            {queuedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: "#FFFFFF",
                      }}
                    >
                      {item.type} · {item.corridor_id}
                    </span>
                    <span
                      className={`status-pill ${item.severity === "CRITICAL" ? "BLOCKED" : "AT_RISK"}`}
                      style={{ fontSize: "0.65rem", padding: "1px 6px" }}
                    >
                      {item.severity}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#F59E0B",
                        background: "rgba(245, 158, 11, 0.15)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      QUEUED_OFFLINE
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {item.description}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-sub)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "2px",
                    }}
                  >
                    <span>GPS: {item.lat}, {item.lng}</span>
                    <span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={11} />
                      {new Date(item.queued_at || item.observed_at || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  title="Remove from local queue"
                  onClick={() => handleDeleteQueued(item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-sub)",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={(e.currentTarget.style.color = "var(--text-sub)")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "var(--bg-surface-2)",
              borderRadius: "12px",
              padding: "24px 16px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <CheckCircle2 size={24} color="#10B981" />
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFFFFF" }}>
              Queue is Empty
            </div>
            <div
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                maxWidth: "380px",
              }}
            >
              Switch to Offline Mode above and submit an incident to test local IndexedDB offline storage & autonomous sync.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

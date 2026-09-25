import React, { useState } from "react";
import {
  X,
  Sparkles,
  CloudRain,
  ShieldAlert,
  Radio,
  Gauge,
  RotateCcw,
  CheckCircle2,
  FileText,
  Clock,
} from "lucide-react";

export default function SimulationControlsModal({
  isOpen,
  onClose,
  onTriggerChain1,
  onTriggerChain2,
  onTriggerChain3,
  onTriggerChain4,
  onTriggerChain5,
  onResetBaseline,
}) {
  const [activeLog, setActiveLog] = useState("");
  const [loadingChain, setLoadingChain] = useState(null);

  if (!isOpen) return null;

  const handleRun = async (num, fn, desc) => {
    setLoadingChain(num);
    setActiveLog(`Triggering Chain ${num}: ${desc}...`);
    try {
      const res = await fn();
      setActiveLog(
        `✓ Chain ${num} Executed Successfully!\n${JSON.stringify(res || "Event dispatched & state synchronized across Postgres + WebSockets", null, 2)}`,
      );
    } catch (e) {
      setActiveLog(`Error in Chain ${num}: ${e.message}`);
    } finally {
      setLoadingChain(null);
    }
  };

  const chains = [
    {
      num: 1,
      title: "Chain 1: Rain → Risk → Route → ETA → Dashboard",
      desc: "Injects rainfall surge (+120mm) on NH-10; ML risk score rises to >75%; routing engine recalculates; safer alternate route + ETA appear live.",
      icon: CloudRain,
      action: onTriggerChain1,
    },
    {
      num: 2,
      title: "Chain 2: Vehicle → Risk Zone → Geofence → Alert",
      desc: "Simulates vehicle NL-POL-09 crossing into the active Teesta hazard polygon; fires VEHICLE_ENTERED_RISK_ZONE telematics alert.",
      icon: ShieldAlert,
      action: onTriggerChain2,
    },
    {
      num: 3,
      title: "Chain 3: Field Report → Offline Queue → Sync → Dashboard",
      desc: "Simulates remote field report queued offline in IndexedDB, then auto-synced into PostgreSQL when connectivity returns, updating map status.",
      icon: FileText,
      action: onTriggerChain3,
    },
    {
      num: 4,
      title:
        "Chain 4: Satellite/GLOF → Mock Seismic Trigger → Travel Time → Red Zone → Alert",
      desc: "Triggers Mag 4.8 ice-rock collapse at South Lhonak Lake; computes downstream wave velocity and ETA (Lachen ~38m); turns NH-10 red; dispatches multilingual alerts.",
      icon: Radio,
      action: onTriggerChain4,
    },
    {
      num: 5,
      title: "Chain 5: Vehicle Speed Anomaly → Early Signal → Risk Update",
      desc: "Detects sustained 26 km/h speed deceleration across fleet on NH-29; corridor risk score elevates automatically before any human files a report.",
      icon: Gauge,
      action: onTriggerChain5,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface-1)",
          border: "1px solid var(--primary-accent)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--primary-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} color="#1A171A" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                Definition of Done — 5 Cause-and-Effect Chains Studio
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--text-sub)" }}>
                Test and verify the 5 judge-visible end-to-end chains live
                against the PostgreSQL & ML pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {chains.map((c) => {
            const Icon = c.icon;
            const isLoading = loadingChain === c.num;

            return (
              <div
                key={c.num}
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      background: "rgba(232, 121, 249, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "2px",
                    }}
                  >
                    <Icon size={20} color="var(--primary-accent)" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.92rem",
                        color: "#FFFFFF",
                        marginBottom: "4px",
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-muted)",
                        lineHeight: "1.4",
                      }}
                    >
                      {c.desc}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRun(c.num, c.action, c.title)}
                  disabled={isLoading}
                  className="pill-btn pill-btn-primary"
                  style={{
                    minWidth: "130px",
                    padding: "10px 16px",
                    fontSize: "0.8rem",
                  }}
                >
                  <span>{isLoading ? "Running..." : "Trigger Live"}</span>
                </button>
              </div>
            );
          })}

          {/* Console / Output Monitor */}
          {activeLog && (
            <div
              style={{
                background: "#0E0C0E",
                border: "1px solid rgba(232, 121, 249, 0.3)",
                borderRadius: "14px",
                padding: "14px",
                fontFamily: "monospace",
                fontSize: "0.78rem",
                color: "#38BDF8",
                maxHeight: "150px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {activeLog}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-2)",
          }}
        >
          <button
            onClick={onResetBaseline}
            className="pill-btn pill-btn-secondary"
            style={{ padding: "8px 18px", fontSize: "0.8rem" }}
          >
            <RotateCcw size={14} />
            <span>Refresh demo view</span>
          </button>

          <button
            onClick={onClose}
            className="pill-btn pill-btn-primary"
            style={{ padding: "8px 22px" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

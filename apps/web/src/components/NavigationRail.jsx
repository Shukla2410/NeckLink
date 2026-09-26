import React from "react";
import {
  Map,
  Navigation,
  Truck,
  MountainSnow,
  FileText,
  Bell,
  Radio,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";

export default function NavigationRail({
  activeTab,
  setActiveTab,
  isConnected,
  onOpenSimulator,
  unreadAlertsCount = 0,
}) {
  const navItems = [
    { id: "command", label: "Command Center", icon: Map },
    { id: "routing", label: "AI Risk Router", icon: Navigation },
    { id: "telematics", label: "Fleet Telematics", icon: Truck },
    { id: "glof", label: "GLOF Cryosphere", icon: MountainSnow },
    { id: "field_pwa", label: "Offline Field PWA", icon: FileText },
    {
      id: "alerts",
      label: "Multilingual Alerts",
      icon: Bell,
      badge: unreadAlertsCount,
    },
  ];

  return (
    <aside
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100vh",
        backgroundColor: "var(--bg-surface-1)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        gap: "24px",
        zIndex: 1000,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "0 8px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, var(--primary-accent), #C084FC)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px var(--primary-glow)",
          }}
        >
          <Radio size={22} color="#1A171A" strokeWidth={2.5} />
        </div>
        <div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            NECKLINK
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--primary-accent)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            NER DISASTER INTELLIGENCE
          </div>
        </div>
      </div>

      {/* Realtime Telemetry & Firebase Status */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "14px",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
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
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isConnected
                  ? "var(--status-open)"
                  : "var(--status-blocked)",
                boxShadow: isConnected ? "0 0 8px var(--status-open)" : "none",
              }}
            ></span>
            <span
              style={{ fontSize: "0.78rem", fontWeight: 600, color: "#FFFFFF" }}
            >
              Firebase RTDB & Telemetry
            </span>
          </div>
          <Activity
            size={14}
            color={isConnected ? "var(--status-open)" : "var(--text-sub)"}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.68rem",
            color: "var(--text-sub)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#38BDF8",
            }}
          ></span>
          <span>OpenWeatherMap Live Precipitation</span>
        </div>
      </div>

      {/* Nav List */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          flex: 1,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "14px",
                border: "none",
                background: isActive
                  ? "rgba(232, 121, 249, 0.16)"
                  : "transparent",
                color: isActive ? "var(--primary-accent)" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Icon
                  size={19}
                  color={isActive ? "var(--primary-accent)" : "var(--text-sub)"}
                />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    backgroundColor: "var(--primary-accent)",
                    color: "#1A171A",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Cause & Effect Simulator CTA */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <button
          onClick={onOpenSimulator}
          className="pill-btn pill-btn-primary"
          style={{ width: "100%", padding: "12px 16px" }}
        >
          <Sparkles size={16} />
          <span>Demo Simulators</span>
        </button>

        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--text-sub)",
            textAlign: "center",
            lineHeight: "1.3",
          }}
        >
          SIH26002 · MDoNER Prototype
          <br />
          Postgres + PostGIS + FastAPI
        </div>
      </div>
    </aside>
  );
}

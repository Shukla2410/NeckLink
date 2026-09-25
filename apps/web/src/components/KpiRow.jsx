import React from "react";
import {
  Route,
  Truck,
  AlertTriangle,
  MountainSnow,
  ArrowUpRight,
} from "lucide-react";

export default function KpiRow({ stats, onCardClick }) {
  const cards = [
    {
      id: "corridors",
      title: "Strategic Corridors",
      count: stats?.active_corridors ?? "—",
      sub: `${stats?.corridors_open ?? "—"} Open · ${stats?.corridors_at_risk ?? "—"} At-Risk · ${stats?.corridors_blocked ?? "—"} Blocked`,
      icon: Route,
      accent: "#E879F9",
      bgLight: "rgba(232, 121, 249, 0.12)",
      tag: "NER HIGHWAY MESH",
    },
    {
      id: "telematics",
      title: "Vehicles Tracked Live",
      count: stats?.vehicles_tracked ?? "—",
      sub: "Active telematics & GPS geofencing enabled",
      icon: Truck,
      accent: "#38BDF8",
      bgLight: "rgba(56, 189, 248, 0.12)",
      tag: "CLOSED-LOOP TELEMETRY",
    },
    {
      id: "alerts",
      title: "Active Risk Alerts",
      count: stats?.active_alerts ?? "—",
      sub: `${stats?.critical_hazard_zones ?? "—"} Active hazard zones in effect`,
      icon: AlertTriangle,
      accent: "#F59E0B",
      bgLight: "rgba(245, 158, 11, 0.12)",
      tag: "MULTILINGUAL DISPATCH",
    },
    {
      id: "glof",
      title: "GLOF Watch Lakes",
      count: stats?.glacial_lakes_monitored ?? "—",
      sub:
        stats?.corridors_glof_alert > 0
          ? "SURGE CASCADE TRIGGERED"
          : "South Lhonak & Dibang Watch",
      icon: MountainSnow,
      accent: "#E879F9",
      bgLight: "rgba(232, 121, 249, 0.16)",
      tag:
        stats?.corridors_glof_alert > 0
          ? "CRITICAL ALERT ACTIVE"
          : "CRYOSPHERE SENSORS",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginBottom: "20px",
      }}
    >
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onCardClick?.(c.id)}
            className="necklink-card"
            style={{
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-sub)",
                  letterSpacing: "0.04em",
                }}
              >
                {c.tag}
              </span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: c.bgLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} color={c.accent} />
              </div>
            </div>

            <div
              style={{ display: "flex", alignItems: "baseline", gap: "8px" }}
            >
              <span
                style={{
                  fontSize: "1.9rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  letterSpacing: "-0.02em",
                }}
              >
                {c.count}
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                }}
              >
                {c.title}
              </span>
            </div>

            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-sub)",
                marginTop: "2px",
              }}
            >
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { useState } from "react";
import {
  MountainSnow,
  Droplet,
  Activity,
  AlertTriangle,
  Clock,
  Radio,
  ShieldAlert,
  Eye,
  Sparkles,
} from "lucide-react";

export default function GlofWatchPanel({
  glacialLakes = [],
  onTriggerSeismicGlof,
  lastGlofResult,
}) {
  const [selectedLake, setSelectedLake] = useState(glacialLakes[0] || null);

  const defaultCascade = [
    {
      target: "Lachen Settlement & Bridge",
      distance_from_origin_km: 28.5,
      estimated_arrival_formatted: "38 mins",
      threat_level: "EXTREME",
      evacuation_status: "IMMEDIATE_ACTION",
    },
    {
      target: "Chungthang Dam & Hub",
      distance_from_origin_km: 62.0,
      estimated_arrival_formatted: "1h 22m",
      threat_level: "EXTREME",
      evacuation_status: "IMMEDIATE_ACTION",
    },
    {
      target: "Mangan District Center",
      distance_from_origin_km: 88.0,
      estimated_arrival_formatted: "1h 58m",
      threat_level: "HIGH",
      evacuation_status: "STANDBY_EVACUATION",
    },
    {
      target: "Dikchu Bridge Crossing",
      distance_from_origin_km: 115.0,
      estimated_arrival_formatted: "2h 36m",
      threat_level: "HIGH",
      evacuation_status: "STANDBY_EVACUATION",
    },
    {
      target: "Singtam NH-10 Confluence",
      distance_from_origin_km: 142.0,
      estimated_arrival_formatted: "3h 14m",
      threat_level: "HIGH",
      evacuation_status: "STANDBY_EVACUATION",
    },
  ];

  const lake = glacialLakes.find((l) => l.id === "LAKE-SLHONAK");
  const observations = lake?.observations || [];
  const cascadeList = lastGlofResult?.downstream_cascade || [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        height: "100%",
        overflowY: "auto",
        paddingRight: "8px",
      }}
    >
      {/* Header Banner */}
      <div
        className="necklink-card"
        style={{
          background:
            "linear-gradient(135deg, rgba(232, 121, 249, 0.15), rgba(35, 31, 36, 0.95))",
          border: "1px solid var(--primary-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "16px",
              background: "var(--primary-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px var(--primary-glow)",
            }}
          >
            <MountainSnow size={26} color="#1A171A" strokeWidth={2.5} />
          </div>
          <div>
            <span
              className="status-pill"
              style={{
                background: "rgba(232, 121, 249, 0.25)",
                color: "#FFFFFF",
                marginBottom: "4px",
              }}
            >
              FLAGSHIP NOVELTY: CRYOSPHERE & GLOF RADAR
            </span>
            <h2
              style={{ fontSize: "1.35rem", fontWeight: 700, color: "#FFFFFF" }}
            >
              Himalayan Glacial Lake Outburst Early Warning
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                maxWidth: "600px",
                lineHeight: "1.4",
              }}
            >
              Demonstration scenario combining stored lake observations and a
              simulated seismic trigger. Arrival estimates require expert
              validation; this is not an official early-warning service.
            </p>
          </div>
        </div>

        {/* Trigger Chain 4 Button */}
        <div>
          <button
            onClick={() => onTriggerSeismicGlof("LAKE-SLHONAK")}
            className="pill-btn pill-btn-primary"
            style={{ padding: "14px 24px", fontSize: "0.9rem" }}
          >
            <Radio size={18} />
            <span>Chain 4: Trigger Mock Seismic GLOF Event</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Lake Metrics & Downstream Travel Time */}
      <div
        className="responsive-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: "20px",
        }}
      >
        {/* Left: Lake Attributes & Satellite Area Growth */}
        <div
          className="necklink-card"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF" }}
            >
              South Lhonak Glacial Lake (North Sikkim)
            </h3>
            <span className="status-pill CRITICAL_ALERT">
              {lake?.monitoring_status || "NO DATA"}
            </span>
          </div>

          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              lineHeight: "1.4",
            }}
          >
            Location: <b>27.915° N, 88.204° E</b> · Basin:{" "}
            <b>Teesta River Headwaters</b> · Elevation: <b>5,200m ASL</b>
          </div>

          {/* Satellite Observation Comparison Card */}
          <div
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
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
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--primary-accent)",
                }}
              >
                STORED LAKE OBSERVATIONS · DEMO DATA
              </span>
              <Eye size={15} color="var(--primary-accent)" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-sub)" }}>
                  PRE-EXPANSION (SEP 2023)
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                  }}
                >
                  {observations[0]?.estimated_area_sq_km ?? "—"} km²
                </div>
                <div style={{ fontSize: "0.68rem", color: "#10B981" }}>
                  Baseline lake surface
                </div>
              </div>
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-sub)" }}>
                  POST-EXPANSION (SURGE)
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--primary-accent)",
                  }}
                >
                  {observations.at(-1)?.estimated_area_sq_km ?? "—"} km²
                </div>
                <div style={{ fontSize: "0.68rem", color: "#EF4444" }}>
                  Stored growth index: {lake?.growth_rate_pct ?? "—"}%
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-sub)",
                lineHeight: "1.3",
              }}
            >
              Stored stability classification:{" "}
              <b>{lake?.moraine_stability || "Unknown"}</b>. Demonstration
              observations are not independently verified satellite
              measurements.
            </div>
          </div>

          <div
            style={{
              background: "rgba(232, 121, 249, 0.08)",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(232, 121, 249, 0.2)",
              fontSize: "0.76rem",
              color: "var(--text-muted)",
            }}
          >
            <b>Downstream Road Impact:</b> NH-10 (Siliguri - Gangtok Teesta
            Valley Axis). A lake breach cuts off Sikkim's sole commercial artery
            within ~3.5 hours.
          </div>
        </div>

        {/* Right: Downstream Cascade Wave Propagation Table */}
        <div
          className="necklink-card"
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                Downstream Wave Arrival & Travel Time Model
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-sub)" }}>
                Illustrative distance / speed scenario; not a calibrated flood
                forecast
              </span>
            </div>
            <Clock size={18} color="var(--primary-accent)" />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.78rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--text-sub)",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "8px 6px" }}>Downstream Target</th>
                  <th style={{ padding: "8px 6px" }}>Distance</th>
                  <th style={{ padding: "8px 6px" }}>Flood Wave ETA</th>
                  <th style={{ padding: "8px 6px" }}>Threat Level</th>
                  <th style={{ padding: "8px 6px" }}>Evacuation Action</th>
                </tr>
              </thead>
              <tbody>
                {cascadeList.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td
                      style={{
                        padding: "10px 6px",
                        fontWeight: 600,
                        color: "#FFFFFF",
                      }}
                    >
                      {item.target}
                    </td>
                    <td
                      style={{
                        padding: "10px 6px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {item.distance_from_origin_km} km
                    </td>
                    <td
                      style={{
                        padding: "10px 6px",
                        fontWeight: 700,
                        color: "var(--primary-accent)",
                      }}
                    >
                      {item.estimated_arrival_formatted}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <span
                        className={`status-pill ${item.threat_level === "EXTREME" ? "CRITICAL_ALERT" : "AT_RISK"}`}
                      >
                        {item.threat_level}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 6px",
                        color:
                          item.evacuation_status === "IMMEDIATE_ACTION"
                            ? "#EF4444"
                            : "#F59E0B",
                        fontWeight: 600,
                      }}
                    >
                      {item.evacuation_status.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

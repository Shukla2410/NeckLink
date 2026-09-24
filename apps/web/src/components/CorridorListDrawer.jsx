import React, { useState } from "react";
import { 
  CloudRain, 
  TrendingUp, 
  Gauge, 
  MapPin, 
  AlertTriangle, 
  Compass, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Droplets
} from "lucide-react";

export default function CorridorListDrawer({
  roads = [],
  selectedCorridor,
  onSelectCorridor,
  onTriggerRainfallSpike
}) {
  const [filter, setFilter] = useState("ALL");

  const filteredRoads = roads.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "AT_RISK") return r.status === "AT_RISK";
    if (filter === "BLOCKED") return r.status === "BLOCKED";
    if (filter === "GLOF_ALERT") return r.status === "GLOF_ALERT";
    if (filter === "OPEN") return r.status === "OPEN";
    return true;
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "380px",
      minWidth: "380px",
      background: "var(--bg-surface-1)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "20px",
      padding: "20px",
      gap: "16px",
      overflow: "hidden"
    }}>
      {/* Header and Filter Chips */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF" }}>
            Corridor Network
          </h2>
          <span style={{ fontSize: "0.8rem", color: "var(--text-sub)", fontWeight: 500 }}>
            {filteredRoads.length} Segments
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", "AT_RISK", "BLOCKED", "GLOF_ALERT", "OPEN"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px",
                borderRadius: "9999px",
                border: filter === f ? "1px solid var(--primary-accent)" : "1px solid var(--border-subtle)",
                background: filter === f ? "rgba(232, 121, 249, 0.18)" : "var(--bg-surface-2)",
                color: filter === f ? "var(--primary-accent)" : "var(--text-muted)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Corridor Card List */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        overflowY: "auto",
        paddingRight: "4px",
        flex: 1
      }}>
        {filteredRoads.map((road) => {
          const isSelected = selectedCorridor?.id === road.id;
          const riskPct = Math.round(road.risk_score * 100);

          return (
            <div
              key={road.id}
              onClick={() => onSelectCorridor(road)}
              style={{
                background: isSelected ? "var(--bg-surface-2)" : "var(--bg-surface-1)",
                border: isSelected ? "1px solid var(--primary-accent)" : "1px solid var(--border-subtle)",
                borderRadius: "16px",
                padding: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: isSelected ? "0 4px 18px rgba(232, 121, 249, 0.15)" : "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF" }}>
                  {road.code}
                </span>
                <span className={`status-pill ${road.status}`}>
                  {road.status}
                </span>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.3" }}>
                {road.name}
              </div>

              {/* Progress bar for risk score */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-sub)", marginBottom: "4px" }}>
                  <span>Disruption Risk</span>
                  <span style={{ fontWeight: 600, color: riskPct > 70 ? "#EF4444" : (riskPct > 40 ? "#F59E0B" : "#10B981") }}>
                    {riskPct}%
                  </span>
                </div>
                <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    width: `${riskPct}%`,
                    height: "100%",
                    background: road.status === "GLOF_ALERT" ? "var(--primary-accent)" : (riskPct > 70 ? "#EF4444" : (riskPct > 40 ? "#F59E0B" : "#10B981")),
                    borderRadius: "3px",
                    transition: "width 0.5s ease"
                  }}></div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-sub)", marginTop: "4px" }}>
                <span>{road.distance_km} km</span>
                <span>Speed: {road.current_speed} / {road.baseline_speed} km/h</span>
                <span>Rain: {road.rainfall_mm}mm</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Detail Drawer Panel */}
      {selectedCorridor && (
        <div style={{
          marginTop: "auto",
          padding: "16px",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-active)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          animation: "fadeIn 0.2s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#FFFFFF" }}>
                {selectedCorridor.code} Analysis
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-sub)" }}>
                {selectedCorridor.origin} → {selectedCorridor.destination} ({selectedCorridor.state})
              </div>
            </div>
            <span className={`status-pill ${selectedCorridor.status}`}>
              {selectedCorridor.status}
            </span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "0.76rem"
          }}>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "10px" }}>
              <div style={{ color: "var(--text-sub)" }}>Topography Slope</div>
              <div style={{ fontWeight: 600, color: "#FFFFFF" }}>{selectedCorridor.slope_deg}° inclination</div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "10px" }}>
              <div style={{ color: "var(--text-sub)" }}>Historical Landslides</div>
              <div style={{ fontWeight: 600, color: "#FFFFFF" }}>{selectedCorridor.historical_incidents} logged</div>
            </div>
          </div>

          {/* Interactive Trigger Button for Cause-and-Effect Chain 1 */}
          <button
            onClick={() => onTriggerRainfallSpike(selectedCorridor.id)}
            className="pill-btn pill-btn-secondary"
            style={{ width: "100%", padding: "10px", fontSize: "0.8rem" }}
          >
            <CloudRain size={16} />
            <span>Simulate Rainfall Spike (+120mm)</span>
          </button>
        </div>
      )}
    </div>
  );
}

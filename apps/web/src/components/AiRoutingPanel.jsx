import React, { useState } from "react";
import { apiFetch as fetch } from "../utils/api";
import {
  Navigation,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function AiRoutingPanel({
  onRouteCalculated,
  apiBase = "http://localhost:5000",
}) {
  const [origin, setOrigin] = useState("Siliguri");
  const [destination, setDestination] = useState("Gangtok");
  const [riskWeight, setRiskWeight] = useState(3.5);
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [error, setError] = useState("");

  const hubs = [
    "Siliguri",
    "Gangtok",
    "Guwahati",
    "Tezpur",
    "Shillong",
    "Silchar",
    "Dimapur",
    "Kohima",
    "Imphal",
    "Aizawl",
    "Agartala",
    "Pasighat",
  ];

  const handleCalculateRoute = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/routes/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          risk_weight: Number(riskWeight),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Route unavailable");
      if (data.status === "ok") {
        setRouteResult(data.result);
        onRouteCalculated?.(data.result);
      }
    } catch (err) {
      console.error("Routing error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Route Selector Card */}
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      <div
        className="necklink-card"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(232, 121, 249, 0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Navigation size={18} color="var(--primary-accent)" />
          </div>
          <div>
            <h3
              style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF" }}
            >
              AI Risk-Weighted Route Optimizer
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-sub)" }}>
              Dijkstra / A* Graph Network with Topographical & Live
              Meteorological Cost Weighting
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div
          className="responsive-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Origin Hub
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#FFFFFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              {hubs.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Destination Point
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "#FFFFFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              {hubs
                .filter((h) => h !== origin)
                .map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <button
              onClick={handleCalculateRoute}
              disabled={loading}
              className="pill-btn pill-btn-primary"
              style={{ width: "100%", padding: "11px 18px" }}
            >
              <Sparkles size={16} />
              <span>{loading ? "Computing..." : "Optimize Route"}</span>
            </button>
          </div>
        </div>

        {/* Risk Lambda Slider */}
        <div style={{ marginTop: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.74rem",
              color: "var(--text-sub)",
              marginBottom: "4px",
            }}
          >
            <span>Safety Weighting (Risk Lambda Factor: {riskWeight})</span>
            <span>
              Higher factor prioritizes hazard-free bypasses over physical
              distance
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="8.0"
            step="0.5"
            value={riskWeight}
            onChange={(e) => setRiskWeight(parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: "var(--primary-accent)",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* Comparison Results Card */}
      {routeResult && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* AI Recommended Safe Route */}
          <div
            className="necklink-card"
            style={{
              border: "1px solid var(--primary-accent)",
              background: "rgba(232, 121, 249, 0.05)",
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
              <span
                className="status-pill OPEN"
                style={{
                  background: "rgba(232, 121, 249, 0.2)",
                  color: "var(--primary-accent)",
                  border: "1px solid var(--primary-accent)",
                }}
              >
                ★ AI RECOMMENDED ROUTE
              </span>
              {routeResult.is_rerouted && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--primary-accent)",
                    fontWeight: 600,
                  }}
                >
                  HAZARD BYPASS ACTIVE
                </span>
              )}
            </div>

            <div
              style={{ display: "flex", alignItems: "baseline", gap: "12px" }}
            >
              <div>
                <span
                  style={{
                    fontSize: "1.7rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                  }}
                >
                  {routeResult.optimal_route?.eta_hours}h
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-sub)",
                    marginLeft: "4px",
                  }}
                >
                  ETA
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  {routeResult.optimal_route?.distance_km} km
                </span>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#10B981",
                    fontWeight: 600,
                  }}
                >
                  Peak Risk:{" "}
                  {Math.round(routeResult.optimal_route?.peak_risk_score * 100)}
                  %
                </span>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface-2)",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {routeResult.optimal_route?.path_nodes.map((node, i, arr) => (
                <React.Fragment key={node}>
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>
                    {node}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowRight size={12} color="var(--primary-accent)" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-sub)",
                fontStyle: "italic",
              }}
            >
              {routeResult.reroute_reason}
            </div>
          </div>

          {/* Shortest Physical Distance (Unweighted) Route */}
          <div
            className="necklink-card"
            style={{
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
              <span
                className="status-pill"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--text-muted)",
                }}
              >
                SHORTEST DISTANCE BASELINE
              </span>
              {routeResult.shortest_unweighted_route?.peak_risk_score >
                0.65 && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#EF4444",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ HIGH DISRUPTION RISK
                </span>
              )}
            </div>

            <div
              style={{ display: "flex", alignItems: "baseline", gap: "12px" }}
            >
              <div>
                <span
                  style={{
                    fontSize: "1.7rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                  }}
                >
                  {routeResult.shortest_unweighted_route?.eta_hours}h
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-sub)",
                    marginLeft: "4px",
                  }}
                >
                  ETA
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  {routeResult.shortest_unweighted_route?.distance_km} km
                </span>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color:
                      routeResult.shortest_unweighted_route?.peak_risk_score >
                      0.65
                        ? "#EF4444"
                        : "#10B981",
                  }}
                >
                  Peak Risk:{" "}
                  {Math.round(
                    routeResult.shortest_unweighted_route?.peak_risk_score *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface-2)",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {routeResult.shortest_unweighted_route?.path_nodes.map(
                (node, i, arr) => (
                  <React.Fragment key={node}>
                    <span>{node}</span>
                    {i < arr.length - 1 && (
                      <ArrowRight size={12} color="var(--text-sub)" />
                    )}
                  </React.Fragment>
                ),
              )}
            </div>

            <div style={{ fontSize: "0.74rem", color: "var(--text-sub)" }}>
              Pure Euclidean/road network distance without real-time
              topographical landslide penalty.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

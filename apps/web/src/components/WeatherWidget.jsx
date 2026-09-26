import React, { useState, useEffect } from "react";
import { API_BASE, apiFetch as fetch } from "../utils/api";
import { CloudRain, Sun, Wind, Droplets, RefreshCw } from "lucide-react";

export default function WeatherWidget({ apiBase = API_BASE }) {
  const [hubsWeather, setHubsWeather] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/weather/hubs`);
      const data = await res.json();
      if (data.status === "ok") {
        setHubsWeather(data.hubs);
      }
    } catch (e) {
      console.warn("Weather widget fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // 5 min refresh
    return () => clearInterval(interval);
  }, []);

  if (hubsWeather.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--bg-surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        overflowX: "auto",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minWidth: "150px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "rgba(56, 189, 248, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CloudRain size={16} color="#38BDF8" />
        </div>
        <div>
          <div
            style={{ fontSize: "0.74rem", fontWeight: 700, color: "#FFFFFF" }}
          >
            Current weather
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-sub)" }}>
            Precipitation Feed
          </div>
        </div>
      </div>

      {/* Hub Pills */}
      <div style={{ display: "flex", gap: "10px", flex: 1, overflowX: "auto" }}>
        {hubsWeather.slice(0, 6).map((h) => {
          const isRain = h.is_precipitation_active;
          return (
            <div
              key={h.hub_name}
              style={{
                background: isRain
                  ? "rgba(245, 158, 11, 0.12)"
                  : "var(--bg-surface-2)",
                border: isRain
                  ? "1px solid rgba(245, 158, 11, 0.3)"
                  : "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ fontWeight: 600, color: "#FFFFFF" }}>
                {h.hub_name}:
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {h.fallback ? "Unavailable" : `${h.temp_c}°C`}
              </span>
              <span
                style={{
                  color: isRain ? "#F59E0B" : "var(--text-sub)",
                  fontWeight: isRain ? 600 : 400,
                }}
              >
                {h.description}{" "}
                {h.rain_1h_mm > 0 ? `(${h.rain_1h_mm}mm/h)` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={fetchWeather}
        disabled={loading}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-sub)",
          cursor: "pointer",
          padding: "4px",
        }}
        title="Refresh Weather"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

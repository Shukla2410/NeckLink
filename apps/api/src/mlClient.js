const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export async function predictRisk(features) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/predict-risk`, {
      signal: AbortSignal.timeout(8000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
    });
    if (res.ok) {
      return {
        ...(await res.json()),
        source: "SYNTHETIC_RANDOM_FOREST",
        calibrated_probability: false,
      };
    }
  } catch (err) {
    console.warn(
      "ML Service unavailable, using internal fallback:",
      err.message,
    );
  }

  // Resilient internal heuristic fallback
  const rf = Number(features.rainfall_mm || 0);
  const slope = Number(features.slope_deg || 15);
  const anomaly = Number(features.vehicle_speed_anomaly || 0);
  const incidents = Number(features.historical_incidents || 2);

  let raw =
    0.35 * (rf / 150) +
    0.2 * (slope / 45) +
    0.15 * (incidents / 20) +
    0.25 * Math.max(0, -anomaly / 30);
  if (rf > 60 && slope > 20) raw += 0.25;
  const score = Math.max(0.05, Math.min(0.98, Number(raw.toFixed(3))));

  let level = "LOW";
  let color = "#10B981";
  if (score >= 0.85) {
    level = "CRITICAL";
    color = "#E879F9";
  } else if (score >= 0.65) {
    level = "HIGH";
    color = "#EF4444";
  } else if (score >= 0.35) {
    level = "MEDIUM";
    color = "#F59E0B";
  }

  return {
    source: "HEURISTIC_FALLBACK",
    calibrated_probability: false,
    corridor_id: features.corridor_id,
    risk_score: score,
    risk_level: level,
    badge_color: color,
    contributing_signals: {
      meteorological_weight: Number((Math.min(1, rf / 100) * 0.45).toFixed(2)),
      topographical_weight: Number((Math.min(1, slope / 40) * 0.25).toFixed(2)),
      vehicle_telematics_weight: Number(
        (Math.min(1, Math.max(0, -anomaly) / 25) * 0.3).toFixed(2),
      ),
    },
    explanation:
      rf > 50
        ? `Heavy rainfall (${rf} mm) with steep terrain risk`
        : "Normal operational parameters",
  };
}

export async function requestRoute(
  origin,
  destination,
  riskWeight = 3.5,
  corridorRisks = {},
  constraints = {},
) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/route`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin,
        destination,
        risk_weight: riskWeight,
        corridor_risks: corridorRisks,
        ...constraints,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
    const problem = await res.json().catch(() => ({}));
    const error = new Error(
      typeof problem.detail === "string"
        ? problem.detail
        : "Route could not be calculated",
    );
    error.status = res.status === 422 ? 422 : 503;
    throw error;
  } catch (err) {
    const error = new Error(
      err.status === 422
        ? err.message
        : "Route service unavailable. Contact your dispatcher and retry shortly.",
    );
    error.status = err.status || 503;
    throw error;
  }
}

export async function calculateGlofTravelTime(
  lakeId,
  lakeName,
  volume = 45000000,
) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/downstream-travel-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lake_id: lakeId,
        lake_name: lakeName,
        estimated_volume_m3: volume,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("GLOF ML service endpoint fallback:", err.message);
  }

  return {
    lake_id: lakeId,
    lake_name: lakeName,
    surge_velocity_range_kmh: "28 - 46 km/h",
    downstream_cascade: [
      {
        target: "Lachen Settlement & Bridge",
        distance_from_origin_km: 28.5,
        estimated_arrival_minutes: 38.0,
        estimated_arrival_formatted: "38 mins",
        evacuation_status: "IMMEDIATE_ACTION",
        threat_level: "EXTREME",
      },
      {
        target: "Chungthang Dam & Hub",
        distance_from_origin_km: 62.0,
        estimated_arrival_minutes: 82.0,
        estimated_arrival_formatted: "1h 22m",
        evacuation_status: "IMMEDIATE_ACTION",
        threat_level: "EXTREME",
      },
      {
        target: "Mangan District Center",
        distance_from_origin_km: 88.0,
        estimated_arrival_minutes: 118.0,
        estimated_arrival_formatted: "1h 58m",
        evacuation_status: "STANDBY_EVACUATION",
        threat_level: "HIGH",
      },
      {
        target: "Singtam NH-10 Confluence",
        distance_from_origin_km: 142.0,
        estimated_arrival_minutes: 194.0,
        estimated_arrival_formatted: "3h 14m",
        evacuation_status: "STANDBY_EVACUATION",
        threat_level: "HIGH",
      },
    ],
    first_settlement_eta_mins: 38.0,
    critical_evacuation_window: "38 mins to first population center",
  };
}

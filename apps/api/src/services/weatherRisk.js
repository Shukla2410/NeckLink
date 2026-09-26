import { query } from "../db.js";
import { predictRisk } from "../mlClient.js";
import { broadcastEvent } from "../realtime.js";
import { translateAlert } from "../translator.js";
import { randomUUID } from "node:crypto";
let currentRun = null;
export function refreshWeatherRisk() {
  if (!currentRun)
    currentRun = refresh().finally(() => {
      currentRun = null;
    });
  return currentRun;
}
async function refresh() {
  const roads = (await query("SELECT * FROM corridor")).rows;
  const results = [];
  for (const road of roads) {
    try {
      const coords =
        road.path_coordinates?.[Math.floor(road.path_coordinates.length / 2)];
      if (!coords) continue;
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude: coords[1],
        longitude: coords[0],
        hourly: "precipitation",
        past_days: "1",
        forecast_days: "2",
        timezone: "UTC",
      });
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Weather provider unavailable");
      const data = await response.json();
      if (!data.hourly?.time?.length || !data.hourly.precipitation?.length)
        throw new Error("Incomplete forecast");
      const now = Date.now();
      let past = 0,
        future = 0,
        pastCount = 0,
        futureCount = 0;
      data.hourly.time.forEach((t, i) => {
        const delta = new Date(t + "Z").getTime() - now;
        const rain = data.hourly.precipitation[i];
        if (rain === null || !Number.isFinite(rain)) return;
        if (delta <= 0 && delta > -86400000) {
          past += rain;
          pastCount++;
        }
        if (delta > 0 && delta <= 86400000) {
          future += rain;
          futureCount++;
        }
      });
      if (pastCount < 23 || futureCount < 23)
        throw new Error("Incomplete rainfall window");
      const prediction = await predictRisk({
        corridor_id: road.id,
        rainfall_mm: Math.max(past, future),
        rainfall_trend: future > past ? 2 : 1,
        slope_deg: Number(road.slope_deg),
        historical_incidents: road.historical_incidents,
        vehicle_speed_anomaly: 0,
        season: 2,
      });
      await query(
        "INSERT INTO weather_observation(corridor_id,observed_at,rainfall_24h_mm,forecast_24h_mm,source,payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [
          road.id,
          new Date(Math.floor(now / 3600000) * 3600000),
          past,
          future,
          "OPEN_METEO_MODEL",
          JSON.stringify({ prediction, horizon_hours: 24 }),
        ],
      );
      const updated = await query(
        `UPDATE corridor SET rainfall_mm=$1,rainfall_trend=$2,risk_score=CASE WHEN status IN ('BLOCKED','GLOF_ALERT') THEN GREATEST(risk_score,$3) ELSE $3 END,status=CASE WHEN status IN ('BLOCKED','GLOF_ALERT') OR status_source='VERIFIED_OFFICIAL' THEN status WHEN $3>=0.4 THEN 'AT_RISK' ELSE 'OPEN' END,updated_at=NOW() WHERE id=$4 RETURNING status,risk_score`,
        [
          past,
          future > past ? "RISING" : "STABLE",
          prediction.risk_score,
          road.id,
        ],
      );
      const payload = {
        corridor_id: road.id,
        rainfall_mm: past,
        forecast_24h_mm: future,
        status: updated.rows[0].status,
        risk_score: Number(updated.rows[0].risk_score),
        source: "OPEN_METEO_MODEL",
      };
      broadcastEvent("ROAD_STATUS_CHANGED", payload);
      if (prediction.risk_score >= 0.65 && Number(road.risk_score) < 0.65) {
        const id = randomUUID(),
          message = `Weather-based risk is elevated on ${road.name}. Next 24 hours modelled rain: ${future.toFixed(1)} mm. Check your route before departure.`;
        const translations = await translateAlert("RISK_SPIKE", message);
        await query(
          "INSERT INTO alert(id,type,severity,corridor_id,title,message,translations,status) VALUES($1,'RISK_SPIKE','WARNING',$2,$3,$4,$5,'CREATED')",
          [
            id,
            road.id,
            "Weather risk increased",
            message,
            JSON.stringify(translations),
          ],
        );
        broadcastEvent("ALERT_CREATED", {
          id,
          message,
          translations,
          corridor_id: road.id,
          severity: "WARNING",
          title: "Weather risk increased",
          created_at: new Date().toISOString(),
        });
      }
      results.push({ ...payload, ok: true });
    } catch (e) {
      results.push({ corridor_id: road.id, ok: false, message: e.message });
    }
  }
  return results;
}

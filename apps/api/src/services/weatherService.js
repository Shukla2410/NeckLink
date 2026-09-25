/**
 * OpenWeatherMap Integration Service for NECKLINK
 * Fetches real-time precipitation, atmospheric pressure, temperature and wind
 * across strategic NER transit nodes.
 */

const API_KEY = process.env.OPENWEATHER_API_KEY || "";
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute caching

const NER_HUBS = {
  Gangtok: { lat: 27.33, lon: 88.6, state: "Sikkim", corridor_id: "CORR-NH10" },
  Guwahati: {
    lat: 26.15,
    lon: 91.75,
    state: "Assam",
    corridor_id: "CORR-NH27",
  },
  Dimapur: {
    lat: 25.9,
    lon: 93.73,
    state: "Nagaland",
    corridor_id: "CORR-NH29",
  },
  Kohima: {
    lat: 25.67,
    lon: 94.11,
    state: "Nagaland",
    corridor_id: "CORR-NH29",
  },
  Shillong: {
    lat: 25.58,
    lon: 91.89,
    state: "Meghalaya",
    corridor_id: "CORR-NH06",
  },
  Silchar: { lat: 24.82, lon: 92.8, state: "Assam", corridor_id: "CORR-NH06" },
  Imphal: {
    lat: 24.82,
    lon: 93.94,
    state: "Manipur",
    corridor_id: "CORR-NH102",
  },
  Itanagar: {
    lat: 27.08,
    lon: 93.61,
    state: "Arunachal Pradesh",
    corridor_id: "CORR-NH415",
  },
  Pasighat: {
    lat: 28.07,
    lon: 95.33,
    state: "Arunachal Pradesh",
    corridor_id: "CORR-NH15",
  },
  Agartala: {
    lat: 23.83,
    lon: 91.28,
    state: "Tripura",
    corridor_id: "CORR-NH208",
  },
};

export async function fetchWeatherForLocation(lat, lon, hubName = "NER Node") {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    if (!API_KEY || API_KEY.startsWith("YOUR_"))
      throw new Error("OpenWeather credentials not configured");
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) {
      throw new Error(`OpenWeather API responded with status ${res.status}`);
    }
    const raw = await res.json();

    const data = {
      hub_name: hubName,
      lat: Number(lat),
      lon: Number(lon),
      temp_c: raw.main?.temp ?? 22.0,
      feels_like_c: raw.main?.feels_like ?? 22.0,
      humidity_pct: raw.main?.humidity ?? 70,
      pressure_hpa: raw.main?.pressure ?? 1012,
      wind_speed_kmh: Number(((raw.wind?.speed ?? 2.0) * 3.6).toFixed(1)),
      condition: raw.weather?.[0]?.main ?? "Clear",
      description: raw.weather?.[0]?.description ?? "clear skies",
      rain_1h_mm:
        raw.rain?.["1h"] ?? (raw.weather?.[0]?.main === "Rain" ? 1.5 : 0.0),
      is_precipitation_active:
        raw.weather?.[0]?.main === "Rain" ||
        raw.weather?.[0]?.main === "Thunderstorm",
      fetched_at: new Date().toISOString(),
    };

    cache.set(cacheKey, { timestamp: now, data });
    return data;
  } catch (err) {
    console.warn(`OpenWeatherMap fetch failed for ${hubName}:`, err.message);
    return {
      hub_name: hubName,
      lat,
      lon,
      temp_c: null,
      humidity_pct: null,
      condition: "Unavailable",
      description: "Weather feed unavailable",
      rain_1h_mm: null,
      is_precipitation_active: false,
      fetched_at: new Date().toISOString(),
      fallback: true,
    };
  }
}

export async function getAllNerHubsWeather() {
  const promises = Object.entries(NER_HUBS).map(([name, info]) =>
    fetchWeatherForLocation(info.lat, info.lon, name).then((data) => ({
      ...data,
      state: info.state,
      corridor_id: info.corridor_id,
    })),
  );

  return await Promise.all(promises);
}

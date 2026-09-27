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

const NODE_LOCATIONS = {
  Siliguri: [88.43, 26.72],
  Gangtok: [88.6, 27.33],
  "Nathu La": [88.83, 27.38],
  Algarah: [88.58, 27.12],
  Guwahati: [91.75, 26.15],
  Goalpara: [90.62, 26.17],
  Dhubri: [89.98, 26.02],
  Phulbari: [90.1, 25.75],
  Tura: [90.22, 25.51],
  Shillong: [91.89, 25.58],
  Jowai: [92.2, 25.45],
  Silchar: [92.8, 24.82],
  Aizawl: [92.72, 23.73],
  Agartala: [91.28, 23.83],
  Dimapur: [93.73, 25.9],
  Kohima: [94.11, 25.67],
  Imphal: [93.94, 24.82],
  Moreh: [94.3, 24.25],
  Tezpur: [92.8, 26.65],
  Kaziranga: [93.4, 26.6],
  Jorhat: [94.2, 26.75],
  Dibrugarh: [94.91, 27.48],
  "North Lakhimpur": [94.1, 27.23],
  Pasighat: [95.33, 28.07],
  Roing: [95.83, 28.14],
  Tezu: [96.17, 27.92],
  Itanagar: [93.61, 27.08],
};

const BASE_EDGES = [
  { origin: "Siliguri", destination: "Guwahati", corridor_id: "CORR-NH27", distance_km: 472.0, risk_score: 0.12 },
  { origin: "Siliguri", destination: "Gangtok", corridor_id: "CORR-NH10", distance_km: 114.0, risk_score: 0.74 },
  { origin: "Siliguri", destination: "Algarah", corridor_id: "CORR-NH717A", distance_km: 92.0, risk_score: 0.20 },
  { origin: "Algarah", destination: "Gangtok", corridor_id: "CORR-NH717B", distance_km: 58.0, risk_score: 0.25 },
  { origin: "Gangtok", destination: "Nathu La", corridor_id: "CORR-NH310", distance_km: 54.0, risk_score: 0.52 },
  { origin: "Guwahati", destination: "Shillong", corridor_id: "CORR-NH06A", distance_km: 99.0, risk_score: 0.18 },
  { origin: "Shillong", destination: "Jowai", corridor_id: "CORR-NH06B", distance_km: 64.0, risk_score: 0.22 },
  { origin: "Jowai", destination: "Silchar", corridor_id: "CORR-NH06C", distance_km: 145.0, risk_score: 0.25 },
  { origin: "Silchar", destination: "Aizawl", corridor_id: "CORR-NH306", distance_km: 165.0, risk_score: 0.28 },
  { origin: "Silchar", destination: "Agartala", corridor_id: "CORR-NH208", distance_km: 260.0, risk_score: 0.16 },
  { origin: "Guwahati", destination: "Tezpur", corridor_id: "CORR-NH15A", distance_km: 178.0, risk_score: 0.14 },
  { origin: "Tezpur", destination: "Kaziranga", corridor_id: "CORR-NH37A", distance_km: 65.0, risk_score: 0.15 },
  { origin: "Kaziranga", destination: "Jorhat", corridor_id: "CORR-NH37B", distance_km: 90.0, risk_score: 0.16 },
  { origin: "Jorhat", destination: "Dibrugarh", corridor_id: "CORR-NH37C", distance_km: 138.0, risk_score: 0.15 },
  { origin: "Tezpur", destination: "North Lakhimpur", corridor_id: "CORR-NH15B", distance_km: 170.0, risk_score: 0.18 },
  { origin: "North Lakhimpur", destination: "Pasighat", corridor_id: "CORR-NH15C", distance_km: 175.0, risk_score: 0.20 },
  { origin: "Pasighat", destination: "Roing", corridor_id: "CORR-NH13A", distance_km: 105.0, risk_score: 0.40 },
  { origin: "Roing", destination: "Tezu", corridor_id: "CORR-NH13B", distance_km: 93.0, risk_score: 0.45 },
  { origin: "Jorhat", destination: "Dimapur", corridor_id: "CORR-LINK-JD", distance_km: 128.0, risk_score: 0.20 },
  { origin: "Dimapur", destination: "Kohima", corridor_id: "CORR-NH29A", distance_km: 74.0, risk_score: 0.68 },
  { origin: "Kohima", destination: "Imphal", corridor_id: "CORR-NH29B", distance_km: 142.0, risk_score: 0.65 },
  { origin: "Silchar", destination: "Imphal", corridor_id: "CORR-NH37-IMP", distance_km: 240.0, risk_score: 0.35 },
  { origin: "Imphal", destination: "Moreh", corridor_id: "CORR-NH102", distance_km: 107.0, risk_score: 0.25 },
  { origin: "Guwahati", destination: "Goalpara", corridor_id: "CORR-NH17", distance_km: 130.0, risk_score: 0.14 },
  { origin: "Goalpara", destination: "Dhubri", corridor_id: "CORR-NH17B", distance_km: 70.0, risk_score: 0.15 },
  { origin: "Dhubri", destination: "Phulbari", corridor_id: "CORR-NH127B", distance_km: 72.0, risk_score: 0.19 },
  { origin: "Phulbari", destination: "Tura", corridor_id: "CORR-NH217A", distance_km: 68.0, risk_score: 0.24 },
  { origin: "Guwahati", destination: "Itanagar", corridor_id: "CORR-NH415", distance_km: 320.0, risk_score: 0.20 },
];

function dijkstra(nodes, edges, origin, destination, weightFn) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const pq = [{ node: origin, cost: 0 }];

  for (const node of nodes) {
    dist[node] = Infinity;
  }
  dist[origin] = 0;

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { node: u, cost: d } = pq.shift();

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === destination) break;

    const neighbors = edges.filter((e) => e.u === u || e.v === u);
    for (const edge of neighbors) {
      const v = edge.u === u ? edge.v : edge.u;
      if (visited.has(v)) continue;

      const weight = weightFn(edge);
      if (d + weight < dist[v]) {
        dist[v] = d + weight;
        prev[v] = { node: u, edge };
        pq.push({ node: v, cost: dist[v] });
      }
    }
  }

  if (dist[destination] === Infinity || !dist[destination] && origin !== destination) {
    return null;
  }

  const pathNodes = [];
  let curr = destination;
  while (curr) {
    pathNodes.unshift(curr);
    curr = prev[curr]?.node;
  }

  return pathNodes;
}

export function calculateInternalRoute(
  origin,
  destination,
  riskWeight = 3.5,
  corridorRisks = {},
  constraints = {},
) {
  const {
    closed_corridors = [],
    vehicle_weight_tonnes = 0,
    corridor_limits = {},
    corridor_speeds = {},
    network_edges = [],
    use_demo_links = true,
  } = constraints;

  const rawEdges = [];
  if (use_demo_links) {
    rawEdges.push(
      ...BASE_EDGES.map((e) => ({
        u: e.origin,
        v: e.destination,
        corridor_id: e.corridor_id,
        distance_km: e.distance_km,
        risk_score: e.risk_score,
        coordinates: [],
        coordinate_origin: e.origin,
      })),
    );
  }

  for (const edge of network_edges || []) {
    rawEdges.push({
      u: edge.origin,
      v: edge.destination,
      corridor_id: edge.corridor_id,
      distance_km: edge.distance_km,
      risk_score: edge.risk_score,
      coordinates: edge.coordinates || [],
      coordinate_origin: edge.origin,
    });
  }

  const nodes = new Set();
  for (const e of rawEdges) {
    nodes.add(e.u);
    nodes.add(e.v);
  }

  if (!nodes.has(origin) || !nodes.has(destination)) {
    const err = new Error(`Node ${origin} or ${destination} not in graph network`);
    err.status = 422;
    throw err;
  }

  function matches(edgeId, suppliedId) {
    if (!edgeId || !suppliedId) return false;
    const key = suppliedId.startsWith("CORR-") ? suppliedId : "CORR-" + suppliedId;
    return edgeId === key || (edgeId.startsWith(key) && ["A", "B", "C"].includes(edgeId.slice(key.length)));
  }

  const activeEdges = [];
  for (const edge of rawEdges) {
    const cid = edge.corridor_id;
    const closed = (closed_corridors || []).some((k) => matches(cid, k));
    const restricted = Object.entries(corridor_limits || {}).some(
      ([k, limit]) => matches(cid, k) && limit > 0 && limit < vehicle_weight_tonnes,
    );
    if (closed || restricted) continue;

    for (const [k, speed] of Object.entries(corridor_speeds || {})) {
      if (matches(cid, k)) {
        edge.current_speed = Math.max(5, Number(speed));
      }
    }

    if (corridorRisks) {
      for (const [k, val] of Object.entries(corridorRisks)) {
        if (matches(cid, k)) {
          edge.risk_score = Number(val);
          break;
        }
      }
    }

    activeEdges.push(edge);
  }

  const shortestPath = dijkstra(nodes, activeEdges, origin, destination, (edge) => edge.distance_km);
  if (!shortestPath) {
    const err = new Error("No accessible route is available for this vehicle. Contact your dispatcher; do not enter a closed road.");
    err.status = 422;
    throw err;
  }

  function getEdge(u, v) {
    return activeEdges.find((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  }

  const shortestEdges = [];
  for (let i = 0; i < shortestPath.length - 1; i++) {
    shortestEdges.push(getEdge(shortestPath[i], shortestPath[i + 1]));
  }
  const shortestDist = shortestEdges.reduce((sum, e) => sum + (e?.distance_km || 0), 0);
  const shortestRisks = shortestEdges.map((e) => e?.risk_score || 0);
  const shortestAvgRisk = shortestRisks.reduce((a, b) => a + b, 0) / Math.max(1, shortestRisks.length);
  const shortestMaxRisk = shortestRisks.length ? Math.max(...shortestRisks) : 0;

  const optimalPath = dijkstra(nodes, activeEdges, origin, destination, (edge) => {
    const dist = edge.distance_km || 10.0;
    const r = edge.risk_score || 0.1;
    let penalty = 1.0 + riskWeight * (r ** 1.5);
    if (r > 0.75) {
      penalty += 10.0 * r;
    }
    return dist * penalty;
  }) || shortestPath;

  const optimalEdges = [];
  for (let i = 0; i < optimalPath.length - 1; i++) {
    optimalEdges.push(getEdge(optimalPath[i], optimalPath[i + 1]));
  }
  const optimalDist = optimalEdges.reduce((sum, e) => sum + (e?.distance_km || 0), 0);
  const optimalRisks = optimalEdges.map((e) => e?.risk_score || 0);
  const optimalAvgRisk = optimalRisks.reduce((a, b) => a + b, 0) / Math.max(1, optimalRisks.length);
  const optimalMaxRisk = optimalRisks.length ? Math.max(...optimalRisks) : 0;

  const isRerouted = JSON.stringify(optimalPath) !== JSON.stringify(shortestPath);

  const effSpeed = Math.max(20.0, 50.0 * (1.0 - 0.5 * optimalAvgRisk));
  const etaHours = Number(
    optimalEdges.reduce((sum, e) => sum + ((e?.distance_km || 0) / (e?.current_speed || effSpeed)), 0).toFixed(2),
  );

  const shortestSpeed = Math.max(15.0, 50.0 * (1.0 - 0.6 * shortestAvgRisk));
  const shortestEta = Number((shortestDist / shortestSpeed).toFixed(1));

  function getCoordinates(pathNodes) {
    const coords = [];
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const u = pathNodes[i];
      const v = pathNodes[i + 1];
      const edge = getEdge(u, v);
      if (edge && edge.coordinates && edge.coordinates.length > 0) {
        const points = edge.coordinate_origin === u ? edge.coordinates : [...edge.coordinates].reverse();
        coords.push(...points.map(([lng, lat]) => [lat, lng]));
      } else {
        for (const n of [u, v]) {
          if (NODE_LOCATIONS[n]) {
            const [lng, lat] = NODE_LOCATIONS[n];
            coords.push([lat, lng]);
          }
        }
      }
    }
    return coords;
  }

  return {
    source: use_demo_links ? "DATABASE_CORRIDORS_WITH_DEMO_LINKS" : "DATABASE_CORRIDORS",
    advisory: use_demo_links
      ? "Planning estimate on a simplified network. Follow verified road restrictions and local directions."
      : "Planning estimate using imported corridors. Verify recent road conditions before departure.",
    closed_corridors_excluded: closed_corridors || [],
    origin,
    destination,
    is_rerouted: isRerouted,
    reroute_reason: isRerouted
      ? "High risk/hazard avoidance along shortest physical corridor"
      : "Direct corridor within safe operational envelope",
    optimal_route: {
      path_nodes: optimalPath,
      coordinates: getCoordinates(optimalPath),
      distance_km: Number(optimalDist.toFixed(1)),
      eta_hours: etaHours,
      average_risk_score: Number(optimalAvgRisk.toFixed(3)),
      peak_risk_score: Number(optimalMaxRisk.toFixed(3)),
      recommendation: "RECOMMENDED_BY_AI",
    },
    shortest_unweighted_route: {
      path_nodes: shortestPath,
      coordinates: getCoordinates(shortestPath),
      distance_km: Number(shortestDist.toFixed(1)),
      eta_hours: shortestEta,
      average_risk_score: Number(shortestAvgRisk.toFixed(3)),
      peak_risk_score: Number(shortestMaxRisk.toFixed(3)),
      recommendation: shortestMaxRisk > 0.65 ? "HIGH_HAZARD_AVOID" : "VIABLE",
    },
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
      signal: AbortSignal.timeout(6000),
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
    if (err.status === 422) {
      throw err;
    }
    if (process.env.STRICT_ROUTING_OUTAGE === "true") {
      const error = new Error(
        "Route service unavailable. Contact your dispatcher and retry shortly.",
      );
      error.status = 503;
      throw error;
    }
    // Resilient fallback to internal graph routing engine
    return calculateInternalRoute(origin, destination, riskWeight, corridorRisks, constraints);
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

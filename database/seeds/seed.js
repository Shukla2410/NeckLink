import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/necklink",
});

const STATES = [
  { id: "AS", name: "Assam", capital: "Dispur", lat: 26.1433, lng: 91.7898 },
  { id: "SK", name: "Sikkim", capital: "Gangtok", lat: 27.3389, lng: 88.6065 },
  { id: "ML", name: "Meghalaya", capital: "Shillong", lat: 25.5788, lng: 91.8933 },
  { id: "NL", name: "Nagaland", capital: "Kohima", lat: 25.6751, lng: 94.1086 },
  { id: "MN", name: "Manipur", capital: "Imphal", lat: 24.8170, lng: 93.9368 },
  { id: "MZ", name: "Mizoram", capital: "Aizawl", lat: 23.7271, lng: 92.7176 },
  { id: "TR", name: "Tripura", capital: "Agartala", lat: 23.8315, lng: 91.2868 },
  { id: "AR", name: "Arunachal Pradesh", capital: "Itanagar", lat: 27.0844, lng: 93.6053 },
  { id: "WB", name: "West Bengal (Siliguri Gate)", capital: "Siliguri", lat: 26.7271, lng: 88.3953 }
];

const CORRIDORS = [
  {
    id: "CORR-NH27",
    name: "NH-27 Siliguri - Guwahati Lifeline",
    code: "NH-27",
    origin: "Siliguri",
    destination: "Guwahati",
    state: "Assam / WB",
    distance_km: 472.0,
    status: "OPEN",
    risk_score: 0.12,
    current_speed: 62.0,
    baseline_speed: 65.0,
    rainfall_mm: 8.5,
    rainfall_trend: "STABLE",
    slope_deg: 4.5,
    historical_incidents: 4,
    coords: [
      [88.43, 26.72],
      [89.10, 26.65],
      [89.85, 26.50],
      [90.45, 26.42],
      [91.10, 26.35],
      [91.75, 26.15]
    ]
  },
  {
    id: "CORR-NH10",
    name: "NH-10 Siliguri - Gangtok (Teesta Valley)",
    code: "NH-10",
    origin: "Siliguri",
    destination: "Gangtok",
    state: "Sikkim",
    distance_km: 114.0,
    status: "AT_RISK",
    risk_score: 0.74,
    current_speed: 28.0,
    baseline_speed: 45.0,
    rainfall_mm: 72.0,
    rainfall_trend: "RISING",
    slope_deg: 29.5,
    historical_incidents: 19,
    coords: [
      [88.44, 26.73],
      [88.46, 26.90],
      [88.48, 27.05],
      [88.52, 27.18],
      [88.60, 27.33]
    ]
  },
  {
    id: "CORR-NH29",
    name: "NH-29 Dimapur - Kohima - Imphal Arterial",
    code: "NH-29",
    origin: "Dimapur",
    destination: "Imphal",
    state: "Nagaland / Manipur",
    distance_km: 216.0,
    status: "AT_RISK",
    risk_score: 0.68,
    current_speed: 24.0,
    baseline_speed: 42.0,
    rainfall_mm: 54.0,
    rainfall_trend: "RISING",
    slope_deg: 26.0,
    historical_incidents: 15,
    coords: [
      [93.73, 25.90],
      [93.85, 25.80],
      [94.11, 25.67],
      [94.18, 25.40],
      [94.02, 25.08],
      [93.94, 24.82]
    ]
  },
  {
    id: "CORR-NH06",
    name: "NH-06 Guwahati - Shillong - Silchar",
    code: "NH-06",
    origin: "Guwahati",
    destination: "Silchar",
    state: "Meghalaya / Assam",
    distance_km: 308.0,
    status: "OPEN",
    risk_score: 0.22,
    current_speed: 48.0,
    baseline_speed: 50.0,
    rainfall_mm: 18.0,
    rainfall_trend: "STABLE",
    slope_deg: 18.0,
    historical_incidents: 7,
    coords: [
      [91.75, 26.15],
      [91.89, 25.58],
      [92.20, 25.45],
      [92.38, 25.15],
      [92.80, 24.82]
    ]
  },
  {
    id: "CORR-NH37",
    name: "NH-37 Guwahati - Kaziranga - Dibrugarh",
    code: "NH-37",
    origin: "Guwahati",
    destination: "Dibrugarh",
    state: "Assam",
    distance_km: 442.0,
    status: "OPEN",
    risk_score: 0.15,
    current_speed: 55.0,
    baseline_speed: 60.0,
    rainfall_mm: 12.0,
    rainfall_trend: "STABLE",
    slope_deg: 3.5,
    historical_incidents: 5,
    coords: [
      [91.75, 26.15],
      [92.65, 26.55],
      [93.40, 26.60],
      [94.20, 26.75],
      [94.91, 27.48]
    ]
  },
  {
    id: "CORR-NH15",
    name: "NH-15 North Bank (Tezpur - North Lakhimpur - Pasighat)",
    code: "NH-15",
    origin: "Tezpur",
    destination: "Pasighat",
    state: "Assam / Arunachal",
    distance_km: 345.0,
    status: "OPEN",
    risk_score: 0.18,
    current_speed: 50.0,
    baseline_speed: 55.0,
    rainfall_mm: 16.0,
    rainfall_trend: "STABLE",
    slope_deg: 7.0,
    historical_incidents: 6,
    coords: [
      [92.80, 26.65],
      [93.65, 26.90],
      [94.10, 27.23],
      [94.60, 27.60],
      [95.33, 28.07]
    ]
  },
  {
    id: "CORR-NH13",
    name: "NH-13 Trans-Arunachal (Pasighat - Roing - Tezu)",
    code: "NH-13",
    origin: "Pasighat",
    destination: "Tezu",
    state: "Arunachal Pradesh",
    distance_km: 198.0,
    status: "AT_RISK",
    risk_score: 0.45,
    current_speed: 34.0,
    baseline_speed: 45.0,
    rainfall_mm: 38.0,
    rainfall_trend: "RISING",
    slope_deg: 24.0,
    historical_incidents: 11,
    coords: [
      [95.33, 28.07],
      [95.83, 28.14],
      [96.17, 27.92]
    ]
  },
  {
    id: "CORR-NH102",
    name: "NH-102 Imphal - Moreh Border Highway",
    code: "NH-102",
    origin: "Imphal",
    destination: "Moreh",
    state: "Manipur",
    distance_km: 107.0,
    status: "OPEN",
    risk_score: 0.25,
    current_speed: 42.0,
    baseline_speed: 45.0,
    rainfall_mm: 14.0,
    rainfall_trend: "STABLE",
    slope_deg: 16.0,
    historical_incidents: 8,
    coords: [
      [93.94, 24.82],
      [94.02, 24.50],
      [94.20, 24.30],
      [94.30, 24.25]
    ]
  },
  {
    id: "CORR-NH306",
    name: "NH-306 Silchar - Kolasib - Aizawl Arterial",
    code: "NH-306",
    origin: "Silchar",
    destination: "Aizawl",
    state: "Assam / Mizoram",
    distance_km: 165.0,
    status: "OPEN",
    risk_score: 0.28,
    current_speed: 36.0,
    baseline_speed: 40.0,
    rainfall_mm: 22.0,
    rainfall_trend: "STABLE",
    slope_deg: 21.0,
    historical_incidents: 9,
    coords: [
      [92.80, 24.82],
      [92.70, 24.35],
      [92.68, 24.22],
      [92.72, 23.73]
    ]
  },
  {
    id: "CORR-NH208",
    name: "NH-208 Silchar - Kailashahar - Agartala",
    code: "NH-208",
    origin: "Silchar",
    destination: "Agartala",
    state: "Assam / Tripura",
    distance_km: 260.0,
    status: "OPEN",
    risk_score: 0.16,
    current_speed: 48.0,
    baseline_speed: 52.0,
    rainfall_mm: 10.0,
    rainfall_trend: "STABLE",
    slope_deg: 8.0,
    historical_incidents: 3,
    coords: [
      [92.80, 24.82],
      [92.05, 24.33],
      [91.60, 24.05],
      [91.28, 23.83]
    ]
  },
  {
    id: "CORR-NH310",
    name: "NH-310 Gangtok - Nathu La Border Route",
    code: "NH-310",
    origin: "Gangtok",
    destination: "Nathu La",
    state: "Sikkim",
    distance_km: 54.0,
    status: "AT_RISK",
    risk_score: 0.52,
    current_speed: 25.0,
    baseline_speed: 35.0,
    rainfall_mm: 42.0,
    rainfall_trend: "RISING",
    slope_deg: 32.0,
    historical_incidents: 14,
    coords: [
      [88.60, 27.33],
      [88.72, 27.36],
      [88.83, 27.38]
    ]
  },
  {
    id: "CORR-NH702",
    name: "NH-702 Mokokchung - Mariani Link",
    code: "NH-702",
    origin: "Mariani",
    destination: "Mokokchung",
    state: "Assam / Nagaland",
    distance_km: 85.0,
    status: "OPEN",
    risk_score: 0.30,
    current_speed: 32.0,
    baseline_speed: 38.0,
    rainfall_mm: 20.0,
    rainfall_trend: "STABLE",
    slope_deg: 22.0,
    historical_incidents: 5,
    coords: [
      [94.33, 26.65],
      [94.42, 26.45],
      [94.52, 26.32]
    ]
  },
  {
    id: "CORR-NH127B",
    name: "NH-127B Dhubri - Phulbari Transit",
    code: "NH-127B",
    origin: "Dhubri",
    destination: "Phulbari",
    state: "Assam / Meghalaya",
    distance_km: 72.0,
    status: "OPEN",
    risk_score: 0.19,
    current_speed: 46.0,
    baseline_speed: 50.0,
    rainfall_mm: 15.0,
    rainfall_trend: "STABLE",
    slope_deg: 5.0,
    historical_incidents: 4,
    coords: [
      [89.98, 26.02],
      [90.04, 25.88],
      [90.10, 25.75]
    ]
  },
  {
    id: "CORR-NH217",
    name: "NH-217 Tura - Dalu Garo Hills Highway",
    code: "NH-217",
    origin: "Tura",
    destination: "Dalu",
    state: "Meghalaya",
    distance_km: 68.0,
    status: "OPEN",
    risk_score: 0.24,
    current_speed: 38.0,
    baseline_speed: 42.0,
    rainfall_mm: 25.0,
    rainfall_trend: "STABLE",
    slope_deg: 17.0,
    historical_incidents: 6,
    coords: [
      [90.22, 25.51],
      [90.25, 25.35],
      [90.23, 25.20]
    ]
  },
  {
    id: "CORR-NH415",
    name: "NH-415 Banderdewa - Itanagar Capital Corridor",
    code: "NH-415",
    origin: "Banderdewa",
    destination: "Itanagar",
    state: "Arunachal Pradesh",
    distance_km: 42.0,
    status: "OPEN",
    risk_score: 0.20,
    current_speed: 40.0,
    baseline_speed: 45.0,
    rainfall_mm: 22.0,
    rainfall_trend: "STABLE",
    slope_deg: 16.0,
    historical_incidents: 5,
    coords: [
      [93.82, 27.13],
      [93.70, 27.10],
      [93.61, 27.08]
    ]
  },
  {
    id: "CORR-NH17",
    name: "NH-17 Guwahati - Goalpara South Bank",
    code: "NH-17",
    origin: "Guwahati",
    destination: "Goalpara",
    state: "Assam",
    distance_km: 130.0,
    status: "OPEN",
    risk_score: 0.14,
    current_speed: 55.0,
    baseline_speed: 58.0,
    rainfall_mm: 9.0,
    rainfall_trend: "STABLE",
    slope_deg: 4.0,
    historical_incidents: 3,
    coords: [
      [91.75, 26.15],
      [91.20, 26.10],
      [90.62, 26.17]
    ]
  }
];

const GLACIAL_LAKES = [
  {
    id: "LAKE-SLHONAK",
    name: "South Lhonak Glacial Lake",
    state: "Sikkim",
    basin: "Teesta River Basin",
    lat: 27.9150,
    lng: 88.2040,
    elevation_m: 5200,
    area_sq_km: 1.68,
    growth_rate_pct: 34.2,
    moraine_stability: "UNSTABLE_PERMAFROST",
    monitoring_status: "CRITICAL_ALERT",
    downstream_corridor_id: "CORR-NH10",
    description: "High altitude proglacial lake in Chungthang catchment. Site of October 2023 catastrophic GLOF and NDMA high-risk priority.",
    polygon_coordinates: [
      [88.195, 27.910],
      [88.215, 27.910],
      [88.220, 27.925],
      [88.200, 27.928],
      [88.195, 27.910]
    ]
  },
  {
    id: "LAKE-DIBANG",
    name: "Upper Dibang Cirque Lake",
    state: "Arunachal Pradesh",
    basin: "Dibang River Basin",
    lat: 28.9500,
    lng: 95.8200,
    elevation_m: 4620,
    area_sq_km: 0.94,
    growth_rate_pct: 18.5,
    moraine_stability: "MODERATE",
    monitoring_status: "WATCH",
    downstream_corridor_id: "CORR-NH13",
    description: "NDMA flagged proglacial expansion lake in eastern Himalayan zone.",
    polygon_coordinates: [
      [95.810, 28.940],
      [95.830, 28.940],
      [95.835, 28.955],
      [95.815, 28.958],
      [95.810, 28.940]
    ]
  }
];

const RISK_ZONES = [
  {
    id: "ZONE-TEESTA-GLOF",
    corridor_id: "CORR-NH10",
    name: "Teesta Basin Flash Flood & GLOF Cascade Path",
    type: "GLOF_PATH",
    severity: "CRITICAL",
    polygon_coordinates: [
      [88.42, 26.85],
      [88.62, 26.85],
      [88.65, 27.35],
      [88.38, 27.35],
      [88.42, 26.85]
    ],
    source: "SIMULATED_CRYOSPHERE_MODEL"
  },
  {
    id: "ZONE-PAGLA-PAHAR",
    corridor_id: "CORR-NH29",
    name: "Pagla Pahar Active Landslide Shear Zone",
    type: "LANDSLIDE_PRONE",
    severity: "HIGH",
    polygon_coordinates: [
      [93.80, 25.72],
      [94.05, 25.72],
      [94.05, 25.86],
      [93.80, 25.86],
      [93.80, 25.72]
    ],
    source: "GEOLOGICAL_SLOPE_ANALYSIS"
  },
  {
    id: "ZONE-SONAPUR-TUNNEL",
    corridor_id: "CORR-NH06",
    name: "Sonapur Jaintia Mudslide Hazard Zone",
    type: "LANDSLIDE_PRONE",
    severity: "MEDIUM",
    polygon_coordinates: [
      [92.30, 25.10],
      [92.48, 25.10],
      [92.48, 25.25],
      [92.30, 25.25],
      [92.30, 25.10]
    ],
    source: "PRECIPITATION_SENSOR_ARRAY"
  }
];

const VEHICLES = [
  {
    id: "NL-MED-01",
    plate_number: "AS-01-GC-4412",
    operator: "Assam Health Logistics Directorate",
    type: "MEDICAL",
    status: "ACTIVE",
    corridor_id: "CORR-NH27",
    current_lat: 26.42,
    current_lng: 90.45,
    current_speed: 61.5,
    heading: 85.0,
    cargo_summary: "Life-saving emergency pediatric antibiotics and insulin supply"
  },
  {
    id: "NL-RAT-04",
    plate_number: "NL-07-T-8819",
    operator: "FCI North East Movement Division",
    type: "ESSENTIAL_RATIONS",
    status: "ACTIVE",
    corridor_id: "CORR-NH29",
    current_lat: 25.82,
    current_lng: 93.88,
    current_speed: 21.0,
    heading: 120.0,
    cargo_summary: "18 metric tonnes grain convoys for Kohima distribution"
  },
  {
    id: "NL-POL-09",
    plate_number: "SK-04-A-1102",
    operator: "Indian Oil Corp Hill Fleet",
    type: "FUEL",
    status: "IN_RISK_ZONE",
    corridor_id: "CORR-NH10",
    current_lat: 27.05,
    current_lng: 88.48,
    current_speed: 24.0,
    heading: 35.0,
    cargo_summary: "12,000L aviation & emergency generator diesel"
  },
  {
    id: "NL-OXY-02",
    plate_number: "ML-05-D-3209",
    operator: "Meghalaya Disaster Relief Cell",
    type: "DISASTER_RESPONSE",
    status: "ACTIVE",
    corridor_id: "CORR-NH06",
    current_lat: 25.58,
    current_lng: 91.89,
    current_speed: 46.0,
    heading: 110.0,
    cargo_summary: "Portable water purifiers & SATCOM communication kits"
  },
  {
    id: "NL-RAT-11",
    plate_number: "MN-01-B-6721",
    operator: "Manipur State Transport Civil Supply",
    type: "ESSENTIAL_RATIONS",
    status: "ACTIVE",
    corridor_id: "CORR-NH102",
    current_lat: 24.50,
    current_lng: 94.02,
    current_speed: 41.0,
    heading: 145.0,
    cargo_summary: "Emergency infant milk powder & food packs"
  }
];

const INITIAL_INCIDENTS = [
  {
    id: "INC-2026-001",
    type: "LANDSLIDE",
    corridor_id: "CORR-NH29",
    lat: 25.75,
    lng: 93.82,
    description: "Sludge displacement and debris across 80m of roadway near Pagla Pahar curve. Heavy vehicle passage restricted.",
    severity: "HIGH",
    source: "FIELD_OFFICER_OFFLINE_SYNC",
    sync_status: "SYNCED"
  },
  {
    id: "INC-2026-002",
    type: "ROAD_EROSION",
    corridor_id: "CORR-NH10",
    lat: 27.18,
    lng: 88.52,
    description: "River Teesta undercut lower foundation embankment. Single lane convoy regulation in place.",
    severity: "HIGH",
    source: "FIELD_OFFICER_OFFLINE_SYNC",
    sync_status: "SYNCED"
  }
];

const INITIAL_ALERTS = [
  {
    id: "ALT-2026-001",
    type: "RISK_SPIKE",
    severity: "WARNING",
    corridor_id: "CORR-NH10",
    title: "Teesta Valley Rainfall Surge & Saturated Slope",
    message: "Rainfall exceeds 70mm/24hr threshold on NH-10. Disruption probability evaluated at 74%. Alternate routing via Lava/Algarah advised.",
    translations: {
      en: "Rainfall exceeds 70mm/24hr threshold on NH-10. Disruption probability evaluated at 74%.",
      as: "NH-10ত ২৪ ঘণ্টাত ৭০ মিলিমিটাৰৰ অধিক বৰষুণ। বিঘ্ন ঘটাৰ সম্ভাৱনা ৭৪%। লাভা হৈ বিকল্প পথ গ্ৰহণ কৰক।",
      hi: "NH-10 पर वर्षा 70 मिमी से अधिक। 74% व्यवधान जोखिम। कृपया लावा होकर वैकल्पिक मार्ग लें।"
    },
    recipients: "ALL_CIVIL_AND_LOGISTICS_TEAMS",
    status: "DISPATCHED"
  },
  {
    id: "ALT-2026-002",
    type: "GEOFENCE_BREACH",
    severity: "CRITICAL",
    corridor_id: "CORR-NH10",
    title: "Vehicle NL-POL-09 Entered High Risk Slope Sector",
    message: "Fuel transport vehicle NL-POL-09 detected inside active hazard polygon on NH-10. Automated safety telematics triggered.",
    translations: {
      en: "Fuel transport vehicle NL-POL-09 detected inside active hazard polygon on NH-10.",
      as: "ইন্ধন বাহন NL-POL-09 NH-10 ৰ বিপদজনক অঞ্চলত প্ৰৱেশ কৰিছে।",
      hi: "ईंधन वाहन NL-POL-09 NH-10 के जोखिम क्षेत्र में प्रवेश कर चुका है।"
    },
    recipients: "ALL_CIVIL_AND_LOGISTICS_TEAMS",
    status: "DISPATCHED"
  }
];

async function seed() {
  if (process.env.APP_MODE === "production" || process.env.ALLOW_DEMO_RESET !== "true")
    throw new Error("Demo reset requires ALLOW_DEMO_RESET=true and is forbidden in production.");
  console.log("Starting NECKLINK Database Seeding...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clean existing records if any
    console.log("Cleaning old tables...");
    await client.query(`
      TRUNCATE TABLE vehicle_location, vehicle, incident, alert, lake_observation, glacial_lake, risk_zone, corridor, district, state, seismic_event, route_cache CASCADE;
    `);

    // 1. States
    console.log("Seeding States...");
    for (const s of STATES) {
      await client.query(
        `INSERT INTO state (id, name, capital, center_lat, center_lng)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [s.id, s.name, s.capital, s.lat, s.lng]
      );
    }

    // 2. Corridors
    console.log("Seeding Corridors with GeoJSON LineStrings...");
    for (const c of CORRIDORS) {
      const lineStringWKT = `LINESTRING(${c.coords.map(pt => `${pt[0]} ${pt[1]}`).join(", ")})`;
      await client.query(
        `INSERT INTO corridor (
          id, name, code, origin, destination, state, distance_km, status,
          risk_score, current_speed, baseline_speed, rainfall_mm, rainfall_trend,
          slope_deg, historical_incidents, geometry, path_coordinates
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, ST_GeomFromText($16, 4326), $17
        )`,
        [
          c.id, c.name, c.code, c.origin, c.destination, c.state, c.distance_km, c.status,
          c.risk_score, c.current_speed, c.baseline_speed, c.rainfall_mm, c.rainfall_trend,
          c.slope_deg, c.historical_incidents, lineStringWKT, JSON.stringify(c.coords)
        ]
      );
    }

    // 3. Glacial Lakes
    console.log("Seeding Glacial Lakes...");
    for (const l of GLACIAL_LAKES) {
      const polyWKT = `POLYGON((${l.polygon_coordinates.map(pt => `${pt[0]} ${pt[1]}`).join(", ")}))`;
      await client.query(
        `INSERT INTO glacial_lake (
          id, name, state, basin, lat, lng, elevation_m, area_sq_km,
          growth_rate_pct, moraine_stability, monitoring_status,
          downstream_corridor_id, geometry, polygon_coordinates, description
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11,
          $12, ST_GeomFromText($13, 4326), $14, $15
        )`,
        [
          l.id, l.name, l.state, l.basin, l.lat, l.lng, l.elevation_m, l.area_sq_km,
          l.growth_rate_pct, l.moraine_stability, l.monitoring_status,
          l.downstream_corridor_id, polyWKT, JSON.stringify(l.polygon_coordinates), l.description
        ]
      );

      // Add satellite observations
      await client.query(
        `INSERT INTO lake_observation (lake_id, observation_date, estimated_area_sq_km, source, image_ref)
         VALUES ($1, '2023-09-28', 1.42, 'SENTINEL_2_OPTICAL', 'assets/satellite/lhonak_pre_surge.webp'),
                ($1, '2023-10-04', 1.68, 'SENTINEL_2_OPTICAL', 'assets/satellite/lhonak_post_surge.webp')`,
        [l.id]
      );
    }

    // 4. Risk Zones
    console.log("Seeding Risk Zones...");
    for (const r of RISK_ZONES) {
      const polyWKT = `POLYGON((${r.polygon_coordinates.map(pt => `${pt[0]} ${pt[1]}`).join(", ")}))`;
      await client.query(
        `INSERT INTO risk_zone (
          id, corridor_id, name, type, severity, geometry, polygon_coordinates, source
        ) VALUES (
          $1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), $7, $8
        )`,
        [r.id, r.corridor_id, r.name, r.type, r.severity, polyWKT, JSON.stringify(r.polygon_coordinates), r.source]
      );
    }

    // 5. Vehicles
    console.log("Seeding Vehicles...");
    for (const v of VEHICLES) {
      const pointWKT = `POINT(${v.current_lng} ${v.current_lat})`;
      await client.query(
        `INSERT INTO vehicle (
          id, plate_number, operator, type, status, corridor_id,
          current_lat, current_lng, current_speed, heading, geometry, cargo_summary
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, ST_GeomFromText($11, 4326), $12
        )`,
        [
          v.id, v.plate_number, v.operator, v.type, v.status, v.corridor_id,
          v.current_lat, v.current_lng, v.current_speed, v.heading, pointWKT, v.cargo_summary
        ]
      );

      await client.query(
        `INSERT INTO vehicle_location (vehicle_id, lat, lng, speed, heading)
         VALUES ($1, $2, $3, $4, $5)`,
        [v.id, v.current_lat, v.current_lng, v.current_speed, v.heading]
      );
    }

    // 6. Incidents
    console.log("Seeding Initial Incidents...");
    for (const inc of INITIAL_INCIDENTS) {
      await client.query(
        `INSERT INTO incident (
          id, type, corridor_id, lat, lng, description, severity, source, sync_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )`,
        [inc.id, inc.type, inc.corridor_id, inc.lat, inc.lng, inc.description, inc.severity, inc.source, inc.sync_status]
      );
    }

    // 7. Alerts
    console.log("Seeding Initial Alerts...");
    for (const a of INITIAL_ALERTS) {
      await client.query(
        `INSERT INTO alert (
          id, type, severity, corridor_id, title, message, translations, recipients, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )`,
        [a.id, a.type, a.severity, a.corridor_id, a.title, a.message, JSON.stringify(a.translations), a.recipients, a.status]
      );
    }

    await client.query("COMMIT");
    console.log("Seeding completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

-- NECKLINK Core Schema Definition
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. States & Districts
CREATE TABLE IF NOT EXISTS state (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capital VARCHAR(100),
    center_lat NUMERIC,
    center_lng NUMERIC,
    geometry GEOMETRY(MultiPolygon, 4326)
);

CREATE TABLE IF NOT EXISTS district (
    id VARCHAR(64) PRIMARY KEY,
    state_id VARCHAR(32) REFERENCES state(id),
    name VARCHAR(100) NOT NULL,
    geometry GEOMETRY(MultiPolygon, 4326)
);

-- 2. Corridors & Road Segments
CREATE TABLE IF NOT EXISTS corridor (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    origin VARCHAR(100),
    destination VARCHAR(100),
    state VARCHAR(50),
    distance_km NUMERIC NOT NULL,
    status VARCHAR(30) DEFAULT 'OPEN', -- OPEN, AT_RISK, BLOCKED, GLOF_ALERT
    risk_score NUMERIC DEFAULT 0.15, -- 0.00 to 1.00
    current_speed NUMERIC DEFAULT 45.0,
    baseline_speed NUMERIC DEFAULT 50.0,
    rainfall_mm NUMERIC DEFAULT 0.0,
    rainfall_trend VARCHAR(20) DEFAULT 'STABLE', -- RISING, STABLE, FALLING
    slope_deg NUMERIC DEFAULT 14.5,
    historical_incidents INTEGER DEFAULT 2,
    geometry GEOMETRY(LineString, 4326),
    path_coordinates JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Risk Zones
CREATE TABLE IF NOT EXISTS risk_zone (
    id VARCHAR(64) PRIMARY KEY,
    corridor_id VARCHAR(64) REFERENCES corridor(id),
    name VARCHAR(150),
    type VARCHAR(50) NOT NULL, -- LANDSLIDE_PRONE, FLOOD_PLAIN, GLOF_PATH, ROCKFALL
    severity VARCHAR(30) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    geometry GEOMETRY(Polygon, 4326),
    polygon_coordinates JSONB,
    source VARCHAR(50) DEFAULT 'SIMULATED_EARLY_WARNING',
    active_from TIMESTAMPTZ DEFAULT NOW(),
    active_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vehicles
CREATE TABLE IF NOT EXISTS vehicle (
    id VARCHAR(64) PRIMARY KEY,
    plate_number VARCHAR(50) NOT NULL,
    operator VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- MEDICAL, ESSENTIAL_RATIONS, FUEL, DISASTER_RESPONSE
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, IN_RISK_ZONE, STOPPED, DELAYED
    corridor_id VARCHAR(64) REFERENCES corridor(id),
    current_lat NUMERIC NOT NULL,
    current_lng NUMERIC NOT NULL,
    current_speed NUMERIC DEFAULT 45.0,
    heading NUMERIC DEFAULT 90.0,
    geometry GEOMETRY(Point, 4326),
    cargo_summary VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_location (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(64) REFERENCES vehicle(id) ON DELETE CASCADE,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    speed NUMERIC NOT NULL,
    heading NUMERIC DEFAULT 0.0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Incidents
CREATE TABLE IF NOT EXISTS incident (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- LANDSLIDE, FLASH_FLOOD, BRIDGE_DAMAGE, MUDSLIDE, GLOF_SURGE
    corridor_id VARCHAR(64) REFERENCES corridor(id),
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    description TEXT,
    severity VARCHAR(30) DEFAULT 'HIGH', -- MODERATE, HIGH, CRITICAL
    source VARCHAR(50) DEFAULT 'FIELD_OFFICER_OFFLINE_SYNC', -- FIELD_OFFICER, CITIZEN, AUTOMATED
    image_ref TEXT,
    sync_status VARCHAR(20) DEFAULT 'SYNCED', -- SYNCED, QUEUED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Alerts
CREATE TABLE IF NOT EXISTS alert (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- RISK_SPIKE, GEOFENCE_BREACH, GLOF_SURGE, SPEED_ANOMALY, FIELD_INCIDENT
    severity VARCHAR(30) NOT NULL, -- ADVISORY, WARNING, CRITICAL, EMERGENCY
    corridor_id VARCHAR(64),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    translations JSONB DEFAULT '{}', -- translations for Assamese, Hindi, Khasi, Mizo, Manipuri, Bodo
    recipients VARCHAR(100) DEFAULT 'ALL_CIVIL_AND_LOGISTICS_TEAMS',
    status VARCHAR(30) DEFAULT 'DISPATCHED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Glacial Lakes & Cryosphere
CREATE TABLE IF NOT EXISTS glacial_lake (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(50) NOT NULL,
    basin VARCHAR(100),
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    elevation_m NUMERIC,
    area_sq_km NUMERIC,
    growth_rate_pct NUMERIC,
    moraine_stability VARCHAR(50),
    monitoring_status VARCHAR(30) DEFAULT 'WATCH', -- WATCH, HIGH_RISK, CRITICAL_ALERT
    downstream_corridor_id VARCHAR(64) REFERENCES corridor(id),
    geometry GEOMETRY(Polygon, 4326),
    polygon_coordinates JSONB,
    description TEXT
);

CREATE TABLE IF NOT EXISTS lake_observation (
    id SERIAL PRIMARY KEY,
    lake_id VARCHAR(64) REFERENCES glacial_lake(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    estimated_area_sq_km NUMERIC NOT NULL,
    source VARCHAR(50) DEFAULT 'SENTINEL_2_MOCK',
    image_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Seismic Events
CREATE TABLE IF NOT EXISTS seismic_event (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    depth_km NUMERIC NOT NULL,
    magnitude NUMERIC NOT NULL,
    classification VARCHAR(100) DEFAULT 'ICE_ROCK_COLLAPSE_CASCADE',
    downstream_impact TEXT,
    simulated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Route Requests & Results
CREATE TABLE IF NOT EXISTS route_cache (
    id VARCHAR(64) PRIMARY KEY,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    distance_km NUMERIC NOT NULL,
    eta_hours NUMERIC NOT NULL,
    risk_score NUMERIC NOT NULL,
    path JSONB NOT NULL,
    alternatives JSONB,
    is_rerouted BOOLEAN DEFAULT FALSE,
    reroute_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for spatial fast lookup
CREATE INDEX IF NOT EXISTS idx_corridor_geom ON corridor USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_risk_zone_geom ON risk_zone USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_vehicle_geom ON vehicle USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_lake_geom ON glacial_lake USING GIST (geometry);

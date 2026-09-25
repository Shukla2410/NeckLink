-- Additive operational layer: existing corridor / vehicle / incident records are preserved.
ALTER TABLE corridor ADD COLUMN IF NOT EXISTS max_weight_tonnes NUMERIC;
ALTER TABLE corridor ADD COLUMN IF NOT EXISTS status_source TEXT DEFAULT 'DEMO';
ALTER TABLE incident ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'SUBMITTED';
ALTER TABLE incident ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE incident ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS accuracy_m NUMERIC;
ALTER TABLE alert ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE alert ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');
ALTER TABLE alert ALTER COLUMN status SET DEFAULT 'CREATED';
CREATE TABLE IF NOT EXISTS bridge (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, corridor_id VARCHAR(64) REFERENCES corridor(id),
 status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESTRICTED','CLOSED')),
 max_weight_tonnes NUMERIC CHECK(max_weight_tonnes > 0), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS district_connection (
 district_id VARCHAR(64) REFERENCES district(id), corridor_id VARCHAR(64) REFERENCES corridor(id),
 hub TEXT NOT NULL, PRIMARY KEY(district_id,corridor_id)
);
CREATE TABLE IF NOT EXISTS facility (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, district_id VARCHAR(64) REFERENCES district(id),
 type TEXT NOT NULL, hub TEXT NOT NULL, lat NUMERIC, lng NUMERIC, source TEXT DEFAULT 'DEMO'
);
CREATE TABLE IF NOT EXISTS inventory (
 facility_id TEXT REFERENCES facility(id), commodity TEXT NOT NULL, quantity NUMERIC NOT NULL CHECK(quantity>=0),
 daily_usage NUMERIC NOT NULL CHECK(daily_usage>0), unit TEXT DEFAULT 'units', updated_at TIMESTAMPTZ DEFAULT NOW(),
 PRIMARY KEY(facility_id,commodity)
);
CREATE TABLE IF NOT EXISTS shipment (
 id TEXT PRIMARY KEY, vehicle_id VARCHAR(64) REFERENCES vehicle(id), facility_id TEXT REFERENCES facility(id),
 origin TEXT NOT NULL, destination TEXT NOT NULL, cargo TEXT NOT NULL, quantity NUMERIC NOT NULL CHECK(quantity>0),
 unit TEXT DEFAULT 'boxes', priority TEXT DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL','HIGH','URGENT')),
 status TEXT DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','DISPATCHED','IN_TRANSIT','DELAYED','DELIVERED')),
 deadline TIMESTAMPTZ, expected_arrival TIMESTAMPTZ, delivery_note TEXT, delivered_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weather_observation (
 id BIGSERIAL PRIMARY KEY, corridor_id VARCHAR(64) REFERENCES corridor(id), observed_at TIMESTAMPTZ NOT NULL,
 rainfall_24h_mm NUMERIC, forecast_24h_mm NUMERIC, source TEXT NOT NULL, payload JSONB,
 UNIQUE(corridor_id,observed_at,source)
);
CREATE TABLE IF NOT EXISTS notification_subscription (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, language TEXT DEFAULT 'en', corridor_id VARCHAR(64),
 enabled BOOLEAN DEFAULT TRUE, push_subscription JSONB
);
CREATE TABLE IF NOT EXISTS notification_delivery (
 id BIGSERIAL PRIMARY KEY, alert_id VARCHAR(64) REFERENCES alert(id), subscription_id TEXT REFERENCES notification_subscription(id),
 channel TEXT NOT NULL, status TEXT DEFAULT 'QUEUED', attempts INT DEFAULT 0, next_attempt TIMESTAMPTZ DEFAULT NOW(),
 provider_id TEXT, error TEXT, updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(alert_id,subscription_id,channel)
);
CREATE TABLE IF NOT EXISTS audit_event (
 id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vehicle_location_recent ON vehicle_location(vehicle_id,timestamp DESC);
CREATE INDEX IF NOT EXISTS incident_corridor_time ON incident(corridor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notification_delivery_due ON notification_delivery(status,next_attempt);

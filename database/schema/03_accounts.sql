CREATE TABLE IF NOT EXISTS app_user (
 id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','dispatcher','field','driver')),
 password_hash TEXT NOT NULL, vehicle_id VARCHAR(64) REFERENCES vehicle(id), enabled BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_session (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS app_session_expiry ON app_session(expires_at);

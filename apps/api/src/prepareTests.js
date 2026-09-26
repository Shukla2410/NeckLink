import "dotenv/config";
import pg from "pg";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated database ending in _test",
  );
const parsed = new URL(url);
const database = parsed.pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(database))
  throw new Error("Use a simple test database name");
parsed.pathname = "/postgres";
const pool = new pg.Pool({ connectionString: parsed.href });
try {
  if (
    !(
      await pool.query("SELECT 1 FROM pg_database WHERE datname=$1", [database])
    ).rows.length
  )
    await pool.query(`CREATE DATABASE "${database}"`);
} finally {
  await pool.end();
}
for (const file of ["migrate.js", "seed.js", "seedOperations.js"]) {
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(file, import.meta.url))],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: url,
        ALLOW_DEMO_RESET: "true",
        DISABLE_EXTERNAL_DELIVERY: "true",
      },
    },
  );
  if (child.status !== 0) process.exit(child.status || 1);
}

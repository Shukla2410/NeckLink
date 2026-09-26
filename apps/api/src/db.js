import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const databaseUrl =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;
if (
  process.env.NODE_ENV === "test" &&
  (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test"))
)
  throw new Error(
    "Tests require TEST_DATABASE_URL pointing to a database ending in _test",
  );

export const pool = new Pool({
  connectionString:
    databaseUrl || "postgresql://postgres:postgres@localhost:5432/necklink",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const query = (text, params) => pool.query(text, params);

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();
dotenv.config({ path: new URL("../.env", import.meta.url) });

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

const isLocalDb =
  !databaseUrl ||
  databaseUrl.includes("localhost") ||
  databaseUrl.includes("127.0.0.1") ||
  databaseUrl.includes("@postgres:");

const ssl =
  process.env.DATABASE_SSL === "true" ||
  (!isLocalDb && process.env.DATABASE_SSL !== "false")
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = new Pool({
  connectionString:
    databaseUrl || "postgresql://postgres:postgres@localhost:5432/necklink",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(ssl ? { ssl } : {}),
});

export const query = (text, params) => pool.query(text, params);

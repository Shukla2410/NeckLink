import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
const folder = new URL("../../../database/schema/", import.meta.url);
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const name of (await readdir(folder))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    await client.query(await readFile(new URL(name, folder), "utf8"));
    console.log("Applied", name);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

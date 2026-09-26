import dotenv from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { pool } from "./db.js";

dotenv.config();
dotenv.config({ path: new URL("../.env", import.meta.url) });

export async function runMigrations() {
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
    console.error("Migration error:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("migrate.js")) {
  runMigrations()
    .then(() => pool.end())
    .catch(() => {
      process.exitCode = 1;
    });
}

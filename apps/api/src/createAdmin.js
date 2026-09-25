import "dotenv/config";
import { createUser } from "./services/accounts.js";
import { pool } from "./db.js";
try {
  await createUser({
    username: process.env.ADMIN_USERNAME || "admin",
    display_name: "Administrator",
    role: "admin",
    password: process.env.ADMIN_PASSWORD,
  });
  console.log(
    "Administrator account created. Sign in with the username and password you configured.",
  );
} catch (e) {
  console.error(
    e.code === "23505"
      ? "Administrator already exists; existing password unchanged."
      : e.message,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}

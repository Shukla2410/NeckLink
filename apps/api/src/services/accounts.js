import {
  scrypt as scryptCallback,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { query } from "../db.js";
const scrypt = promisify(scryptCallback);
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const [salt, hex] = encoded.split(":");
  const hash = await scrypt(String(password || ""), salt, 64);
  return timingSafeEqual(hash, Buffer.from(hex, "hex"));
}
export async function createUser({
  username,
  display_name,
  role,
  password,
  vehicle_id,
}) {
  if (
    !/^[a-zA-Z0-9_.-]{3,60}$/.test(username || "") ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 200 ||
    !["admin", "dispatcher", "field", "driver"].includes(role) ||
    !display_name
  )
    throw Object.assign(
      new Error(
        "Use a username of 3–60 letters/numbers and a password of at least 12 characters.",
      ),
      { status: 400 },
    );
  if (role === "driver" && !vehicle_id)
    throw Object.assign(new Error("Assign a vehicle to a driver account"), {
      status: 400,
    });
  const user = await query(
    "INSERT INTO app_user(id,username,display_name,role,password_hash,vehicle_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,username,display_name,role,vehicle_id",
    [
      randomUUID(),
      username.toLowerCase(),
      display_name,
      role,
      await passwordHash(password),
      vehicle_id || null,
    ],
  );
  return user.rows[0];
}
export async function lookupSession(req) {
  const token = req.headers.cookie?.match(
    /(?:^|;\s*)necklink_session=([^;]+)/,
  )?.[1];
  if (!token) return null;
  return (
    (
      await query(
        `SELECT u.id,u.username,u.display_name,u.role,u.vehicle_id FROM app_session s JOIN app_user u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.enabled`,
        [tokenHash(token)],
      )
    ).rows[0] || null
  );
}

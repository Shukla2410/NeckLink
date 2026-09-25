import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { query } from "./db.js";
import {
  lookupSession,
  tokenHash,
  verifyPassword,
  createUser,
} from "./services/accounts.js";
const sessions = new Map();
const digest = (value) => createHash("sha256").update(String(value)).digest();
export const demoMode = () => process.env.APP_MODE !== "production";
export function installAuth(app) {
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { role, password, username } = req.body;
      if (typeof password !== "string" || password.length > 200)
        return res.status(400).json({ message: "Invalid login" });
      if (username || !demoMode()) {
        const user = (
          await query("SELECT * FROM app_user WHERE username=$1 AND enabled", [
            String(username || "").toLowerCase(),
          ])
        ).rows[0];
        if (!user || !(await verifyPassword(password, user.password_hash)))
          return res
            .status(401)
            .json({ message: "Incorrect username or password" });
        const token = randomBytes(32).toString("hex");
        await query(
          "INSERT INTO app_session(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')",
          [tokenHash(token), user.id],
        );
        await query("DELETE FROM app_session WHERE expires_at<NOW()");
        res.cookie("necklink_session", token, {
          httpOnly: true,
          secure: !demoMode(),
          sameSite: "strict",
          maxAge: 8 * 3600000,
          path: "/",
        });
        return res.json({ status: "ok", role: user.role });
      }
      if (!["driver", "field", "dispatcher", "admin"].includes(role))
        return res.status(400).json({ message: "Choose a valid role" });
      const expected = process.env[`${role.toUpperCase()}_PASSWORD`];
      if (!expected || !timingSafeEqual(digest(password), digest(expected)))
        return res.status(401).json({ message: "Incorrect password" });
      const token = randomBytes(32).toString("hex");
      sessions.set(token, { role, expires: Date.now() + 8 * 3600000 });
      res.cookie("necklink_session", token, {
        httpOnly: true,
        secure: !demoMode(),
        sameSite: "strict",
        maxAge: 8 * 3600000,
        path: "/",
      });
      res.json({ status: "ok", role });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", async (req, res, next) => {
    try {
      const token = req.headers.cookie
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("necklink_session="))
        ?.split("=")[1];
      const session = sessions.get(token);
      if (session && session.expires > Date.now()) req.actor = session.role;
      else if (token) sessions.delete(token);
      if (token && !req.actor) {
        req.user = await lookupSession(req);
        req.actor = req.user?.role;
      }
      if (demoMode()) req.actor ||= "demo";
      if (
        req.path === "/health" ||
        req.path === "/auth/session" ||
        req.path === "/auth/logout"
      )
        return next();
      if (!req.actor)
        return res.status(401).json({ message: "Sign in to continue" });
      if (req.actor === "driver") {
        const match = req.path.match(
          /^\/vehicles\/([^/]+)\/(?:location|locations)$/,
        );
        if (match && match[1] !== req.user?.vehicle_id)
          return res
            .status(403)
            .json({ message: "This vehicle is not assigned to your account" });
      }
      const write = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (
        write &&
        req.headers["x-necklink-client"] !== "web" &&
        req.actor !== "demo"
      )
        return res
          .status(403)
          .json({ message: "Client verification required" });
      if (write && req.actor !== "demo") {
        const role = req.actor;
        const basic =
          req.path === "/routes/calculate" ||
          req.path === "/language/speak" ||
          req.path === "/language/transcribe" ||
          req.path === "/integrations/push-subscription";
        const field = req.path === "/incidents" && req.method === "POST";
        const driver =
          /^\/vehicles\/[^/]+\/location$/.test(req.path) ||
          /^\/operations\/shipments\/[^/]+\/status$/.test(req.path);
        if (
          !["admin", "dispatcher"].includes(role) &&
          !basic &&
          !field &&
          !(role === "driver" && driver)
        )
          return res
            .status(403)
            .json({ message: "A dispatcher must perform this action" });
        if (
          /simulate|rainfall-spike|seismic-events/.test(req.path) &&
          role !== "admin"
        )
          return res
            .status(403)
            .json({ message: "Only an administrator can run scenarios" });
      }
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/auth/session", (req, res) =>
    res.json({
      role: req.actor || null,
      demo: demoMode(),
      user: req.user
        ? {
            id: req.user.id,
            name: req.user.display_name,
            vehicle_id: req.user.vehicle_id,
          }
        : null,
    }),
  );
  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      const token = req.headers.cookie?.match(/necklink_session=([^;]+)/)?.[1];
      sessions.delete(token);
      if (token)
        await query("DELETE FROM app_session WHERE token_hash=$1", [
          tokenHash(token),
        ]);
      res.clearCookie("necklink_session");
      res.json({ status: "ok" });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/admin/users", async (req, res, next) => {
    try {
      if (!["demo", "admin"].includes(req.actor))
        return res
          .status(403)
          .json({ message: "Administrator access required" });
      res.json({
        users: (
          await query(
            "SELECT id,username,display_name,role,vehicle_id,enabled FROM app_user ORDER BY username",
          )
        ).rows,
      });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/admin/users", async (req, res, next) => {
    try {
      if (!["demo", "admin"].includes(req.actor))
        return res
          .status(403)
          .json({ message: "Administrator access required" });
      res.status(201).json({ user: await createUser(req.body) });
    } catch (e) {
      if (e.code === "23505")
        return res
          .status(409)
          .json({ message: "That username already exists" });
      next(e);
    }
  });
}
export function requireDispatcher(req, res, next) {
  if (["demo", "admin", "dispatcher"].includes(req.actor)) return next();
  return res.status(403).json({ message: "Dispatcher access required" });
}

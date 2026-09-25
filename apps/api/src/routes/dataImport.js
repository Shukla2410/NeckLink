import express from "express";
import { pool, query } from "../db.js";
import { requireDispatcher } from "../auth.js";
import { broadcastEvent } from "../realtime.js";
const router = express.Router();
router.post("/", requireDispatcher, async (req, res, next) => {
  const { kind, records, source } = req.body;
  if (
    !["districts", "bridges", "facilities", "corridors"].includes(kind) ||
    !Array.isArray(records) ||
    records.length < 1 ||
    records.length > 500 ||
    !source
  )
    return res
      .status(400)
      .json({ message: "Provide a dataset kind, source and 1–500 records" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of records) {
      if (
        typeof r.id !== "string" ||
        !r.id ||
        r.id.length > 64 ||
        typeof r.name !== "string" ||
        !r.name
      )
        throw Object.assign(new Error("Every record requires an id and name"), {
          status: 400,
        });
      if (kind === "districts") {
        if (
          !r.state_id ||
          (r.geometry && !["Polygon", "MultiPolygon"].includes(r.geometry.type))
        )
          throw Object.assign(
            new Error(
              "Districts require state_id and Polygon/MultiPolygon geometry",
            ),
            { status: 400 },
          );
        await client.query(
          `INSERT INTO district(id,state_id,name,geometry) VALUES($1,$2,$3,CASE WHEN $4::text IS NULL THEN NULL ELSE ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4),4326)) END) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,state_id=EXCLUDED.state_id,geometry=COALESCE(EXCLUDED.geometry,district.geometry)`,
          [
            r.id,
            r.state_id,
            r.name,
            r.geometry ? JSON.stringify(r.geometry) : null,
          ],
        );
        const valid = await client.query(
          "SELECT geometry IS NULL OR ST_IsValid(geometry) AS valid FROM district WHERE id=$1",
          [r.id],
        );
        if (!valid.rows[0].valid)
          throw Object.assign(new Error("Invalid district polygon"), {
            status: 400,
          });
        for (const link of r.connections || [])
          await client.query(
            "INSERT INTO district_connection(district_id,corridor_id,hub) VALUES($1,$2,$3) ON CONFLICT(district_id,corridor_id) DO UPDATE SET hub=EXCLUDED.hub",
            [r.id, link.corridor_id, link.hub],
          );
      }
      if (kind === "bridges") {
        if (
          !["OPEN", "RESTRICTED", "CLOSED"].includes(r.status) ||
          !r.corridor_id
        )
          throw Object.assign(
            new Error("Bridge status and corridor_id are required"),
            { status: 400 },
          );
        await client.query(
          "INSERT INTO bridge(id,name,corridor_id,status,max_weight_tonnes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,max_weight_tonnes=EXCLUDED.max_weight_tonnes,updated_at=NOW()",
          [r.id, r.name, r.corridor_id, r.status, r.max_weight_tonnes || null],
        );
      }
      if (kind === "facilities") {
        if (!r.hub || !r.type || !r.district_id)
          throw Object.assign(
            new Error("Facilities require hub, type and district_id"),
            { status: 400 },
          );
        await client.query(
          "INSERT INTO facility(id,name,district_id,type,hub,lat,lng,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,district_id=EXCLUDED.district_id,hub=EXCLUDED.hub,lat=EXCLUDED.lat,lng=EXCLUDED.lng,source=EXCLUDED.source",
          [
            r.id,
            r.name,
            r.district_id,
            r.type,
            r.hub,
            r.lat || null,
            r.lng || null,
            source,
          ],
        );
      }
      if (kind === "corridors") {
        if (
          !r.origin ||
          !r.destination ||
          !Number.isFinite(Number(r.distance_km)) ||
          Number(r.distance_km) <= 0 ||
          !Array.isArray(r.coordinates) ||
          r.coordinates.length < 2 ||
          !r.coordinates.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              p.every(Number.isFinite) &&
              Math.abs(p[0]) <= 180 &&
              Math.abs(p[1]) <= 90,
          ) ||
          !["OPEN", "AT_RISK", "BLOCKED", "GLOF_ALERT"].includes(r.status)
        )
          throw Object.assign(
            new Error(
              "Corridors require endpoints, distance, valid [longitude,latitude] coordinates and status",
            ),
            { status: 400 },
          );
        await client.query(
          `INSERT INTO corridor(id,name,code,origin,destination,state,distance_km,status,geometry,path_coordinates,status_source,max_weight_tonnes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,ST_SetSRID(ST_GeomFromGeoJSON($9),4326),$10,'VERIFIED_OFFICIAL',$11) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,origin=EXCLUDED.origin,destination=EXCLUDED.destination,distance_km=EXCLUDED.distance_km,status=EXCLUDED.status,geometry=EXCLUDED.geometry,path_coordinates=EXCLUDED.path_coordinates,status_source=EXCLUDED.status_source,max_weight_tonnes=EXCLUDED.max_weight_tonnes,updated_at=NOW()`,
          [
            r.id,
            r.name,
            r.code || r.id,
            r.origin,
            r.destination,
            r.state || "",
            r.distance_km,
            r.status,
            JSON.stringify({ type: "LineString", coordinates: r.coordinates }),
            JSON.stringify(r.coordinates),
            r.max_weight_tonnes || null,
          ],
        );
      }
    }
    await client.query(
      "INSERT INTO audit_event(actor,action,target) VALUES($1,$2,$3)",
      [
        req.user?.username || req.actor,
        `IMPORT_${kind.toUpperCase()}`,
        String(source).slice(0, 1000),
      ],
    );
    await client.query("COMMIT");
    broadcastEvent("DATA_IMPORTED", { kind, count: records.length });
    res.json({ status: "ok", imported: records.length });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code?.startsWith("22") || e.code?.startsWith("23")) {
      e.status = 400;
      e.message =
        "Dataset contains invalid values or references. No rows were imported.";
    }
    next(e);
  } finally {
    client.release();
  }
});
export default router;

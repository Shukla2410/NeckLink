import express from "express";
import { query } from "../db.js";
import { broadcastEvent } from "../realtime.js";

const router = express.Router();

// GET all glacial lakes
router.get("/", async (req, res) => {
  try {
    const lakesRes = await query(`
      SELECT 
        id, name, state, basin, lat, lng, elevation_m, area_sq_km,
        growth_rate_pct, moraine_stability, monitoring_status,
        downstream_corridor_id, polygon_coordinates, description
      FROM glacial_lake
      ORDER BY id ASC
    `);

    const observationsRes = await query(`
      SELECT lake_id, observation_date, estimated_area_sq_km, source, image_ref
      FROM lake_observation
      ORDER BY observation_date ASC
    `);

    const obsMap = {};
    for (const obs of observationsRes.rows) {
      if (!obsMap[obs.lake_id]) obsMap[obs.lake_id] = [];
      obsMap[obs.lake_id].push({
        ...obs,
        estimated_area_sq_km: Number(obs.estimated_area_sq_km),
      });
    }

    res.json({
      status: "ok",
      count: lakesRes.rows.length,
      lakes: lakesRes.rows.map((l) => ({
        ...l,
        lat: Number(l.lat),
        lng: Number(l.lng),
        elevation_m: Number(l.elevation_m),
        area_sq_km: Number(l.area_sq_km),
        growth_rate_pct: Number(l.growth_rate_pct),
        observations: obsMap[l.id] || [],
      })),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST observation
router.post("/:id/observations", async (req, res) => {
  try {
    const lakeId = req.params.id;
    const {
      observation_date,
      estimated_area_sq_km,
      source = "SENTINEL_2",
      image_ref = null,
    } = req.body;
    if (
      !Number.isFinite(Number(estimated_area_sq_km)) ||
      Number(estimated_area_sq_km) <= 0 ||
      Number(estimated_area_sq_km) > 1000
    )
      return res
        .status(400)
        .json({ message: "Enter a valid observed lake area" });

    const result = await query(
      `
      INSERT INTO lake_observation (lake_id, observation_date, estimated_area_sq_km, source, image_ref)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        lakeId,
        observation_date || new Date().toISOString().split("T")[0],
        estimated_area_sq_km,
        source,
        image_ref,
      ],
    );

    await query(
      `UPDATE glacial_lake SET area_sq_km=$1,growth_rate_pct=100*($1/(SELECT estimated_area_sq_km FROM lake_observation WHERE lake_id=$2 ORDER BY observation_date ASC,id ASC LIMIT 1)-1) WHERE id=$2`,
      [estimated_area_sq_km, lakeId],
    );
    broadcastEvent("GLOF_LAKE_UPDATED", { lake_id: lakeId });
    res.status(201).json({ status: "ok", observation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

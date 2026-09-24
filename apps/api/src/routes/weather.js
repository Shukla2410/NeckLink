import express from "express";
import { getAllNerHubsWeather, fetchWeatherForLocation } from "../services/weatherService.js";
import { query } from "../db.js";

const router = express.Router();

// GET weather across all strategic hubs in NER
router.get("/hubs", async (req, res) => {
  try {
    const hubs = await getAllNerHubsWeather();
    res.json({
      status: "ok",
      source: "OpenWeatherMap Live Telemetry",
      count: hubs.length,
      hubs
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET weather for a specific corridor
router.get("/corridor/:id", async (req, res) => {
  try {
    const roadRes = await query("SELECT id, name, code, origin, destination, path_coordinates FROM corridor WHERE id = $1", [req.params.id]);
    if (roadRes.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Corridor not found" });
    }

    const road = roadRes.rows[0];
    let lat = 26.15;
    let lon = 91.75;

    if (road.path_coordinates && road.path_coordinates.length > 0) {
      // coordinates in path_coordinates are [lng, lat]
      const mid = Math.floor(road.path_coordinates.length / 2);
      lon = road.path_coordinates[mid][0];
      lat = road.path_coordinates[mid][1];
    }

    const weather = await fetchWeatherForLocation(lat, lon, `${road.code} (${road.origin})`);
    res.json({
      status: "ok",
      corridor_id: road.id,
      corridor_name: road.name,
      weather
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

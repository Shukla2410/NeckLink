import express from "express";
import { query } from "../db.js";
import { planRoute } from "../services/routePlanner.js";

const router = express.Router();

// POST calculate risk-weighted route
router.post("/calculate", async (req, res) => {
  try {
    const {
      origin = "Siliguri",
      destination = "Gangtok",
      risk_weight = 3.5,
      vehicle_weight_tonnes = 0,
    } = req.body;
    if (
      typeof origin !== "string" ||
      typeof destination !== "string" ||
      !Number.isFinite(Number(risk_weight)) ||
      Number(risk_weight) < 0 ||
      Number(risk_weight) > 20 ||
      !Number.isFinite(Number(vehicle_weight_tonnes)) ||
      Number(vehicle_weight_tonnes) < 0
    )
      return res
        .status(400)
        .json({
          status: "error",
          message: "Choose valid locations and vehicle weight.",
        });

    const routeResult = await planRoute(
      origin,
      destination,
      Number(risk_weight),
      Number(vehicle_weight_tonnes),
    );

    res.json({
      status: "ok",
      result: routeResult,
    });
  } catch (err) {
    console.error("Route calculation error:", err);
    res
      .status(err.status || 500)
      .json({ status: "error", message: err.message });
  }
});

export default router;

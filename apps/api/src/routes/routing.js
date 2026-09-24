import express from "express";
import { query } from "../db.js";
import { requestRoute } from "../mlClient.js";

const router = express.Router();

// POST calculate risk-weighted route
router.post("/calculate", async (req, res) => {
  try {
    const { origin = "Siliguri", destination = "Gangtok", risk_weight = 3.5 } = req.body;

    // Fetch active corridor risk scores from Postgres
    const corridorsRes = await query("SELECT id, code, risk_score FROM corridor");
    const corridorRisks = {};
    for (const c of corridorsRes.rows) {
      corridorRisks[c.id] = Number(c.risk_score);
      if (c.code) corridorRisks[c.code] = Number(c.risk_score);
    }

    const routeResult = await requestRoute(origin, destination, Number(risk_weight), corridorRisks);

    res.json({
      status: "ok",
      result: routeResult
    });
  } catch (err) {
    console.error("Route calculation error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

import { query } from "../db.js";
import { requestRoute } from "../mlClient.js";
export async function planRoute(
  origin,
  destination,
  riskWeight = 4,
  vehicleWeight = 0,
) {
  const [roads, bridges] = await Promise.all([
    query("SELECT * FROM corridor"),
    query("SELECT corridor_id,status,max_weight_tonnes FROM bridge"),
  ]);
  const limits = Object.fromEntries(
    roads.rows
      .filter((c) => c.max_weight_tonnes)
      .map((c) => [c.id, Number(c.max_weight_tonnes)]),
  );
  for (const b of bridges.rows)
    if (b.max_weight_tonnes)
      limits[b.corridor_id] = Math.min(
        limits[b.corridor_id] || Infinity,
        Number(b.max_weight_tonnes),
      );
  return requestRoute(
    origin,
    destination,
    riskWeight,
    Object.fromEntries(roads.rows.map((c) => [c.id, Number(c.risk_score)])),
    {
      closed_corridors: [
        ...new Set([
          ...roads.rows
            .filter((c) => ["BLOCKED", "GLOF_ALERT"].includes(c.status))
            .map((c) => c.id),
          ...bridges.rows
            .filter((b) => b.status === "CLOSED")
            .map((b) => b.corridor_id),
        ]),
      ],
      corridor_limits: limits,
      corridor_speeds: Object.fromEntries(
        roads.rows.map((c) => [c.id, Number(c.current_speed)]),
      ),
      vehicle_weight_tonnes: vehicleWeight,
      use_demo_links: process.env.APP_MODE !== "production",
      network_edges: roads.rows
        .filter(
          (c) =>
            process.env.APP_MODE !== "production" ||
            c.status_source === "VERIFIED_OFFICIAL",
        )
        .map((c) => ({
          corridor_id: c.id,
          origin: c.origin,
          destination: c.destination,
          distance_km: Number(c.distance_km),
          risk_score: Number(c.risk_score),
          coordinates: c.path_coordinates || [],
        })),
    },
  );
}

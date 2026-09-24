/**
 * NECKLINK Cryosphere & Seismic Event Simulator
 * Triggers mock seismic anomaly / ice-rock collapse trigger at South Lhonak Glacial Lake,
 * testing GLOF downstream flood surge arrival calculations and alerts.
 */

const API_BASE = process.env.API_BASE_URL || "http://localhost:5000";

async function simulateSeismicTrigger(lakeId = "LAKE-SLHONAK", magnitude = 4.9) {
  console.log(`[SEISMIC SIM] Triggering mock seismic event (Mag ${magnitude}) at lake ${lakeId}...`);
  try {
    const res = await fetch(`${API_BASE}/api/seismic-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lake_id: lakeId,
        magnitude: magnitude,
        depth_km: 4.2,
        classification: "ICE_ROCK_AVALANCHE_TRIGGER"
      })
    });
    const result = await res.json();
    console.log("[SEISMIC SIM] Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[SEISMIC SIM] Error:", err.message);
  }
}

const targetLake = process.argv[2] || "LAKE-SLHONAK";
const targetMag = Number(process.argv[3] || 4.9);
simulateSeismicTrigger(targetLake, targetMag);

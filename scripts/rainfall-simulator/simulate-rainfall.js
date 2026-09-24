/**
 * NECKLINK Rainfall Spike Trigger Simulator
 * Injects a meteorological precipitation surge into a specified corridor,
 * initiating cause-and-effect chain 1.
 */

const API_BASE = process.env.API_BASE_URL || "http://localhost:5000";

async function simulateRainfallSpike(corridorId = "CORR-NH10", rainfallMm = 125.0) {
  console.log(`[RAIN SIM] Injecting rainfall surge (${rainfallMm}mm) onto ${corridorId}...`);
  try {
    const res = await fetch(`${API_BASE}/api/roads/${corridorId}/rainfall-spike`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rainfall_mm: rainfallMm })
    });
    const result = await res.json();
    console.log("[RAIN SIM] Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[RAIN SIM] Error:", err.message);
  }
}

const targetCorridor = process.argv[2] || "CORR-NH10";
const targetRain = Number(process.argv[3] || 125.0);
simulateRainfallSpike(targetCorridor, targetRain);

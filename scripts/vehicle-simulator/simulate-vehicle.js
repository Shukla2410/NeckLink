/**
 * NECKLINK Real-time Fleet Vehicle Simulator
 * Pushes real GPS coordinates along NER corridors to the central API,
 * testing geofence triggers and live telematic speed streams.
 */

const API_BASE = process.env.API_BASE_URL || "http://localhost:5000";

// Waypoints along NH-10 (Siliguri -> Teesta Valley -> Gangtok)
// Passing through the active Teesta risk zone between (88.48, 27.05) and (88.52, 27.18)
const NH10_WAYPOINTS = [
  { lat: 26.73, lng: 88.44, speed: 48.0 },
  { lat: 26.90, lng: 88.46, speed: 42.0 },
  { lat: 27.05, lng: 88.48, speed: 28.0 }, // Enters Teesta hazard polygon
  { lat: 27.10, lng: 88.50, speed: 22.0 }, // Inside active geofence
  { lat: 27.18, lng: 88.52, speed: 26.0 },
  { lat: 27.33, lng: 88.60, speed: 38.0 }  // Reaches Gangtok
];

async function sendVehiclePing(vehicleId, waypoint) {
  try {
    const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: waypoint.lat,
        lng: waypoint.lng,
        speed: waypoint.speed,
        heading: 32.0
      })
    });
    const data = await res.json();
    console.log(`[VEHICLE SIM] ${vehicleId} -> lat:${waypoint.lat} lng:${waypoint.lng} | status: ${data.data?.status} | geofence: ${data.data?.geofence_breach}`);
  } catch (err) {
    console.error(`[VEHICLE SIM] Error pinging location for ${vehicleId}:`, err.message);
  }
}

async function runVehicleSimulation() {
  console.log("Starting NECKLINK Vehicle Telematics Simulation...");
  const vehicleId = process.argv[2] || "NL-POL-09";

  for (let i = 0; i < NH10_WAYPOINTS.length; i++) {
    const wp = NH10_WAYPOINTS[i];
    await sendVehiclePing(vehicleId, wp);
    if (i < NH10_WAYPOINTS.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.log("Vehicle simulation run complete.");
}

if (process.argv[1]?.includes("simulate-vehicle.js")) {
  runVehicleSimulation();
}

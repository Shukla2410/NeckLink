/**
 * Firebase Realtime Database Integration Service for NECKLINK
 * Synchronizes PostgreSQL state and telemetry broadcasts directly to
 * https://neclink-prototype-default-rtdb.asia-southeast1.firebasedatabase.app
 */

const DB_URL = process.env.FIREBASE_DATABASE_URL || "https://neclink-prototype-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function pushToFirebase(path, data) {
  try {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${DB_URL}${cleanPath}.json`;

    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      console.warn(`Firebase RTDB write warning (${res.status}):`, await res.text());
    }
  } catch (err) {
    // Non-blocking warning so offline or network hiccups don't break Express
    console.warn("Firebase RTDB sync non-blocking error:", err.message);
  }
}

export async function syncCorridorToFirebase(corridor) {
  return pushToFirebase(`/corridors/${corridor.id}`, corridor);
}

export async function syncVehicleToFirebase(vehicle) {
  return pushToFirebase(`/vehicles/${vehicle.id}`, vehicle);
}

export async function syncAlertToFirebase(alert) {
  return pushToFirebase(`/alerts/${alert.id}`, alert);
}

export async function syncEventToFirebase(eventType, payload) {
  return pushToFirebase(`/live_telemetry_event`, {
    type: eventType,
    data: payload,
    updated_at: new Date().toISOString()
  });
}

export async function checkFirebaseConnection() {
  try {
    const res = await fetch(`${DB_URL}/.json?shallow=true`);
    return {
      connected: res.ok,
      database_url: DB_URL,
      status: res.status
    };
  } catch (err) {
    return {
      connected: false,
      database_url: DB_URL,
      error: err.message
    };
  }
}

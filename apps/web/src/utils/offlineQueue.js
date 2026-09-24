/**
 * IndexedDB Offline Incident Queue for NECKLINK Field Reporting PWA
 * Enables field responders with zero network connectivity to record geolocated incidents,
 * auto-syncing when connectivity is restored.
 */

const DB_NAME = "necklink_offline_db";
const STORE_NAME = "incident_queue";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineIncident(incident) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const item = {
      ...incident,
      queued_at: new Date().toISOString(),
      sync_status: "QUEUED_OFFLINE"
    };
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedIncidents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedIncident(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function syncQueuedIncidents(apiBase = "http://localhost:5000") {
  const queued = await getQueuedIncidents();
  if (queued.length === 0) return { synced: 0, failed: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queued) {
    try {
      const res = await fetch(`${apiBase}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          corridor_id: item.corridor_id,
          lat: item.lat,
          lng: item.lng,
          description: item.description,
          severity: item.severity,
          source: "FIELD_OFFICER_OFFLINE_SYNC",
          sync_status: "SYNCED"
        })
      });

      if (res.ok) {
        await removeQueuedIncident(item.id);
        syncedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return { synced: syncedCount, failed: failedCount };
}

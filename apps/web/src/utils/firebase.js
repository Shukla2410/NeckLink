import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || ""
};

let app = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.warn("Firebase initialization warning:", e.message);
}

export function subscribeToFirebaseTelemetry(callback) {
  if (!db) return () => {};

  try {
    const eventRef = ref(db, "live_telemetry_event");
    return onValue(eventRef, (snapshot) => {
      const data = snapshot.val();
      if (data && callback) {
        callback(data);
      }
    });
  } catch (err) {
    console.warn("Firebase listener error:", err.message);
    return () => {};
  }
}

export { app, db };

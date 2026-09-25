# NECKLINK — AI Logistics & Accessibility Intelligence Platform for India's North Eastern Region (NER)

> **Current build:** start with [SETUP.md](SETUP.md) for the driver workspace, dispatch desk, named accounts, offline reports, verified-data import and integration setup. The original prototype overview below is retained as project history; its live-data and model claims are superseded by the explicit source labels and limitations in SETUP.md. No production prediction or delivery claim should be inferred from a simulator.

**Problem Statement:** SIH26002 — AI-Based Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region  
**Sponsor:** Ministry of Development of North Eastern Region (MDoNER)  
**Theme:** Transportation & Logistics · Disaster Resilience · Cryosphere Intelligence  

---

## 1. System Overview

NECKLINK is a unified operational command and intelligence platform that bridges GIS mapping, real-time meteorological precipitation feeds, terrain slope analytics, satellite optical observations, seismic telematics, vehicle GPS telemetry, and offline field responder reports into one continuous operational loop:

$$\text{Observe} \longrightarrow \text{Predict} \longrightarrow \text{Decide} \longrightarrow \text{Alert} \longrightarrow \text{Reroute} \longrightarrow \text{Track} \longrightarrow \text{Learn}$$

### Core Capabilities:
1. **GIS Accessibility Dashboard:** 16 strategic NER corridors (NH-27, NH-10, NH-29, NH-06, etc.) mapped as GeoJSON with live dynamic risk coloring (Open `#10B981`, At-Risk `#F59E0B`, Blocked `#EF4444`, GLOF-Alert `#E879F9`).
2. **AI Risk-Weighted Routing Engine:** Powered by scikit-learn Random Forest risk scoring (`POST /predict-risk`) and a NetworkX corridor graph with Dijkstra / A* routing penalizing risk non-linearly:
   $$\text{Edge Cost} = \text{Distance}_{\text{km}} \times (1 + \lambda \times \text{Risk Score}^{1.5})$$
3. **Closed-Loop Vehicle Telematics:** Continuous GPS tracking of essential convoys (medical, rations, fuel) with server-side point-in-polygon geofencing and early anomaly detection (fleet velocity deceleration feeds back into corridor risk scores before human reports).
4. **Flagship Cryosphere / GLOF Early Warning:** Closed-loop trigger path detecting clear-sky non-precipitation hazards (modeled on the real South Lhonak Oct 2023 disaster & Aug 2026 Nepal cascade) via Sentinel-2 proglacial lake area growth (+18.3%) and seismic trigger telematics computing downstream wave propagation and settlement arrival timelines (Lachen ~38m, Chungthang ~1h22m).
5. **Offline-First Field Reporting PWA:** Mobile-first emergency dispatch form writing first to browser IndexedDB when connectivity is lost, automatically synchronizing to PostgreSQL upon reconnection.
6. **Multilingual Regional Dispatch:** Alerts dispatched with authentic translations across 7 Northeast languages: Assamese (অসমীয়া), Hindi (हिन्दी), Khasi, Mizo, Manipuri (মৈতৈলোন্), Bodo (बर'), and English.

---

## 2. Design System & Aesthetics

- **Font:** Space Grotesk everywhere.
- **Theme:** Sleek dark mode (`#1A171A` background, `#231F24` / `#2B252D` surfaces).
- **Accents:** Neon magenta primary (`#E879F9`), light purple secondary (`#F0ABFC`).
- **Elements:** Rounded pill buttons (`border-radius: 9999px`), rounded card corners (`16-24px`), glassmorphic overlays, and CartoDB Dark Matter tiles.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Web App** | React 19 + Vite, Leaflet.js (`react-leaflet`), `lucide-react`, IndexedDB Offline Queue |
| **Backend REST & Realtime API** | Node.js + Express (ES Modules), PostgreSQL Pool, WebSockets (`ws`) + Server-Sent Events (`/api/events`) |
| **ML & Routing Microservice** | Python 3.14 + FastAPI, scikit-learn (RandomForest), NetworkX (Dijkstra/A*), Pydantic |
| **Spatial Store of Record** | PostgreSQL 16/18 with PostGIS extension |
| **Containerization** | `docker-compose.yml` (PostGIS service) |

---

## 4. Quickstart & How to Run

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL with PostGIS extension (running locally on port `5432` with database `necklink` or via `docker compose up -d`)

### Step 1: Database Setup & Seeding
```bash
# Apply schema and seed 16 NER corridors, lakes, vehicles, and hazard zones
npm run seed
```

### Step 2: Start All Microservices
In 3 separate terminal sessions (or run in background):

1. **Python ML & Routing Service (Port 8000):**
   ```bash
   npm run dev:ml
   # or: python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir apps/ml-service
   ```
2. **Node Express Dispatch API (Port 5000):**
   ```bash
   npm run dev:api
   # or: cd apps/api && node src/server.js
   ```
3. **Vite Frontend Dashboard (Port 5173):**
   ```bash
   npm run dev:web
   # or: cd apps/web && npm run dev
   ```

Open your browser to: **`http://localhost:5173/`**

---

## 5. Verification: The 5 Definition-of-Done Cause-and-Effect Chains

You can trigger all 5 chains either directly inside the UI via the **"Simulate 5 Chains" / "Demo Simulators"** button, or via automation scripts:

| # | Chain Name | Trigger Action | Observable Cause-and-Effect |
|---|---|---|---|
| **1** | **Rain → Risk → Route → ETA** | Click Chain 1 in UI or run `node scripts/rainfall-simulator/simulate-rainfall.js CORR-NH10 125` | 125mm rain injected on NH-10; ML risk score rises to >80%; corridor turns red/blocked; route optimizer dynamically reroutes traffic via Algarah bypass (`150 km`, `3.4 hrs ETA`). |
| **2** | **Vehicle → Risk Zone → Geofence → Alert** | Click Chain 2 in UI or run `node scripts/vehicle-simulator/simulate-vehicle.js NL-POL-09` | Vehicle NL-POL-09 coordinates update into active Teesta flood polygon; status turns to `IN_RISK_ZONE`; geofence alert dispatched. |
| **3** | **Field Report → Offline Queue → Sync** | In "Offline Field PWA" tab: toggle offline, submit landslide, toggle online | Incident buffered in IndexedDB; upon reconnecting or clicking "Sync Offline Queue", writes to PostgreSQL and appears on central map without refresh. |
| **4** | **Satellite/GLOF → Seismic Trigger → Travel Time** | Click Chain 4 in UI or run `node scripts/seismic-simulator/simulate-seismic.js` | Mag 4.8 seismic event triggered at South Lhonak; downstream wave velocity (26-48 km/h) & arrival times computed (Lachen ~38m, Chungthang ~1h22m); NH-10 turns brand accent `#E879F9` (`GLOF_ALERT`); multilingual emergency warning dispatched. |
| **5** | **Vehicle Speed Anomaly → Early Risk Signal** | Click Chain 5 in UI or call `POST /api/vehicles/simulate-anomaly` | Fleet velocity on NH-29 drops by 26 km/h; telematics detects congestion before civilian reports; corridor risk score increases to >70%. |

---

## 6. Running Automated Tests

```bash
# Run both Python ML unit tests and Node.js API integration tests
npm test

# Run ML service tests only (pytest)
npm run test:ml

# Run API & 5-chain integration tests only (Node Test Runner + Supertest)
npm run test:api
```

---

## 7. Environment Variables (`.env.example`)

See `.env.example` for the full reference schema:
- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:1912@localhost:5432/necklink`)
- `PORT`: API server port (5000)
- `ML_SERVICE_URL`: ML microservice URL (`http://127.0.0.1:8000`)
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key placeholder
- `BHASHINI_USER_ID` / `BHASHINI_API_KEY`: Bhashini ULCA translation credentials placeholder
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`: Twilio SMS sandbox credentials placeholder
- `FIREBASE_API_KEY` / `FIREBASE_PROJECT_ID`: Firebase project configuration placeholders

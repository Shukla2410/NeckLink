# NECKLINK — Product Requirements Document (PRD)

**Problem Statement:** SIH26002 — AI-Based Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region (NER)
**Sponsor:** Ministry of Development of North Eastern Region (MDoNER)
**Theme / Category:** Transportation & Logistics · Software
**Document version:** 1.0 (Prototype build spec)
**Status:** Source of truth for engineering execution. Supersedes verbal/chat descriptions of the product. The actual repository is the source of truth for *what is implemented*; this document is the source of truth for *what should be implemented*.

---

## 0. How to read this document

- **"Prototype"** = what must exist and run for the 36-hour build / hackathon demo.
- **"Full product"** = future production vision. Mentioned only for context — do not build it now.
- **"Simulated"** = an input signal that cannot realistically be sourced live in the prototype window (seismic feed, satellite feed, real GPS fleet). Simulated inputs must still flow through a **real backend pipeline** (DB write → API → WebSocket/Firebase push → live UI update). Simulated ≠ hardcoded. Simulated data must never be presented, in the UI or in the pitch, as live government data.
- Anything marked **[ACTION NEEDED FROM USER]** is a decision or credential only the team can supply.

---

## 1. Executive Summary

NECKLINK is an AI-powered logistics and accessibility intelligence platform for India's North Eastern Region. It unifies GIS mapping, weather, terrain, satellite, seismic, GPS-vehicle, and field-incident data into one operational layer; predicts corridor disruption risk; recommends risk-weighted (not just shortest) routes; tracks essential-goods vehicles and uses their movement as an early-warning signal; lets field officers report incidents fully offline; delivers targeted multilingual alerts; and extends the same pipeline to a cryosphere/GLOF early-warning pathway that catches disasters a rainfall-only model would miss (e.g. South Lhonak, Oct 2023; Nepal, Aug 2026).

Core loop: **Observe → Predict → Decide → Alert → Reroute → Track → Learn.**

## 2. Problem Statement

NER logistics fail through a specific chain, and NECKLINK is designed to interrupt it at multiple points:

```
DATA FRAGMENTATION → POOR SITUATIONAL AWARENESS → NO EARLY RISK SIGNAL
   → UNSAFE / OUTDATED ROUTE → VEHICLE ENTERS RISK AREA
   → LOGISTICS DISRUPTION → COMMUNITIES RECEIVE ESSENTIAL GOODS LATE
```

Terrain, monsoon landslides, floods, poor connectivity, and slow field reporting all contribute. Critically, the region's existing risk models are rainfall/landslide-shaped and structurally blind to cryosphere hazards (GLOFs), which strike under clear skies with no rainfall signature.

## 3. Goals (Prototype)

1. All **5 Definition-of-Done chains** (§15) run live, end-to-end, on a public URL.
2. UI matches the brand system in §8 exactly — this is a judged deliverable, not a suggestion.
3. **Zero hardcoded UI data.** Every widget reads from a real API/DB/WebSocket. Simulators write to the same DB the UI reads from.
4. Every simulated input is clearly labeled as simulated in code/comments and never claimed as a live government feed in the UI or pitch.
5. The prototype architecture must be a scaled-down instance of the *same* architecture as the full product (§9) — not a parallel toy system.
6. Automated tests exist for the core pipelines, and nothing is marked "done" without a passing test.
7. Deployed publicly (Render/Railway) with a shareable link for judges.

## 4. Non-Goals (explicitly out of scope for the prototype)

- Production-grade trained ML models (synthetic training data is acceptable and must be labeled as such).
- Full NER road network — 15–20 hand-picked corridors is sufficient.
- Self-hosted OSRM/GraphHopper — NetworkX + Dijkstra/A* on a hand-built graph is sufficient.
- Live seismic/satellite processing pipelines — one manually-triggered mock event and two real pre-downloaded satellite images are sufficient.
- WhatsApp Business API, full RBAC/audit logging, Kubernetes/Kafka — production-only concerns.

## 5. Target Users / Personas

| Persona | Core need |
|---|---|
| Government & disaster management authorities | Regional situational awareness, risk map, incident overview, alert control |
| Logistics & essential-goods operators | Safe route, live road status, ETA, vehicle tracking, risk alerts |
| Field officers / emergency responders | Offline-capable incident reporting with photo + geotag |
| Communities & vulnerable settlements | Timely, understandable, language-appropriate warnings |

## 6. Feature Scope — Five Pillars + Flagship Novelty

### Pillar 1 — GIS-Enabled Accessibility Monitoring Dashboard
- **Purpose:** the single operational surface — not a static map, the consumption layer for every other pillar's output.
- **Prototype requirements:** React + Leaflet.js; free NER state/district GeoJSON; 15–20 corridors as GeoJSON LineStrings; road status (Open/At-Risk/Blocked) colored green/amber/red; OpenWeatherMap rainfall overlay; vehicle markers; incident markers; GLOF lake layer; live updates via Firebase listener or ≤10s polling.
- **Acceptance criteria:** a status change made anywhere in the backend (rainfall sim, vehicle sim, incident submit, GLOF trigger) is visible on this map within a few seconds, with no page refresh.

### Pillar 2 — AI Route Prediction & Optimization Engine ⭐ (analytical core)
- **Purpose:** disruption risk scoring (0–1) per corridor, and routing that treats risk as a cost, not just distance/time.
- **Prototype requirements:** scikit-learn Random Forest/Logistic Regression trained on a synthetic dataset (~200–500 rows: rainfall, slope, historical incidents → risk label), served via FastAPI (`POST /predict-risk`); NetworkX graph over the hand-built corridor set with Dijkstra/A*, edge cost = `distance × (1 + λ × risk_score)` (`POST /route`).
- **Acceptance criteria (critical demo):** injecting a rainfall spike for one corridor visibly raises its risk score, the routing engine recalculates, a different route becomes recommended, and ETA changes on the dashboard — live, no manual refresh.

### Pillar 3 — GPS-Based Vehicle Tracking (+ Closed-Loop Feedback)
- **Purpose:** know where essential-goods vehicles are, detect risk-zone entry, and use speed anomalies as an early disruption signal *before* any human files a report.
- **Prototype requirements:** a script/service pushing simulated lat/lng updates for one or more vehicles along a corridor every few seconds via Firebase/WebSocket; point-in-polygon geofence check against active risk zones; speed-anomaly detection (e.g. sustained drop vs. corridor baseline across multiple vehicles) feeding back into Pillar 2's risk score.
- **Acceptance criteria:** (a) a vehicle entering a risk polygon fires `VEHICLE_ENTERED_RISK_ZONE` → alert → dashboard update; (b) simulated vehicles slowing/clustering on a corridor raises that corridor's risk score without any incident being filed.

### Pillar 4 — Offline-First Field Reporting App
- **Purpose:** let field officers report incidents (GPS + photo + note) with zero connectivity, syncing automatically once online.
- **Prototype requirements:** PWA form; write-first to IndexedDB; auto-sync to backend when `navigator.onLine`; queued/synced status shown in UI.
- **Acceptance criteria:** disable network → submit report → shown as queued locally → re-enable network → report syncs and appears on the Pillar 1 dashboard automatically.

### Pillar 5 — Real-Time Multilingual Alerts
- **Purpose:** get warnings to the right people, in the right language, through a channel that actually reaches them.
- **Prototype requirements:** central alert service triggered by any risk/GLOF/geofence event; Bhashini API for translation (Assamese, Khasi, Mizo, Manipuri, Bodo, Hindi minimum — fallback to Google Cloud Translate if Bhashini onboarding is blocked); Firebase Cloud Messaging push; Twilio sandbox for one live SMS during demo.
- **Acceptance criteria:** triggering an alert in English produces an auto-translated, delivered version in at least one regional language live during the demo.

### Flagship Novelty — Cryosphere & GLOF Early-Warning Module
- **Purpose:** close the blind spot in rainfall-only models. Referenced real events: South Lhonak GLOF (North Sikkim, Oct 3–4 2023 — ~77 dead, Teesta III dam destroyed); six NDMA-flagged high-risk lakes in Arunachal Pradesh post-2023; Nepal, Aug 26 2026 (ice-rock collapse cascade, 300+ dead, no rainfall signature, described as a geological "monitoring blind spot").
- **Prototype requirements:** two real pre-downloaded satellite images of South Lhonak (or a named Arunachal lake) with a basic area-comparison script; a manually-triggered mock seismic webhook as the instant, rainfall-independent trigger; downstream travel-time estimate computed by reusing Pillar 2's road/river graph; cascading alert reusing Pillar 5's engine; affected lake + corridor rendered red on the Pillar 1 map.
- **Non-negotiable architectural rule:** this is a second *trigger path* into the existing risk/route/alert pipeline — never a separate app or a parallel data store.
- **Acceptance criteria:** triggering the mock seismic event produces, live: a downstream impact estimate ("Village X: ~40 min to impact"), a red risk layer on the map, and a multilingual cascading alert.

## 7. Non-Functional Requirements

- **Real-time:** state changes propagate to connected clients within a few seconds (WebSocket/Firebase, not manual refresh).
- **Offline-first:** the field PWA must function with zero network and sync automatically on reconnect.
- **Config via environment variables only** — no secrets committed to the repo; `.env.example` must exist and be complete.
- **Public reachability:** the deployed prototype must be reachable via a single URL suitable for a judge to open cold.
- **Honesty in labeling:** every simulated data source must say so somewhere inspectable (code comments, and ideally a small "Data Source" tag in the UI for GLOF/seismic-derived values) per the project's own governance rule (§17).

## 8. UX / UI Design System

Two reference dashboard styles and one brand-palette reference were supplied. They play **different roles** — do not blend their colors.

**Brand system (authoritative — from `Colors_for_Website.webp` and `Dashboard_reference_1/2.webp`, which are the same design):**
- Typeface: **Space Grotesk** (headings and body).
- Background: `#1A171A` (near-black, warm dark).
- Primary accent: `#E879F9` (magenta/purple) — primary buttons, active states, route lines, highlighted cards.
- Secondary accent: `#F0ABFC` (light pink/purple) — secondary buttons, subtle highlights, badges.
- Rounded pill-shaped buttons and rounded cards (~16–24px radius). Dark mode only.
- Layout pattern (structural reference): left icon rail for primary nav; a scrollable list of clickable cards, each with a status pill (color-coded), that expands into a detail panel (key/value rows + an embedded mini-map + a "Route"-style breakdown); a large primary map occupying the right two-thirds of the screen with floating pill-shaped info popups on markers; top-right pill CTAs.

**Structural-only reference (`Dashboard_Refernce_2.webp`, "Routey" — different color scheme, use layout ideas only, NOT its purple/lime palette):**
- Top horizontal nav with tabs.
- A row of 4 compact KPI stat cards above the fold.
- A status-distribution bar and a trend line chart.
- A large map card with colored markers.
- A filterable data table below the map (tab chips: All / Pending / In Progress / Completed, etc.).

**NECKLINK synthesis (what to actually build):**
- Top KPI row (brand-colored, not Routey's colors): *Active Corridors*, *Vehicles Tracked Live*, *Active Alerts*, *GLOF Watch Lakes* (or similar — pick from the real entities in §10, not invented metrics).
- Hero: large Leaflet map — NER boundaries, corridor lines colored by risk (green/amber/red, using brand accent `#E879F9`/`#F0ABFC` for GLOF/critical states so they read as "on-brand alarm" rather than a clashing color), vehicle markers, incident markers, glacial lake markers.
- Side panel: card list of Corridors / Incidents / Alerts (status pill: Open=green, At-Risk=amber, Blocked=red, GLOF-Alert=`#E879F9`), each expandable into a detail drawer (risk score, contributing signals, affected segment, ETA/route) — mirroring pattern A's card→detail interaction.
- Filter chips above the list (mirroring pattern B) for status/pillar/severity.
- Icon set: lucide-react (`map`, `truck`, `alert-triangle`, `cloud-rain`, `radio` for seismic, `droplet` for GLOF, `wifi-off` for offline state).
- Screens needed: Command Center Dashboard (hero), Corridor/Incident detail drawer, Alerts Center, GLOF Watch panel, Field Reporting PWA (separate lightweight mobile-first route, same dark theme, minimal chrome). Auth screens are optional for the prototype — skip unless there's spare time.

The reference image files must be placed in the repo (e.g. `docs/design/`) so any coding agent with file access can view them directly rather than working from this text description alone.

## 9. Technical Architecture

```
DATA SOURCES → INGESTION (REST/Firebase/uploads)
   → PostgreSQL + PostGIS (roads, risk zones, vehicles, incidents, geometries)
       ├─→ NORMAL RISK ENGINE (rainfall, slope, history, vehicle behaviour)
       └─→ CRYOSPHERE/GLOF ENGINE (lake growth, seismic, travel-time)
   → RISK-WEIGHTED ROUTING (NetworkX / Dijkstra / A*)
   → GIS DASHBOARD  |  ALERT ENGINE  |  VEHICLE ENGINE
   ← FIELD REPORTING PWA (offline → IndexedDB → sync) feeds back into the risk engine
```

**Services (prototype stack):**

| Service | Stack | Responsibility |
|---|---|---|
| `apps/web` | React + Vite, Leaflet.js, PWA/IndexedDB | Dashboard + Field Reporting PWA |
| `apps/api` | Node.js + Express (ES Modules) | Roads, incidents, vehicles, alerts REST APIs; auth (if added); Firebase/Twilio/Bhashini integration glue |
| `apps/ml-service` | Python + FastAPI, scikit-learn | Risk scoring (`/predict-risk`), routing (`/route`) |
| `database` | PostgreSQL + PostGIS | Spatial store of record |
| Realtime layer | Firebase Realtime DB/Firestore (or WebSockets) | Vehicle pings, status changes, push delivery |
| `scripts/` | Node/Python | `simulate-vehicle`, `simulate-rainfall`, `simulate-seismic` — real pipelines with simulated inputs |
| Deployment | Render or Railway (free tier) | Public URL for `apps/web` + `apps/api` + `apps/ml-service` |

## 10. Data Model (entities — implement as Postgres/PostGIS tables)

`STATE`, `DISTRICT` (id, name, geometry) · `ROAD_SEGMENT`/`CORRIDOR` (id, name, geometry, status, risk_score, current_speed, baseline_speed, updated_at) · `RISK_ZONE` (id, type, severity, geometry, source, active_from/until) · `VEHICLE` (id, operator, type, current_location, status) · `VEHICLE_LOCATION` (vehicle_id, lat, lng, speed, timestamp) · `INCIDENT` (id, type, lat, lng, geometry, description, image_ref, source, created_at, sync_status) · `ALERT` (id, type, severity, message, language, recipients, status, created_at) · `GLACIAL_LAKE` (id, name, geometry, monitoring_status) · `LAKE_OBSERVATION` (lake_id, observation_date, estimated_area, source, image_ref) · `SEISMIC_EVENT` (id, timestamp, location, magnitude, classification) · `ROUTE_REQUEST` / `ROUTE_RESULT` (origin, destination, geometry, distance, ETA, risk_score, alternatives).

These are development-oriented shapes, not a claim they already exist — verify against the live schema before building on top of them.

## 11. API Specification (minimum viable surface)

**`apps/api` (Node/Express):**
`GET/POST /api/roads` · `GET/POST /api/incidents` · `GET/POST /api/vehicles` · `GET /api/vehicles/:id/locations` · `POST /api/alerts` · `GET /api/glacial-lakes` · `POST /api/glacial-lakes/:id/observations` · `POST /api/seismic-events` (mock trigger endpoint) · `GET /api/health` · `GET /api/db-test` (already exists per audit).

**`apps/ml-service` (FastAPI):**
`POST /predict-risk` — in: `corridor_id, rainfall, rainfall_trend, slope, historical_incidents, vehicle_speed_anomaly, season` → out: `risk_score, risk_level, contributing_signals`.
`POST /route` — in: `origin, destination, risk_weight, current_conditions` → out: `route, distance, eta, risk_score, alternatives`.

**Event names (for internal pub/sub or just for logging/consistency):**
`ROAD_STATUS_CHANGED`, `VEHICLE_LOCATION_UPDATED`, `VEHICLE_ENTERED_RISK_ZONE`, `VEHICLE_SPEED_ANOMALY`, `INCIDENT_REPORTED`, `INCIDENT_SYNCED`, `WEATHER_UPDATED`, `RISK_SCORE_UPDATED`, `ROUTE_RECALCULATED`, `GLOF_LAKE_UPDATED`, `SEISMIC_ANOMALY`, `GLOF_TRIGGERED`, `ALERT_CREATED`, `ALERT_SENT`.

## 12. External Integrations & Required Credentials

| Service | Purpose | Env var | Notes |
|---|---|---|---|
| OpenWeatherMap | Rainfall/weather overlay + risk input | `OPENWEATHER_API_KEY` | Free tier is sufficient |
| Firebase | Realtime DB + FCM push | `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_*` (full config object) | **[ACTION NEEDED FROM USER]** if not already generated |
| Twilio | SMS demo | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Sandbox is sufficient |
| Bhashini | Regional-language translation | `BHASHINI_USER_ID`, `BHASHINI_API_KEY` (or ULCA pipeline key, per current Bhashini onboarding — verify at bhashini.gov.in, process may have changed) | Fallback: `GOOGLE_TRANSLATE_API_KEY` |
| PostgreSQL/PostGIS | Spatial store | `DATABASE_URL` | Local via docker-compose |
| Mapbox *(optional)* | Only if not using pure Leaflet+OSM tiles | `MAPBOX_TOKEN` | Prototype default is Leaflet + free OSM tiles — no key needed |
| Render/Railway | Deployment | Platform account, not a code secret | |

Any key not yet available must be left as a clearly-named placeholder in `.env.example` (e.g. `OPENWEATHER_API_KEY=YOUR_KEY_HERE`) — never invented, never silently stubbed without saying so.

## 13. Current Implementation Status (baseline snapshot — re-verify before trusting)

| Area | State |
|---|---|
| `apps/api` | Express scaffold done: CORS, dotenv, `pg` pool, `/api/health`, `/api/db-test`, `dev`/`start` scripts |
| `apps/web` | Default Vite+React scaffold only — no Leaflet, no NECKLINK UI yet |
| `apps/ml-service` | Empty — not started |
| `database/` | Folder structure only — no schema/migrations/seeds |
| `data/` | Empty — no NER GeoJSON, corridors, or satellite images yet |
| `docker-compose.yml` | Empty (0 bytes) — needs Postgres+PostGIS service |
| `packages/`, `scripts/` | Empty placeholders |

## 14. Build Roadmap

P0 (must work for a minimally credible demo): map, road status, risk score, route calculation, rainfall-triggered reroute, vehicle tracking, geofence alert, field offline sync.
P1 (strong differentiators): closed-loop vehicle anomaly signal, GLOF mock trigger, downstream travel time, multilingual alert.
P2 (stretch): live Twilio, Bhashini, richer satellite analysis, SMS/USSD fallback, richer analytics.

Suggested order: (1) Postgres/PostGIS + seed data → (2) FastAPI risk + routing → (3) GIS dashboard wired to real API → (4) vehicle simulation + geofencing + closed loop → (5) offline PWA + GLOF module → (6) alerts → (7) end-to-end integration test of all 5 chains → (8) deploy → (9) demo rehearsal.

## 15. Demo Script / Definition of Done (5 chains — all must run live)

1. **Rain → Risk → Route → ETA → Dashboard**
2. **Vehicle → Risk Zone → Geofence → Alert**
3. **Field Report → Offline Queue → Connectivity Returns → Sync → Dashboard**
4. **Satellite/GLOF → Mock Seismic Trigger → Downstream Impact → Travel Time → Red Zone → Alert**
5. **Vehicle Speed Anomaly → Early Disruption Signal → Risk Update → Route/Warning**

## 16. Testing Strategy

- **Unit:** Jest + Supertest for `apps/api`; pytest for `apps/ml-service`; Vitest/React Testing Library for `apps/web` components.
- **Integration (one per chain):** each of the 5 chains in §15 needs a scripted test that fires the trigger (rainfall sim, vehicle sim, offline/online toggle, seismic mock, speed anomaly sim) and asserts the resulting DB row, API response, and pushed event — not just that the endpoint returns 200.
- **Manual QA / rehearsal checklist:** run all 5 chains live on the deployed URL, not just localhost, before presenting.
- Do not mark any roadmap item "done" without its corresponding test passing.

## 17. Risks, Challenges & Governance Rules

| Risk | Mitigation |
|---|---|
| Data uncertainty (inconsistent/delayed feeds) | Multi-source validation |
| Prediction uncertainty (rare-disaster training data) | Multi-signal scoring, framed honestly as prototype-grade |
| Real-time reliability | Event-driven recalculation, not polling-only |
| Connectivity & scale in remote NER | Offline-first design, modular services |

**Non-negotiable rules for every builder/agent:**
1. Never present simulated/synthetic data as real government data.
2. Never present prototype synthetic ML training as production model performance.
3. Preserve the common architecture — new modules integrate into the existing risk/map/route/alert pipeline, never a parallel system.
4. GLOF stays a *trigger path*, not a separate app.
5. Keep the vehicle feedback loop bidirectional (tracking is both output and risk input).
6. Design for poor connectivity by default.
7. Treat geospatial data as first-class throughout.
8. Prefer fewer, fully-working end-to-end flows over many incomplete features.
9. Document every simulated/assumed component.
10. Verify time-sensitive facts (disaster stats, API availability) before using them in the final pitch.
11. Inspect the existing repo before creating new structure — do not overwrite what's already built.

## 18. Success Metrics

- All 5 chains demoable live, on the deployed public URL, without developer intervention mid-demo.
- UI visually matches the brand system in §8.
- No claim in the UI or pitch overstates prototype data as production/government-grade.
- Judges can open the link cold and see live state changes without any local setup.

## 19. References (verify before quoting numbers in a final pitch)

South Lhonak GLOF (North Sikkim, Oct 2023); NDMA post-2023 assessment of six Arunachal Pradesh glacial lakes; Nepal cascade event (Aug 26, 2026); The Economic Times (Manipur blockade); Govt. of Nagaland/DIPR (NH-29 landslides); PIB (Assam transport disruption; NER logistics policy); OpenWeatherMap, OSRM, PostGIS, Bhashini, Sentinel-2/Google Earth Engine, ISRO/NRSC documentation.

---
*End of PRD. See `NECKLINK_Master_Agent_Prompt.md` for the execution prompt built from this spec.*

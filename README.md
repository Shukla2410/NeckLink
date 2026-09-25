# NeckLink — NER Logistics & Accessibility Intelligence

NeckLink is a SIH prototype for moving essential supplies through the North Eastern Region: driver journeys, road accessibility, risk-aware routing, field reports and a shared dispatch view.

**The existing command centre is preserved.** The default screen is now a simpler, mobile-first driver workspace. Demo roads, deliveries and hazards are fictional/illustrative fixtures—not official road clearance or disaster forecasts.

[Detailed setup and data imports](SETUP.md) · [Verification and limitations](VERIFICATION.md) · [Original prototype overview](docs/ORIGINAL_README.md)

## What has been implemented

| Area | Current implementation |
|---|---|
| Driver experience | Large task buttons, vehicle selection, delivery destination/cargo/deadline, route checking, explicit GPS sharing, delivery progress and receiver confirmation. |
| Dispatch desk | Create/release deliveries, monitor stock and supply gaps, inspect district connections, review incidents and update verified road status. |
| Maps and routing | Leaflet corridor/route maps, imported district boundaries and facility points; closed roads and bridge weight restrictions excluded from route search. No fabricated route when the routing service fails. |
| Offline reporting | Geotagged reports, accuracy/observation time, compressed photos, persistent IndexedDB queue, retry status and idempotent server synchronization. Built app shell supports offline reopening. |
| Weather and risk | Open-Meteo past/forecast rainfall ingestion, optional OpenWeather conditions, labelled synthetic-model risk scores, multi-vehicle slowdown signals and alerts. |
| Language and voice | Starter English, Hindi and Assamese interface labels; Bhashini translation, dictation and speech integration. Unsupported/unconfigured language tasks have explicit fallback. |
| Notifications | Live SSE updates, alerts, configurable SMS/browser push, recipient subscriptions, retries and provider delivery tracking. External delivery disabled by default. |
| Accounts and data | Named accounts, salted password hashes, expiring sessions, role/assigned-vehicle permissions, audit events and transactional geographic imports. |
| Engineering | Additive schema migrations, isolated test database, dependency lockfiles, Docker app/ML definitions, GitHub Actions checks and browser tests. |

The original fleet, weather, GIS, GLOF and demo-simulation panels remain available through **Command centre**. GLOF is an illustrative scenario, not a validated warning model.

## Technology and repository layout

- **Web:** React 19, Vite, Leaflet, IndexedDB and a service worker.
- **API:** Node.js, Express, PostgreSQL, SSE/WebSockets, optional Twilio and Web Push.
- **ML/routing:** Python, FastAPI, scikit-learn Random Forest and NetworkX.
- **Database:** PostgreSQL 16 with PostGIS.

```text
apps/web/           Driver UI, dispatch desk and existing command centre
apps/api/           Authentication, REST API, realtime and integration workers
apps/ml-service/    Risk model, route graph, scenario calculations and tests
database/schema/    Ordered, additive SQL migrations
database/seeds/     Original seed source (destructive; demo databases only)
scripts/            Original simulation utilities
SETUP.md            Credentials, production accounts and import formats
VERIFICATION.md     Recorded test results and known limitations
```

## Run locally — recommended

Commands below are for macOS/Linux or WSL, from the repository root. Use **Node.js 22**, **Python 3.11** (the existing local environment uses 3.10) and Docker with Compose. Start Docker Desktop first if applicable.

### 1. Get the improved branch

If you already have this checkout, skip cloning.

```sh
git clone --branch feat/sih-driver-logistics-platform https://github.com/Arnav2580/NeckLink.git
cd NeckLink
npm ci --prefix apps/api
npm ci --prefix apps/web
python3.11 -m venv apps/ml-service/.venv
apps/ml-service/.venv/bin/python -m pip install -r apps/ml-service/requirements.lock.txt
```

If Python 3.11 is available as `python3` instead, substitute that executable when creating the virtual environment.

### 2. Configure the API and start PostGIS

On a fresh checkout, copy the example. **Do not overwrite an existing configured .env.**

```sh
cp apps/api/.env.example apps/api/.env
docker compose -p necklink_dev up -d postgres
docker compose -p necklink_dev ps
```

Wait for the database to be healthy, then:

```sh
npm run migrate
```

The example points to `127.0.0.1:55432/necklink`, with demo credentials `postgres/postgres`. API port is **5000**; ML port is **8000**. If you change Compose database credentials/ports, update the API connection strings too.

For a **new, disposable demo database only**, populate the sample roads, vehicles and operations:

```sh
ALLOW_DEMO_RESET=true npm run seed
npm run seed:operations
```

**Warning:** `npm run seed` truncates demo tables and dependent records. Never run it on operational data or as a routine restart step. Production mode forbids this reset. Migrations and `seed:operations` are additive.

Keep `APP_MODE=demo` and `DISABLE_EXTERNAL_DELIVERY=true` for local evaluation. Demo mode is intentionally open; do not expose it publicly.

### 3. Start the ML service — terminal A

```sh
apps/ml-service/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir apps/ml-service
```

### 4. Build and serve the UI — terminal B

```sh
npm run build:web
npm --prefix apps/api start
```

Open **http://127.0.0.1:5000**. The API serves the built frontend from the same origin. This is the recommended mode for testing offline/PWA behaviour.

Health checks:

```sh
curl http://127.0.0.1:5000/api/health
curl http://127.0.0.1:8000/health
```

On subsequent starts, start PostGIS and both services; rebuild the frontend only after frontend changes. **Do not reseed to restart.** Stop foreground servers with Ctrl+C. `docker compose -p necklink_dev stop postgres` stops the local database without deleting its volume.

### Development with live reload

Keep the ML service running. Replace the API start command with `npm run dev:api`; in another terminal run:

```sh
npm run dev:web
```

Open **http://localhost:5173**. Vite proxies `/api` to port 5000. Use the built app on port 5000—not the development server—for offline acceptance testing.

### Optional: all services in Docker

This deployment configuration is included, but the complete app/ML container build has not yet been verified; the local-process setup above was tested.

On a fresh checkout, copy `.env.example` to root `.env` and review its settings. Do not overwrite existing credentials. Then:

```sh
docker compose -p necklink_dev up --build -d
docker compose -p necklink_dev logs -f app ml
```

Do not run this alongside local API/ML processes on the same ports. For a new disposable demo database only:

```sh
docker compose -p necklink_dev exec -e ALLOW_DEMO_RESET=true app npm run seed
docker compose -p necklink_dev exec app npm run seed:operations
```

The local API reads `apps/api/.env`; Compose reads root `.env`. Neither is committed or copied into the images.

## Check the UI — manual walkthrough

Use demo mode with seeded data. These actions modify only your demo database.

### Driver screen — phone-sized view

1. Open port 5000. In browser developer tools, enable a **390 × 844** mobile viewport.
2. On **My journey**, select **AS-01-GC-4412 · MEDICAL** (vehicle ID `NL-MED-01`). The seeded delivery shows **60 boxes · Medical kits**, destination Gangtok and its deadline.
3. Select **Check route**, enter a loaded weight such as **12 tonnes**, then **Check this route**. Inspect the route map, estimated duration, restrictions and advisory. Exact results depend on current demo closures.
4. Start a released delivery, and use GPS sharing only after granting location permission. Keep the screen open; this is not background tracking.
5. Open **Report a problem**. Capture location (or enter known coordinates for a demo), add a photo and description, and save.
6. Open **Road alerts**. Check warning text and read/listen behaviour. Missing Bhashini/push configuration should produce a clear fallback/message, not a success claim.
7. Change the language to Hindi or Assamese and reload. The selection persists; some detailed text is still English.
8. Confirm a delivery only when actually testing completion; it requires receiver information and cannot simply be reversed.

Check for readable text, visible focus, large tap targets, no horizontal scrolling and clear loading/error feedback. Stop safely before interacting with the app while driving.

### Dispatch desk and original command centre

1. Select **Dispatch desk** in the top workspace switcher (available in demo mode or to an authorized account).
2. Inspect deliveries and inventory; add a fictional delivery and release it to a vehicle.
3. Open **District access** to inspect connectivity and facility locations. District polygons appear only after boundary data is imported.
4. Open **Reports & roads** to review submitted incidents and verified road statuses.
5. Open **Connections** for integration readiness, weather refresh, recipients and administrative setup/imports.
6. Select **Command centre** to inspect the retained GIS, fleet, routing and GLOF panels. Simulator actions alter demo data; their outputs are not observed disasters.

### Offline report test

1. Load the **built app** online and open Report a problem once. In DevTools → Application → Service Workers, wait for an active worker; reload to ensure it controls the page.
2. In DevTools → Network, choose **Offline**. Keep browser storage intact.
3. Enter coordinates and a uniquely worded report, then save. Expect a waiting-to-send count.
4. Reload while offline and reopen the report screen. The queued report should still be present.
5. Restore **Online**. The queue should synchronize; confirm exactly one matching report in Dispatch desk → Reports & roads.

Private shipment/inventory responses are not cached for offline use. Offline reopening does not mean offline routing or downloaded map tiles. Permission-restricted GPS/microphone/push on a real phone requires HTTPS; a laptop localhost URL is not reachable as localhost from another device.

## Run automated tests

Run from the repository root with PostGIS and the ML service running. Keep `APP_MODE=demo` and external delivery disabled.

### Unit and API/model tests

Set `TEST_DATABASE_URL` in `apps/api/.env` to a **dedicated disposable database ending in _test**. The example uses `necklink_test`. Setup creates it if needed (database-user permission required) and resets its fixtures:

```sh
npm --prefix apps/api run test:setup
npm run test:unit
npm run test:ml
npm run test:api
npm run build:web
npm --prefix apps/web run lint
```

`npm test` is a shortcut for ML + API tests only; it does not include Node unit or browser tests. API tests refuse an ordinary database name.

### Browser journeys and UI screenshots

Keep the built demo app running on port 5000, then:

```sh
npm exec --prefix apps/web -- playwright install chromium
npm --prefix apps/web run test:e2e
```

The browser suite checks mobile vehicle/route selection, offline reload and exactly-once sync, dispatch views, and language persistence/missing-provider feedback. It expects seeded demo records and disabled push delivery. It adds fictional reports: **never point it at production**.

Generated evidence (ignored by Git):

- `artifacts/driver-mobile.png`
- `artifacts/dispatch-desktop.png`
- `artifacts/browser-tests/` — failure screenshots/traces, if a test fails.

Override the base URL only for another disposable demo instance:

```sh
E2E_BASE_URL=http://127.0.0.1:5000 npm --prefix apps/web run test:e2e
```

**Recorded verification:** 12 API + 12 Python + 3 Node unit + 4 browser tests passed; frontend build passed. Live Open-Meteo ingestion succeeded for all 16 demo corridors while preserving closures. Lint exits successfully with warnings; hosted CI is not claimed as passed. See [VERIFICATION.md](VERIFICATION.md).

## Credentials and final setup

Core demo UI, routing, reporting and dispatch work without paid-provider keys.

| Capability | What to configure |
|---|---|
| Bhashini translation, speech and dictation | `BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `BHASHINI_PIPELINE_ID`; pipeline must support the selected task/language. |
| SMS alerts | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `ENABLE_SMS_DELIVERY=true`; add consented recipients. |
| Browser push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; HTTPS and browser permission. |
| Optional current weather strip | `OPENWEATHER_API_KEY`. |
| Scheduled Open-Meteo ingestion | `ENABLE_WEATHER_INGESTION=true`; the configured public endpoint needs no key. |
| Production accounts | Strong `ADMIN_PASSWORD`, `ADMIN_USERNAME`, `APP_MODE=production`, correct `DATABASE_URL` and `WEB_ORIGIN`, HTTPS. |
| Optional legacy Firebase mirror | `FIREBASE_DATABASE_URL`, `FIREBASE_DATABASE_SECRET`; not required for primary SSE updates. |

Only enable `DISABLE_EXTERNAL_DELIVERY=false` when ready to send real messages to agreed test recipients. Restart the API after configuration changes. Private credentials must never go in `VITE_*` variables.

For named accounts, configure the admin credentials and run `npm --prefix apps/api run create-admin`, then use production mode behind HTTPS. Create users through Dispatch desk → Connections; drivers need assigned vehicles. Detailed instructions and import examples are in [SETUP.md](SETUP.md).

## Troubleshooting

- **Port 5000 shows something else:** on macOS it may be AirPlay. Try the explicit `127.0.0.1` address and inspect which process owns the port. If changing API port, update the Vite proxy and browser-test base URL too.
- **Database connection fails:** check Docker is running, PostGIS is healthy and the API connection string uses host port 55432. Do not delete the volume to troubleshoot.
- **No demo vehicles/deliveries:** migrations create tables, not fixtures. Seed only if this is a new disposable demo database.
- **Route unavailable:** check ML health on port 8000. All allowed paths may also be blocked or over the load limit. Production mode excludes unverified demo links.
- **Offline reload fails:** build and load port 5000 online first, wait for the service worker, then reload before going offline.
- **Old UI after rebuilding:** reconnect online and reload to allow the new worker to activate. Do not clear site data while unsent reports exist.
- **Speech or push unavailable:** check Connections and credentials. Local HTTPS/permission requirements still apply; absence of a key is not reported as successful delivery.
- **Production login fails locally over HTTP:** production cookies are secure. Use HTTPS; use demo mode only for isolated local evaluation.

## What remains before real field deployment

This is an integrated SIH prototype, **not certified navigation or disaster-warning software**.

- Obtain verified, connected road/bridge data, district boundaries and authority feeds. Importing an API key does not supply a complete NER transport network.
- Validate the synthetic risk model against regional historical incidents, terrain and weather; evaluate false alarms and calibration. GLOF needs specialist validation and real attributed observations.
- Test with local drivers and speakers. Starter translations are not complete or professionally validated.
- Add a native/device integration for continuous background GPS. Current shipment ETA uses the full planned route, not map-matched remaining distance.
- Verify Bhashini, SMS and push using actual credentials and agreed recipients.
- Add deployment-specific backups, monitoring, recovery and security review; shared realtime/rate-limit infrastructure is needed for multiple API replicas. Review shared-device handling of offline reports.

The original project description is retained in [docs/ORIGINAL_README.md](docs/ORIGINAL_README.md) for history only. Its older setup instructions and live-data/model claims are superseded by this README and SETUP.md.

# NeckLink: run it, configure it, and demonstrate it

The existing command centre is preserved. The default landing screen is now a mobile driver workspace. The dispatch desk adds deliveries, stock monitoring, district access, incident review, account creation and data imports.

## Open the local build

The local app is served at **http://127.0.0.1:5000**. Port 5000 on some Macs is also used by AirPlay; use the explicit 127.0.0.1 address. PostGIS runs in Docker on **55432**, separate from an existing local PostgreSQL on 5432.

If restarting this checkout:

```sh
docker compose -p necklink_dev up -d postgres
npm run migrate
npm run build:web
npm --prefix apps/api start
```

In another terminal:

```sh
apps/ml-service/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir apps/ml-service
```

The ignored `apps/api/.env` in this checkout contains local demo database settings. External delivery is disabled. No third-party keys were invented or committed.

## Fresh installation

Use Node 22 and Python 3.10+. Install dependencies with `npm ci --prefix apps/api` and `npm ci --prefix apps/web`. Create `apps/ml-service/.venv`, then install `apps/ml-service/requirements.lock.txt` into it. Copy the API environment example into `apps/api/.env` and enter your database settings.

Run migrations before seeding. Only on a new, disposable demo database, run:

```sh
ALLOW_DEMO_RESET=true npm run seed
npm run seed:operations
```

**The original seed resets demo tables. Do not run it on an operational database.** Migrations and the operations seed are additive. `APP_MODE=production` disallows the original reset.

For container deployment, `docker compose up --build -d` builds the web app, API and ML service; the API serves the compiled frontend from the same origin. Configure root `.env` for Compose. The API's local `.env` is not copied into images. Populate a new demo container with `docker compose exec -e ALLOW_DEMO_RESET=true app npm run seed` followed by `docker compose exec app npm run seed:operations`.

## What you need to add

| Capability | Settings | Notes |
|---|---|---|
| Bhashini translation, dictation and speech | `BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `BHASHINI_PIPELINE_ID` | Get a pipeline supporting your chosen languages/tasks. The service obtains the inference URL and key from Pipeline Config. Unsupported pairs fall back to the original English text with a label. |
| SMS alerts | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `ENABLE_SMS_DELIVERY=true` | Register agreed recipients in Dispatch desk → Connections. Trial accounts may require verified recipient numbers. |
| Browser push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Generate once using `npx --prefix apps/api web-push generate-vapid-keys`; subject is a contact such as `mailto:team@example.org`. Use HTTPS, install/open the PWA and press Enable road notifications. |
| OpenWeather current conditions | `OPENWEATHER_API_KEY` | Optional weather strip. No fabricated weather appears when unavailable. |
| Scheduled forecast risk ingestion | `ENABLE_WEATHER_INGESTION=true` | Uses Open-Meteo hourly modelled rainfall with past and future 24-hour windows. No key required for the configured public endpoint; check provider usage/licensing before commercial deployment. Manual refresh is in Connections. |
| Operational deployment | `APP_MODE=production`, `DATABASE_URL`, `WEB_ORIGIN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | HTTPS is required for secure cookies, phone GPS, microphone and push. Use `TRUST_PROXY=true` only behind a trusted single reverse proxy. |
| Optional Firebase mirror | `FIREBASE_DATABASE_URL`, `FIREBASE_DATABASE_SECRET` | Disabled unless explicitly configured. Browser Firebase configuration uses `VITE_FIREBASE_*`; SSE is the primary live transport, so Firebase is not required. Review database rules before enabling any mirror. |

When ready to test real notifications, set **`DISABLE_EXTERNAL_DELIVERY=false`**. Keep it `true` during development and automated testing. Restart the API after environment changes. Vite variables require a rebuild. Never put private keys, Twilio tokens or Bhashini credentials in `VITE_*` variables.

Official provider references: [Bhashini configuration](https://bhashini.gitbook.io/bhashini-apis/pipeline-config-call), [Bhashini inference payloads](https://bhashini.gitbook.io/bhashini-apis/pipeline-compute-call/request-payload), [OpenWeather forecast API](https://openweathermap.org/api/forecast5), [Open-Meteo](https://open-meteo.com/en/docs).

## Accounts and permissions

Demo mode is deliberately open for local judging. Do not expose it as a secured deployment.

1. Set an administrator password of at least 12 characters and a username in the API environment.
2. Run `npm --prefix apps/api run create-admin` once. It will not replace an existing account.
3. Set `APP_MODE=production`, deploy behind HTTPS and sign in.
4. Under Dispatch desk → Connections, create named users. Driver accounts require a vehicle assignment.

Passwords use salted scrypt hashes; sessions are stored as hashed tokens in PostgreSQL and expire after eight hours. Driver GPS updates and delivery changes are restricted to the assigned vehicle. Dispatchers manage roads, deliveries and reports; only administrators manage accounts and production simulation endpoints. A role selected on the login form does not override the stored account role.

For a larger deployment, add account recovery, password rotation UI, organizational tenancy and deployment-specific monitoring/backups. Rate limits are process-local; use an upstream limit when running multiple instances. The realtime transports are process-local too; deploy one API replica or introduce a shared event broker before scaling horizontally.

## Driver walkthrough

1. Select your vehicle (assigned automatically for a named driver account).
2. Read the delivery destination, cargo and due time.
3. Check a route with total loaded vehicle weight. Closed roads and bridge weight restrictions are excluded. A missing route produces a clear error, never a invented route.
4. Start the released delivery; share GPS while this screen is open if desired.
5. Stop safely to report an obstruction: location → photo → notes or voice → save.
6. Confirm delivery with the receiver's name/reference.

GPS updates work while the browser is active; reliable background fleet tracking still requires a native/device tracker integration. The location endpoint can accept authenticated device integrations. Do not describe this PWA as continuous background tracking.

Offline reports, photos and observation times are stored in IndexedDB. Reopening a previously loaded production build offline works through its service worker. On reconnect the queue sends each report using a stable ID; duplicate requests do not create duplicate alerts. The app caches corridor choices, not sensitive shipment or inventory records. Map tiles are not bulk downloaded; cached reporting works without a basemap.

English, Hindi and Assamese have starter interface labels. Other language choices apply to alerts and Bhashini speech when supported; the interface explicitly identifies English fallback. Have local speakers review all operational language before field use.

## Import verified geographic and operational data

Dispatch desk → Connections accepts JSON through a transactional importer. Unrelated records are preserved. Every import requires a source and logs who imported it. Records with the same IDs are updated intentionally. Maximum 500 records / 4.5 MB per file. Coordinates use **WGS84 [longitude, latitude]**.

District example (geometry optional until you obtain licensed boundaries):

```json
{"kind":"districts","source":"Verified district dataset, date and licence","records":[{"id":"DISTRICT-ID","state_id":"AS","name":"Example district","connections":[{"corridor_id":"CORR-NH27","hub":"Guwahati"}],"geometry":{"type":"Polygon","coordinates":[[[91,26],[91.1,26],[91.1,26.1],[91,26.1],[91,26]]]}}]}
```

The polygon above is a format example, not an actual boundary. State IDs already seeded: AS, SK, ML, NL, MN, MZ, TR, AR and the WB gateway.

Bridge example:

```json
{"kind":"bridges","source":"Authority inspection reference and date","records":[{"id":"BRIDGE-ID","name":"Verified bridge name","corridor_id":"CORR-NH27","status":"RESTRICTED","max_weight_tonnes":18}]}
```

Facility example:

```json
{"kind":"facilities","source":"Verified facility register","records":[{"id":"FACILITY-ID","name":"Verified facility","district_id":"DISTRICT-ID","type":"HOSPITAL","hub":"Guwahati","lat":26.15,"lng":91.75}]}
```

Corridor example:

```json
{"kind":"corridors","source":"Verified road survey and timestamp","records":[{"id":"ROAD-ID","name":"Verified connector","code":"Local road","origin":"Supply hub","destination":"Village","state":"Assam","distance_km":12,"status":"OPEN","max_weight_tonnes":15,"coordinates":[[91.75,26.15],[91.8,26.2]]}]}
```

Import intersection-to-intersection segments with consistent endpoint names to build a connected route network. Production routing uses only verified database corridors and disables hardcoded demo links. It does not magically acquire the complete NER road network when an API key is added.

District access is derived from mapped supply connections and bridge closures. Missing/stale connectivity becomes UNKNOWN. It is a coverage-limited indicator, not a full district isolation survey. Consider authorized NDEM/NRSC, state PWD and transport data agreements; no unrestricted government feed is assumed.

## Model and GLOF limitations that remain

The synthetic Random Forest is versioned and labelled as a risk **index**, not a calibrated disaster probability. Run `apps/ml-service/.venv/bin/python apps/ml-service/evaluate.py` for an independent synthetic-seed regression evaluation. Real-world prediction needs historical incident labels, terrain/rainfall observations, time and geographic holdouts, false-alarm evaluation and calibration. This cannot be replaced by an API key.

GLOF is retained as an illustrative scenario. Stored observations drive the panel; new lake observations can be posted to `/api/glacial-lakes/:id/observations`. Only the configured South Lhonak scenario has downstream targets; other lakes do not silently reuse Teesta arrivals. There is no validated hydrodynamic model or automatic satellite segmentation. Add attributed imagery/observations and obtain expert validation before using it for emergency decisions.

Shipment arrival estimates currently use the full planned route, rather than map-matched remaining distance. The monitor flags deadline risk for dispatcher review. The platform is not turn-by-turn navigation.

## Tests

Use a separate database ending in `_test`; API tests refuse an ordinary database.

```sh
npm --prefix apps/api run test:setup
npm run test:unit
npm run test:ml
npm run test:api
npm run build:web
npm --prefix apps/web run test:e2e
```

`test:setup` resets only the configured disposable test database. Browser tests use the running demo URL (override `E2E_BASE_URL`) and add fictional test reports. Do not point them at production. Install Chromium first with `npx --prefix apps/web playwright install chromium`.

The automated checks cover closure exclusion, no-route handling, load restrictions, imported geometry, invalid inputs, named-account access, atomic data imports, repeated offline requests, shipment transitions, mobile layout, offline reload/reconnect and language persistence. Provider integration contracts are implemented, but real SMS, push and Bhashini outputs must be verified with your own credentials and agreed test recipients.

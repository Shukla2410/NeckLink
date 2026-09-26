# Local verification — 25 September 2026

The integrated local build is running at http://127.0.0.1:5000, with the ML service on 8000 and an isolated Docker PostGIS on 55432. Existing application modules are retained. This is a working SIH prototype, not a certified emergency-routing system.

## Completed checks

- Production frontend build: passed.
- API integration tests: 12 passed, using a dedicated `necklink_test` database.
- Python routing/model/scenario tests: 12 passed.
- Node fallback/translation unit tests: 3 passed.
- Chromium browser journeys: 4 passed (mobile route selection, offline reload and exactly-once report sync, dispatch overview, language persistence and missing-provider messaging).
- Live Open-Meteo ingestion: all 16 configured demonstration corridors returned valid rainfall windows; blocked and GLOF-closed roads remained closed.
- API health and database connectivity: passed.
- Compose configuration and `git diff --check`: passed.
- Frontend lint: exit 0 with warnings, principally unused legacy variables and React effect/purity guidance. Python emits one upstream test-client deprecation warning.

Browser evidence is generated locally in `artifacts/driver-mobile.png` and `artifacts/dispatch-desktop.png`. These are ignored test artifacts, not committed project assets.

## Not verified or not yet field-ready

- Bhashini, SMS and browser push need real credentials and consented test recipients. No external notifications were sent.
- The complete Docker app/ML image build and GitHub-hosted CI execution have not been exercised; local processes and the Docker database were tested.
- Real phone GPS/microphone permissions, background restrictions, install behaviour and local-language comprehension need device/user trials. Browser testing used Chromium.
- The risk model is trained on synthetic data. GLOF outputs are illustrative scenarios. Neither has regional scientific validation.
- Production road routing requires a connected, verified road/bridge dataset. Demo links are deliberately excluded in production mode.
- GPS reporting operates while the web app is active; continuous background tracking needs a tracker/native integration.
- Shipment arrival estimates currently use the full route, not remaining map-matched distance.
- Starter interface translations cover English, Hindi and Assamese; other selections have labelled English UI fallback. Local-language review remains necessary.
- Large-scale deployment still needs shared realtime/rate-limit infrastructure, backups, monitoring, account recovery and a security review. Offline report storage is device-local: use dedicated devices/accounts and review shared-device handling before field rollout.

See [SETUP.md](SETUP.md) for credentials, startup, production accounts, data imports and the driver walkthrough.

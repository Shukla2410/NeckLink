import { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  Truck,
  Navigation,
  AlertTriangle,
  MapPin,
  Volume2,
  PackageCheck,
  RefreshCw,
  Wifi,
  WifiOff,
  ArrowRight,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { api, API_BASE } from "../utils/api";
import { languages, t, interfaceSupported } from "../utils/i18n";
import { syncQueuedIncidents } from "../utils/offlineQueue";
import ReportForm from "./ReportForm";
import OperationsDesk from "./OperationsDesk";
import EnableNotifications from "./EnableNotifications";
import "../product.css";
const RouteMap = lazy(() => import("./RouteMap"));
const CommandCenter = lazy(() => import("../App"));
const empty = {
  shipments: [],
  facilities: [],
  inventory: [],
  districts: [],
  bridges: [],
  incidents: [],
};
export default function JourneyApp() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("necklink-language") || "en",
  );
  const [view, setView] = useState("driver"),
    [task, setTask] = useState("journey"),
    [session, setSession] = useState(null),
    [sessionLoaded, setSessionLoaded] = useState(false);
  const [online, setOnline] = useState(navigator.onLine),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [updated, setUpdated] = useState(null),
    [cached, setCached] = useState(false);
  const [data, setData] = useState(empty),
    [roads, setRoads] = useState([]),
    [vehicles, setVehicles] = useState([]),
    [alerts, setAlerts] = useState([]),
    [integrations, setIntegrations] = useState(null);
  const [vehicleId, setVehicleId] = useState(
      () => localStorage.getItem("necklink-vehicle") || "",
    ),
    [tracking, setTracking] = useState(false),
    [trackingError, setTrackingError] = useState("");
  const watch = useRef(null),
    refreshing = useRef(false);
  const currentVehicle = vehicles.find((v) => v.id === vehicleId);
  async function refresh() {
    if (refreshing.current) return;
    refreshing.current = true;
    setError("");
    try {
      const responses = await Promise.all([
        api("/api/operations/overview"),
        api("/api/roads"),
        api("/api/vehicles"),
        api("/api/alerts"),
        api("/api/integrations/status"),
      ]);
      setData(responses[0]);
      setRoads(responses[1].roads);
      setVehicles(responses[2].vehicles);
      setAlerts(responses[3].alerts);
      setIntegrations(responses[4]);
      setUpdated(new Date());
      setCached(false);
      // Only public road choices are retained for offline reporting; no fleet or medical cargo cache.
      localStorage.setItem(
        "necklink-road-cache",
        JSON.stringify({
          roads: responses[1].roads,
          at: new Date().toISOString(),
        }),
      );
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setSession(null);
      try {
        const saved = JSON.parse(
          localStorage.getItem("necklink-road-cache") || "null",
        );
        if (saved) {
          setRoads(saved.roads);
          setUpdated(new Date(saved.at));
          setCached(true);
        }
      } catch {
        /* storage may be unavailable */
      }
    } finally {
      refreshing.current = false;
      setLoading(false);
    }
  }
  useEffect(() => {
    api("/api/auth/session")
      .then((s) => {
        setSession(s.role ? s : null);
        if (s.user?.vehicle_id) {
          setVehicleId(s.user.vehicle_id);
          localStorage.setItem("necklink-vehicle", s.user.vehicle_id);
        }
        if (s.role) refresh();
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
        setCached(true);
        try {
          const saved = JSON.parse(
            localStorage.getItem("necklink-road-cache") || "null",
          );
          if (saved) setRoads(saved.roads);
        } catch {}
      })
      .finally(() => setSessionLoaded(true));
  }, []);
  useEffect(() => {
    const up = () => {
      setOnline(true);
      api("/api/auth/session")
        .then((s) => {
          if (s.role) setSession(s);
        })
        .catch(() => {});
      syncQueuedIncidents()
        .then(() => {
          window.dispatchEvent(new Event("necklink-synced"));
          refresh();
        })
        .catch(() => {});
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    refresh();
    syncQueuedIncidents().catch(() => {});
    let timer;
    const events = new EventSource(`${API_BASE}/api/events`, {
      withCredentials: true,
    });
    events.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (!["HEARTBEAT", "INIT"].includes(event.type)) {
          clearTimeout(timer);
          timer = setTimeout(refresh, 500);
        }
      } catch {}
    };
    events.onopen = () => refresh();
    const poll = setInterval(refresh, 60000);
    return () => {
      events.close();
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, [session]);
  useEffect(
    () => () => {
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
    },
    [],
  );
  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem("necklink-language", value);
    document.documentElement.lang = value;
  }
  function shareLocation() {
    setTrackingError("");
    if (tracking) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
      setTracking(false);
      return;
    }
    if (!currentVehicle) return setTrackingError("Choose your vehicle first");
    if (!navigator.geolocation)
      return setTrackingError(
        "Location requires a supported browser and HTTPS",
      );
    let last = 0;
    watch.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (Date.now() - last < 10000) return;
        last = Date.now();
        try {
          await api(`/api/vehicles/${currentVehicle.id}/location`, {
            method: "POST",
            body: JSON.stringify({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              speed: Math.max(0, (p.coords.speed || 0) * 3.6),
              heading: p.coords.heading || 0,
            }),
          });
          setTrackingError("");
        } catch (e) {
          setTrackingError("Location not sent: " + e.message);
        }
      },
      () => {
        setTrackingError("Location permission denied or GPS unavailable");
        setTracking(false);
        if (watch.current !== null)
          navigator.geolocation.clearWatch(watch.current);
        watch.current = null;
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
    setTracking(true);
  }
  const myShipments = data.shipments.filter(
    (s) => s.vehicle_id === vehicleId && s.status !== "DELIVERED",
  );
  const canDispatch = ["demo", "dispatcher", "admin"].includes(session?.role);
  if (!sessionLoaded) return <div className="splash">Opening NeckLink…</div>;
  if (!session && online && !cached)
    return <Login onLogin={setSession} error={error} />;
  return (
    <div className="product-shell">
      <header className="product-header">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("driver");
          }}
          className="wordmark"
        >
          <span className="brand-icon">
            <Truck />
          </span>
          <span>
            NECKLINK<small>Every essential delivery matters</small>
          </span>
        </a>
        <div className="header-tools">
          <label className="language-select">
            <span>{t(language, "language")}</span>
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              {languages.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {session && !session.demo && (
            <button
              aria-label="Sign out"
              className="icon-button"
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" });
                if (watch.current !== null)
                  navigator.geolocation.clearWatch(watch.current);
                watch.current = null;
                setTracking(false);
                setSession(null);
                setData(empty);
                setVehicles([]);
                setAlerts([]);
              }}
            >
              <LogOut />
            </button>
          )}
        </div>
      </header>
      <div className="connection-strip">
        <span className={online ? "connected" : "disconnected"}>
          {online ? <Wifi size={15} /> : <WifiOff size={15} />}{" "}
          {online ? t(language, "online") : t(language, "offline")}
        </span>
        <span>
          {integrations?.demo || session?.demo ? "DEMO DATA · " : ""}
          {cached ? "Cached roads · " : ""}
          {updated
            ? `Updated ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Connecting to services"}
        </span>
        <button
          className="text-button"
          onClick={refresh}
          aria-label="Refresh data"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {!interfaceSupported(language) && (
        <p className="language-note">
          Menu text is shown in English. Alert translation and voice depend on
          Bhashini language availability.
        </p>
      )}
      {canDispatch && (
        <nav className="workspace-tabs" aria-label="Workspace">
          {[
            ["driver", t(language, "driver")],
            ["operations", t(language, "operations")],
            ["command", t(language, "command")],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-current={view === key ? "page" : undefined}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {error && (
        <div className="notice danger page-notice" role="alert">
          {error}
          <button className="text-button" onClick={refresh}>
            Retry
          </button>
        </div>
      )}
      {view === "command" && canDispatch ? (
        <Suspense fallback={<p>Loading command centre…</p>}>
          <CommandCenter />
        </Suspense>
      ) : view === "operations" && canDispatch ? (
        <OperationsDesk
          data={data}
          roads={roads}
          vehicles={vehicles}
          integrations={integrations}
          refresh={refresh}
        />
      ) : (
        <main className="driver-main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">NECKLINK FOR DRIVERS</span>
              <h1>{t(language, "home")}</h1>
              <p>{t(language, "safety")}</p>
            </div>
            <ShieldCheck className="heading-icon" size={44} />
          </div>
          <nav className="task-tabs" aria-label="Driver tasks">
            {[
              ["journey", Truck, t(language, "delivery")],
              ["route", Navigation, t(language, "route")],
              ["report", AlertTriangle, t(language, "report")],
              ["alerts", Volume2, t(language, "alerts")],
            ].map(([key, Icon, label]) => (
              <button
                key={key}
                aria-current={task === key ? "page" : undefined}
                onClick={() => setTask(key)}
              >
                <Icon size={23} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          {task === "journey" && (
            <>
              <section className="product-card vehicle-picker">
                <label>
                  Your vehicle
                  <select
                    value={vehicleId}
                    onChange={(e) => {
                      if (tracking) shareLocation();
                      setVehicleId(e.target.value);
                      localStorage.setItem("necklink-vehicle", e.target.value);
                    }}
                  >
                    <option value="">Choose vehicle number</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number} · {v.type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={`action ${tracking ? "secondary" : "primary"}`}
                  disabled={!vehicleId || !online}
                  onClick={shareLocation}
                >
                  <MapPin />
                  {tracking ? t(language, "stop") : t(language, "gps")}
                </button>
                <small>
                  Shares location while this screen stays open. Keep your phone
                  charged. Background tracking is not guaranteed.
                </small>
                {trackingError && (
                  <p role="alert" className="notice danger">
                    {trackingError}
                  </p>
                )}
              </section>
              {loading ? (
                <p>{t(language, "loading")}</p>
              ) : myShipments.length ? (
                myShipments.map((s) => (
                  <DeliveryCard
                    key={s.id}
                    shipment={s}
                    language={language}
                    onChange={refresh}
                    onRoute={() => setTask("route")}
                  />
                ))
              ) : (
                <section className="empty-state">
                  <PackageCheck size={40} />
                  <h2>
                    {vehicleId
                      ? t(language, "empty")
                      : "Choose your vehicle to see deliveries"}
                  </h2>
                  <p>Your dispatcher adds deliveries at the dispatch desk.</p>
                </section>
              )}
            </>
          )}
          {task === "route" && (
            <RoutePlanner
              language={language}
              roads={roads}
              shipment={myShipments[0]}
            />
          )}
          {task === "report" && (
            <ReportForm
              language={language}
              corridors={roads}
              onSyncComplete={refresh}
            />
          )}
          {task === "alerts" && (
            <div className="alert-stack">
              <EnableNotifications
                integrations={integrations}
                language={language}
                corridorId={currentVehicle?.corridor_id}
              />
              {alerts
                .filter(
                  (a) =>
                    !a.acknowledged_at &&
                    (!a.corridor_id ||
                      !currentVehicle ||
                      a.corridor_id === currentVehicle.corridor_id),
                )
                .map((a) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    language={language}
                    refresh={refresh}
                  />
                ))}
              {!alerts.length && (
                <section className="empty-state">
                  <ShieldCheck />
                  <h2>No alerts loaded</h2>
                  <p>
                    Check the connection and last update time before setting
                    out.
                  </p>
                </section>
              )}
            </div>
          )}
        </main>
      )}
      <footer className="product-footer">
        NeckLink · North East logistics & accessibility{" "}
        <span>
          Route estimates support planning. Follow official closures and local
          directions.
        </span>
      </footer>
    </div>
  );
}
function Login({ onLogin, error }) {
  const [role, setRole] = useState("driver"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [problem, setProblem] = useState(error),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-screen">
      <form
        className="product-card form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ role, password, username }),
            });
            onLogin(await api("/api/auth/session"));
          } catch (e) {
            setProblem(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Truck size={40} />
        <h1>Welcome to NeckLink</h1>
        <p>Sign in to view your deliveries and road updates.</p>
        <label>
          Username
          <input
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Your role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="driver">Driver</option>
            <option value="field">Field officer</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {problem && <p role="alert">{problem}</p>}
        <button className="action primary" disabled={busy}>
          Sign in
        </button>
      </form>
    </main>
  );
}
function DeliveryCard({ shipment: s, language, onChange, onRoute }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState("");
  const closed = ["BLOCKED", "GLOF_ALERT"].includes(s.road_status),
    late = s.deadline && new Date(s.deadline) < new Date();
  async function status(value) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/operations/shipments/${s.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: value, delivery_note: note }),
      });
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="product-card delivery-card">
      <div className="card-topline">
        <span className={`badge ${closed || late ? "warning" : "good"}`}>
          {s.status.replaceAll("_", " ")}
        </span>
        <span>{s.priority === "URGENT" ? "Urgent delivery" : s.priority}</span>
      </div>
      <h2>{s.destination}</h2>
      <p className="delivery-cargo">
        {s.quantity} {s.unit} · {s.cargo}
      </p>
      <div className="route-line">
        <span>{s.origin}</span>
        <ArrowRight />
        <strong>{s.destination}</strong>
      </div>
      <dl className="delivery-details">
        <div>
          <dt>Deliver to</dt>
          <dd>{s.facility_name || s.destination}</dd>
        </div>
        <div>
          <dt>Due by</dt>
          <dd>
            {s.deadline
              ? new Date(s.deadline).toLocaleString()
              : "Not specified"}
          </dd>
        </div>
      </dl>
      {closed && (
        <p className="notice danger">
          <AlertTriangle />
          Your current road is closed. Stop safely and check an alternative with
          your dispatcher.
        </p>
      )}
      {late && (
        <p className="notice">
          Delivery is overdue. Please update your dispatcher.
        </p>
      )}
      {s.gps_updated_at && Date.now() - new Date(s.gps_updated_at) > 300000 && (
        <p className="muted">Vehicle location is over 5 minutes old.</p>
      )}
      <button className="action secondary" onClick={onRoute}>
        <Navigation />
        {t(language, "route")}
      </button>
      {s.status === "PLANNED" ? (
        <p className="muted">
          Waiting for your dispatcher to release this delivery.
        </p>
      ) : ["DISPATCHED", "DELAYED"].includes(s.status) ? (
        <button
          disabled={busy || closed}
          className="action primary"
          onClick={() => status("IN_TRANSIT")}
        >
          {t(language, "start")}
        </button>
      ) : (
        <>
          <label>
            Receiver name / delivery reference
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Name of person receiving the goods"
            />
          </label>
          <div className="two-col">
            <button
              className="action primary"
              disabled={busy || !note.trim()}
              onClick={() => status("DELIVERED")}
            >
              <PackageCheck />
              {t(language, "delivered")}
            </button>
            <button
              className="action secondary"
              disabled={busy}
              onClick={() => status("DELAYED")}
            >
              I am delayed
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
export function RoutePlanner({ language = "en", roads = [], shipment }) {
  const hubs = [
    ...new Set(roads.flatMap((r) => [r.origin, r.destination])),
  ].sort();
  const [origin, setOrigin] = useState(shipment?.origin || "Siliguri"),
    [destination, setDestination] = useState(
      shipment?.destination || "Gangtok",
    ),
    [weight, setWeight] = useState(""),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="product-card">
      <h2>{t(language, "route")}</h2>
      <p className="muted">
        Closed roads are excluded. Enter total loaded vehicle weight for bridge
        limits.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setResult(null);
          try {
            const r = await api("/api/routes/calculate", {
              method: "POST",
              body: JSON.stringify({
                origin,
                destination,
                risk_weight: 4,
                vehicle_weight_tonnes: Number(weight),
              }),
            });
            setResult(r.result);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="two-col">
          <label>
            {t(language, "origin")}
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {[...new Set([origin, ...hubs])].map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <label>
            {t(language, "destination")}
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              {[...new Set([destination, ...hubs])].map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Loaded vehicle weight (tonnes)
          <input
            type="number"
            required
            min="0.1"
            max="200"
            step="0.1"
            placeholder="For example: 12"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <button
          className="action primary"
          disabled={busy || origin === destination}
        >
          <Navigation />
          {busy ? "Checking roads…" : t(language, "plan")}
        </button>
      </form>
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="route-result" role="status">
          <span className="badge good">
            {result.is_rerouted ? "Alternative route found" : "Route available"}
          </span>
          <h3>{result.optimal_route.path_nodes.join(" → ")}</h3>
          <div className="route-metrics">
            <strong>{result.optimal_route.distance_km} km</strong>
            <strong>
              About {Math.round(result.optimal_route.eta_hours * 60)} minutes
            </strong>
          </div>
          <p>{result.reroute_reason}</p>
          <Suspense fallback={<p>Loading route map…</p>}>
            <RouteMap route={result} />
          </Suspense>
          <p className="muted">
            Risk index: {Math.round(result.optimal_route.peak_risk_score * 100)}
            /100 · prototype estimate
          </p>
          <p className="notice">{result.advisory}</p>
        </div>
      )}
    </section>
  );
}
export function AlertCard({ alert: a, language, refresh }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [read, setRead] = useState(
      () => localStorage.getItem("necklink-read-" + a.id) === "true",
    );
  const fallback =
    a.translations?._meta?.languages?.[language] === "ENGLISH_FALLBACK";
  const text = a.translations?.[language] || a.message;
  async function listen() {
    setBusy(true);
    setError("");
    try {
      const actualLanguage = fallback ? "en" : language;
      const result = await api("/api/language/speak", {
        method: "POST",
        body: JSON.stringify({ text, language: actualLanguage }),
      });
      await new Audio(
        `data:audio/${result.format};base64,${result.audio}`,
      ).play();
    } catch (e) {
      const speech = globalThis.speechSynthesis;
      const voice = speech
        ?.getVoices()
        .find((v) => v.lang.startsWith(fallback ? "en" : language));
      if (voice) {
        speech.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        speech.speak(utterance);
        setError("Using the voice installed on this device.");
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="product-card">
      <div className="card-topline">
        <span className="badge warning">{a.severity}</span>
        <small>
          {a.created_at ? new Date(a.created_at).toLocaleString() : "New alert"}
        </small>
      </div>
      <h2>{a.title}</h2>
      <p className="alert-message">{text}</p>
      {fallback && language !== "en" && (
        <p className="muted">
          Translation unavailable. Original English message shown.
        </p>
      )}
      <div className="two-col">
        <button className="action secondary" disabled={busy} onClick={listen}>
          <Volume2 />
          {t(language, "listen")}
        </button>
        <button
          className="action secondary"
          disabled={read}
          onClick={() => {
            localStorage.setItem("necklink-read-" + a.id, "true");
            setRead(true);
          }}
        >
          {read ? "Read on this phone" : "I have read this"}
        </button>
      </div>
      {error && (
        <p role="status" className="muted">
          {error}
        </p>
      )}
    </article>
  );
}

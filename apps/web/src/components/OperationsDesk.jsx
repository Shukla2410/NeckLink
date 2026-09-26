import { useState, lazy, Suspense } from "react";
import {
  Package,
  MapPin,
  AlertTriangle,
  CloudRain,
  Settings,
  Plus,
  CheckCircle,
} from "lucide-react";
import { api } from "../utils/api";
import AdminSetup from "./AdminSetup";
import NotificationAdmin from "./NotificationAdmin";
const DistrictMap = lazy(() => import("./DistrictMap"));
export default function OperationsDesk({
  data,
  roads,
  vehicles,
  integrations,
  refresh,
}) {
  const [tab, setTab] = useState("deliveries"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(path, body, method = "POST") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(path, { method, body: JSON.stringify(body) });
      setMessage("Saved successfully");
      refresh();
      return result;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitShipment(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.deadline) f.deadline = new Date(f.deadline).toISOString();
    const result = await action("/api/operations/shipments", f);
    if (result) e.target.reset();
  }
  return (
    <main className="operations-main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DELIVERIES · PEOPLE · PLACES</span>
          <h1>Dispatch desk</h1>
          <p>Keep essential supplies moving and respond to interruptions.</p>
        </div>
      </div>
      <div className="summary-grid">
        {[
          [
            "Deliveries in progress",
            data.shipments.filter((s) => s.status !== "DELIVERED").length,
          ],
          [
            "Low stock facilities",
            new Set(
              data.inventory
                .filter((i) => Number(i.days_remaining) < 3)
                .map((i) => i.facility_id),
            ).size,
          ],
          [
            "Districts needing attention",
            data.districts.filter((d) => d.accessibility !== "ACCESSIBLE")
              .length,
          ],
          [
            "Reports to review",
            data.incidents.filter((i) => i.workflow_status === "SUBMITTED")
              .length,
          ],
        ].map(([label, value]) => (
          <div className="summary-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <nav className="workspace-tabs" aria-label="Dispatch sections">
        {[
          ["deliveries", Package, "Deliveries"],
          ["districts", MapPin, "District access"],
          ["reports", AlertTriangle, "Reports & roads"],
          ["settings", Settings, "Connections"],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {tab === "deliveries" && (
        <>
          <div className="operations-grid">
            <section className="product-card">
              <h2>
                <Plus size={22} /> Add a delivery
              </h2>
              <form className="form-stack" onSubmit={submitShipment}>
                <label>
                  Vehicle
                  <select name="vehicle_id" required>
                    <option value="">Choose vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number} · {v.operator}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="two-col">
                  <label>
                    From
                    <input
                      name="origin"
                      required
                      list="hubs"
                      placeholder="Siliguri"
                    />
                  </label>
                  <label>
                    To
                    <input
                      name="destination"
                      required
                      list="hubs"
                      placeholder="Gangtok"
                    />
                  </label>
                </div>
                <datalist id="hubs">
                  {[
                    ...new Set(roads.flatMap((r) => [r.origin, r.destination])),
                  ].map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </datalist>
                <label>
                  Receiving facility
                  <select name="facility_id">
                    <option value="">Other / not listed</option>
                    {data.facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Goods
                  <input
                    name="cargo"
                    required
                    placeholder="Medicines, rice, vegetables…"
                  />
                </label>
                <div className="two-col">
                  <label>
                    Quantity
                    <input
                      name="quantity"
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                    />
                  </label>
                  <label>
                    Unit
                    <select name="unit">
                      <option>boxes</option>
                      <option>kg</option>
                      <option>tonnes</option>
                      <option>litres</option>
                    </select>
                  </label>
                </div>
                <div className="two-col">
                  <label>
                    Priority
                    <select name="priority">
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent / medical</option>
                    </select>
                  </label>
                  <label>
                    Deliver before
                    <input name="deadline" type="datetime-local" required />
                  </label>
                </div>
                <button disabled={busy} className="action primary">
                  Create delivery
                </button>
              </form>
            </section>
            <section className="product-card">
              <h2>Supplies that need attention</h2>
              {!data.inventory.length && <p>No stock records yet.</p>}
              {data.inventory.map((i) => (
                <div className="stock-item" key={i.facility_id + i.commodity}>
                  <div>
                    <strong>{i.facility_name}</strong>
                    <p>
                      {i.commodity} · {i.quantity} {i.unit}
                    </p>
                  </div>
                  <span
                    className={`badge ${Number(i.days_remaining) < 3 ? "warning" : "good"}`}
                  >
                    {i.days_remaining} days left
                  </span>
                </div>
              ))}
              <details>
                <summary>Update stock</summary>
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(
                      "/api/operations/inventory",
                      Object.fromEntries(new FormData(e.currentTarget)),
                      "PATCH",
                    );
                  }}
                >
                  <label>
                    Facility
                    <select name="facility_id" required>
                      {data.facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Commodity
                    <input name="commodity" required />
                  </label>
                  <div className="two-col">
                    <label>
                      Quantity
                      <input name="quantity" type="number" min="0" required />
                    </label>
                    <label>
                      Daily use
                      <input
                        name="daily_usage"
                        type="number"
                        min="0.1"
                        step="0.1"
                        required
                      />
                    </label>
                  </div>
                  <button disabled={busy} className="action secondary">
                    Update stock
                  </button>
                </form>
              </details>
            </section>
          </div>
          <section className="product-card">
            <h2>All deliveries</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Goods</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shipments.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.cargo}
                        <small>
                          {s.quantity} {s.unit}
                        </small>
                      </td>
                      <td>
                        {s.origin} → {s.destination}
                      </td>
                      <td>{s.plate_number}</td>
                      <td>
                        <span className="badge">{s.status}</span>
                      </td>
                      <td>
                        {s.deadline
                          ? new Date(s.deadline).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        {s.status === "PLANNED" ? (
                          <button
                            disabled={busy}
                            className="text-button"
                            onClick={() =>
                              action(
                                `/api/operations/shipments/${s.id}/status`,
                                { status: "DISPATCHED" },
                                "PATCH",
                              )
                            }
                          >
                            Release to driver
                          </button>
                        ) : (
                          s.delivery_note || "Driver updates progress"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {tab === "districts" && (
        <>
          <Suspense fallback={<p>Loading district map…</p>}>
            <DistrictMap
              districts={data.districts}
              facilities={data.facilities}
            />
          </Suspense>
          <p className="notice">
            Accessibility reflects the mapped links to supply hubs, not every
            road in the district. Old or missing reports appear as unknown.
          </p>
          <div className="district-grid">
            {data.districts.map((d) => (
              <article key={d.id} className="product-card">
                <span
                  className={`badge ${d.accessibility === "ACCESSIBLE" ? "good" : "warning"}`}
                >
                  {d.accessibility}
                </span>
                <h2>{d.name}</h2>
                <p>{d.state}</p>
                {d.connections.map((c) => (
                  <div className="stock-item" key={c.corridor_id}>
                    <span>
                      {c.hub} · {c.corridor_id}
                    </span>
                    <span>{c.status.replaceAll("_", " ")}</span>
                  </div>
                ))}
                {!d.connections.length && (
                  <p className="muted">No mapped supply connection yet.</p>
                )}
              </article>
            ))}
          </div>
          <section className="product-card">
            <h2>Bridges & vehicle limits</h2>
            {data.bridges.length ? (
              data.bridges.map((b) => (
                <div className="stock-item" key={b.id}>
                  <span>
                    {b.name} · {b.corridor_id}
                  </span>
                  <strong>
                    {b.status} · {b.max_weight_tonnes || "Unspecified"} tonnes
                  </strong>
                </div>
              ))
            ) : (
              <p>Import verified bridge restrictions before operational use.</p>
            )}
          </section>
        </>
      )}
      {tab === "reports" && (
        <div className="operations-grid">
          <section className="product-card">
            <h2>Field reports</h2>
            {data.incidents.map((i) => (
              <article className="report-review" key={i.id}>
                <span className="badge">{i.workflow_status}</span>
                <h3>
                  {i.type.replaceAll("_", " ")} · {i.corridor_id}
                </h3>
                <p>{i.description}</p>
                <small>
                  Observed{" "}
                  {new Date(i.observed_at || i.created_at).toLocaleString()}
                </small>
                {i.image_ref && (
                  <img
                    src={i.image_ref}
                    className="report-photo"
                    alt="Field report evidence"
                  />
                )}
                <label>
                  Review status
                  <select
                    value={i.workflow_status}
                    onChange={(e) =>
                      action(
                        `/api/operations/incidents/${i.id}`,
                        { workflow_status: e.target.value },
                        "PATCH",
                      )
                    }
                    disabled={busy}
                  >
                    {[
                      "SUBMITTED",
                      "VERIFIED",
                      "ASSIGNED",
                      "RESOLVED",
                      "REJECTED",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </section>
          <section className="product-card">
            <h2>Verified road status</h2>
            <p className="muted">
              Reopen a road only after checking the latest field information.
            </p>
            {roads.map((r) => (
              <label className="road-control" key={r.id}>
                {r.code} · {r.origin} → {r.destination}
                <select
                  value={r.status}
                  disabled={busy}
                  onChange={(e) =>
                    action(
                      `/api/operations/roads/${r.id}`,
                      { status: e.target.value },
                      "PATCH",
                    )
                  }
                >
                  {["OPEN", "AT_RISK", "BLOCKED", "GLOF_ALERT"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        </div>
      )}
      {tab === "settings" && (
        <div className="operations-grid">
          <section className="product-card">
            <h2>Service connections</h2>
            {[
              ["Bhashini translation & voice", integrations?.bhashini],
              ["Automatic SMS delivery", integrations?.sms],
            ].map(([name, ready]) => (
              <div className="stock-item" key={name}>
                <span>{name}</span>
                <span className={`badge ${ready ? "good" : "warning"}`}>
                  {ready ? "Configured" : "Needs credentials"}
                </span>
              </div>
            ))}
            <p className="muted">
              Current model: synthetic training data. Road graph: demonstration
              coverage. Provider delivery is not implied by creating an alert.
            </p>
            <button
              disabled={busy}
              className="action secondary"
              onClick={async () => {
                const r = await action("/api/integrations/weather/refresh", {});
                if (r)
                  setMessage(
                    `Weather updated for ${r.results.filter((x) => x.ok).length}/${r.results.length} corridors. Failed feeds leave existing data unchanged.`,
                  );
              }}
            >
              <CloudRain />
              Refresh weather & risk
            </button>
            <p className="muted">
              Uses 24-hour rainfall windows from Open-Meteo. May take a minute
              for all corridors.
            </p>
          </section>
          <section className="product-card">
            <h2>Add an alert recipient</h2>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                action(
                  "/api/integrations/subscriptions",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              <label>
                Name
                <input required name="name" />
              </label>
              <label>
                Phone with country code
                <input
                  required
                  name="phone"
                  type="tel"
                  placeholder="+91…"
                  pattern="\+[1-9][0-9]{7,14}"
                />
              </label>
              <label>
                Language
                <select name="language">
                  {["en", "hi", "as", "kha", "lus", "mni", "brx"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Corridor
                <select name="corridor_id">
                  <option value="">All corridors</option>
                  {roads.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Only add recipients who have agreed to receive alerts. SMS
                sending must also be enabled by the administrator.
              </p>
              <button disabled={busy} className="action primary">
                Save recipient
              </button>
            </form>
          </section>
        </div>
      )}
      {tab === "settings" && (
        <>
          <NotificationAdmin />
          <div className="operations-grid">
            <AdminSetup vehicles={vehicles} refresh={refresh} />
          </div>
        </>
      )}
    </main>
  );
}

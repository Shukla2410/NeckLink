import { useState, useEffect } from "react";
import { api } from "../utils/api";
export default function NotificationAdmin() {
  const [data, setData] = useState({ subscriptions: [], deliveries: [] }),
    [error, setError] = useState("");
  async function load() {
    try {
      const [s, d] = await Promise.all([
        api("/api/integrations/subscriptions"),
        api("/api/integrations/deliveries"),
      ]);
      setData({ ...s, ...d });
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="product-card">
      <h2>Notification delivery history</h2>
      <p className="muted">
        SENT means accepted by the provider, not necessarily received by the
        person. SMS delivery confirmation is checked separately. PUSH acceptance
        has no device receipt.
      </p>
      <button className="text-button" onClick={load}>
        Refresh delivery status
      </button>
      {error && <p role="alert">{error}</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {data.deliveries.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.channel}</td>
                <td>{d.status}</td>
                <td>{d.attempts}</td>
                <td>{d.error || d.provider_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.deliveries.length && (
        <p className="muted">No delivery attempts yet.</p>
      )}
      <details>
        <summary>{data.subscriptions.length} registered recipients</summary>
        {data.subscriptions.map((s) => (
          <div className="stock-item" key={s.id}>
            <span>
              {s.name} · {s.language}
            </span>
            <span>{s.enabled ? "Enabled" : "Disabled"}</span>
          </div>
        ))}
      </details>
    </section>
  );
}

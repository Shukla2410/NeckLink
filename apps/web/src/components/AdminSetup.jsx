import { useState } from "react";
import { api } from "../utils/api";
export default function AdminSetup({ vehicles, refresh }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(path, body) {
    setBusy(true);
    try {
      const r = await api(path, { method: "POST", body: JSON.stringify(body) });
      setMessage(
        r.imported
          ? `Imported ${r.imported} records. Existing unrelated records were preserved.`
          : "Account created. Share the credentials privately with the user.",
      );
      refresh();
      return true;
    } catch (e) {
      setMessage(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="product-card">
        <h2>Verified data import</h2>
        <p className="muted">
          Import district boundaries, supply links, bridges, facilities or road
          geometry. JSON format examples are in SETUP.md. Only import data you
          have checked and are permitted to use.
        </p>
        <label>
          Choose JSON dataset
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={async (e) => {
              try {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 4500000)
                  throw new Error("Choose a JSON file under 4.5 MB");
                await send("/api/data-import", JSON.parse(await file.text()));
              } catch (e) {
                setMessage(e.message);
              }
            }}
          />
        </label>
      </section>
      <section className="product-card">
        <h2>Create an account</h2>
        <p className="muted">
          Administrator access required. Driver accounts can access only their
          assigned vehicle and deliveries.
        </p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (
              await send(
                "/api/admin/users",
                Object.fromEntries(new FormData(form)),
              )
            )
              form.reset();
          }}
        >
          <label>
            Full name
            <input name="display_name" required />
          </label>
          <label>
            Username
            <input
              name="username"
              pattern="[a-zA-Z0-9_.-]{3,60}"
              required
              autoComplete="off"
            />
          </label>
          <label>
            Temporary password
            <input
              name="password"
              type="password"
              minLength="12"
              maxLength="200"
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Role
            <select name="role">
              <option value="driver">Driver</option>
              <option value="field">Field officer</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label>
            Assigned vehicle (required for drivers)
            <select name="vehicle_id">
              <option value="">No vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number}
                </option>
              ))}
            </select>
          </label>
          <button className="action secondary" disabled={busy}>
            Create account
          </button>
        </form>
      </section>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </>
  );
}

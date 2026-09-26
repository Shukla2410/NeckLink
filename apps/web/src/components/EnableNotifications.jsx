import { useState } from "react";
import { Bell } from "lucide-react";
import { api } from "../utils/api";
export default function EnableNotifications({
  integrations,
  language,
  corridorId,
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function enable() {
    setBusy(true);
    try {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      )
        throw new Error(
          "Push notifications are not supported on this device. Use SMS alerts.",
        );
      if (!integrations?.push)
        throw new Error(
          "Notifications need the administrator’s VAPID configuration.",
        );
      if ((await Notification.requestPermission()) !== "granted")
        throw new Error(
          "Notifications were not permitted. You can enable them in browser settings.",
        );
      const registration = await navigator.serviceWorker.ready;
      const key = integrations.vapid_public_key;
      const binary = atob(
        key.replace(/-/g, "+").replace(/_/g, "/") +
          "=".repeat((4 - (key.length % 4)) % 4),
      );
      const applicationServerKey = Uint8Array.from(binary, (c) =>
        c.charCodeAt(0),
      );
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));
      await api("/api/integrations/push-subscription", {
        method: "POST",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          language,
          corridor_id: corridorId || null,
        }),
      });
      setMessage("Road notifications enabled for this browser.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="product-card">
      <button className="action secondary" disabled={busy} onClick={enable}>
        <Bell />
        {busy ? "Enabling…" : "Enable road notifications"}
      </button>
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
    </section>
  );
}

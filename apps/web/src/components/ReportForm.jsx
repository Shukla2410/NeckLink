import { useState, useEffect, useRef } from "react";
import {
  Camera,
  MapPin,
  Send,
  Mic,
  Square,
  CheckCircle,
  WifiOff,
} from "lucide-react";
import {
  queueOfflineIncident,
  getQueuedIncidents,
  syncQueuedIncidents,
} from "../utils/offlineQueue";
import { api } from "../utils/api";
import { t } from "../utils/i18n";
export default function ReportForm({
  corridors = [],
  language = "en",
  onSyncComplete,
}) {
  const [form, setForm] = useState({
    type: "LANDSLIDE",
    corridor_id: "",
    severity: "HIGH",
    description: "",
    lat: "",
    lng: "",
  });
  const [photo, setPhoto] = useState(null),
    [queue, setQueue] = useState([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false);
  const recorder = useRef(null);
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const reload = () =>
    getQueuedIncidents()
      .then(setQueue)
      .catch((e) => setError(e.message));
  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("necklink-synced", handler);
    return () => {
      window.removeEventListener("necklink-synced", handler);
      recorder.current?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  async function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not supported. Enter coordinates below.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setForm((f) => ({
          ...f,
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy_m: p.coords.accuracy,
        })),
      () =>
        setError(
          "Location permission unavailable. Enter the coordinates below.",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  async function attach(file) {
    if (!file) return;
    setError("");
    try {
      if (!file.type.startsWith("image/") || file.size > 15000000)
        throw new Error("Choose an image under 15 MB");
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      canvas.width = bitmap.width * ratio;
      canvas.height = bitmap.height * ratio;
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const image = canvas.toDataURL("image/jpeg", 0.7);
      if (image.length > 1500000)
        throw new Error("Photo too large. Try a smaller image.");
      setPhoto(image);
    } catch (e) {
      setError(e.message);
    }
  }
  async function record() {
    setError("");
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Voice recording requires HTTPS and a supported browser",
        );
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorder.current = rec;
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setBusy(true);
        try {
          const ctx = new AudioContext();
          const buffer = await ctx.decodeAudioData(
            await new Blob(chunks).arrayBuffer(),
          );
          const offline = new OfflineAudioContext(
            1,
            Math.ceil(buffer.duration * 16000),
            16000,
          );
          const source = offline.createBufferSource();
          source.buffer = buffer;
          source.connect(offline.destination);
          source.start();
          const mono = await offline.startRendering();
          const samples = mono.getChannelData(0);
          const wav = new ArrayBuffer(44 + samples.length * 2);
          const view = new DataView(wav);
          const str = (o, s) =>
            [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
          str(0, "RIFF");
          view.setUint32(4, 36 + samples.length * 2, true);
          str(8, "WAVE");
          str(12, "fmt ");
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, 16000, true);
          view.setUint32(28, 32000, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          str(36, "data");
          view.setUint32(40, samples.length * 2, true);
          samples.forEach((s, i) =>
            view.setInt16(
              44 + i * 2,
              Math.max(-1, Math.min(1, s)) * 32767,
              true,
            ),
          );
          await ctx.close();
          let binary = "";
          new Uint8Array(wav).forEach(
            (b) => (binary += String.fromCharCode(b)),
          );
          const result = await api("/api/language/transcribe", {
            method: "POST",
            body: JSON.stringify({
              audio: btoa(binary),
              language,
              format: "wav",
            }),
          });
          update("description", result.text);
          setMessage("Review the transcribed text before saving.");
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      setRecording(true);
      setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 30000);
    } catch (e) {
      setError(e.message);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const corridor_id = form.corridor_id || corridors[0]?.id;
      if (!corridor_id)
        throw new Error("Load a corridor list while online before reporting");
      if (
        form.lat === "" ||
        form.lng === "" ||
        !Number.isFinite(Number(form.lat)) ||
        !Number.isFinite(Number(form.lng))
      )
        throw new Error("Add your location first");
      await queueOfflineIncident({
        ...form,
        corridor_id,
        lat: Number(form.lat),
        lng: Number(form.lng),
        image_ref: photo,
        id: crypto.randomUUID(),
        observed_at: new Date().toISOString(),
      });
      setMessage("Saved on this phone. It will send when connected.");
      update("description", "");
      setPhoto(null);
      if (navigator.onLine) {
        const result = await syncQueuedIncidents();
        if (result.synced) {
          setMessage("Report sent. Thank you. A dispatcher will review it.");
          onSyncComplete?.();
        }
      }
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="product-card">
      <h2>{t(language, "report")}</h2>
      <p className="muted">
        Your report is saved on this phone before it is sent.
      </p>
      {message && (
        <p className="notice success" role="status">
          <CheckCircle size={20} />
          {message}
        </p>
      )}
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="form-stack">
        <label>
          Road
          <select
            value={form.corridor_id || corridors[0]?.id || ""}
            onChange={(e) => update("corridor_id", e.target.value)}
            required
          >
            {corridors.map((c) => (
              <option value={c.id} key={c.id}>
                {c.code} · {c.origin} → {c.destination}
              </option>
            ))}
          </select>
        </label>
        <div className="two-col">
          <label>
            Problem
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
            >
              <option value="LANDSLIDE">Landslide / rocks</option>
              <option value="FLASH_FLOOD">Flood / water on road</option>
              <option value="ROAD_EROSION">Road damaged</option>
              <option value="BRIDGE_DAMAGE">Bridge damaged</option>
              <option value="ROAD_BLOCK">Road blocked</option>
            </select>
          </label>
          <label>
            Can vehicles pass?
            <select
              value={form.severity}
              onChange={(e) => update("severity", e.target.value)}
            >
              <option value="MODERATE">Pass with care</option>
              <option value="HIGH">Difficult to pass</option>
              <option value="CRITICAL">Cannot pass</option>
            </select>
          </label>
        </div>
        <button className="action secondary" type="button" onClick={locate}>
          <MapPin />
          {t(language, "locate")}
        </button>
        <div className="two-col">
          <label>
            Latitude
            <input
              required
              type="number"
              step="any"
              min="-90"
              max="90"
              value={form.lat}
              onChange={(e) => update("lat", e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              required
              type="number"
              step="any"
              min="-180"
              max="180"
              value={form.lng}
              onChange={(e) => update("lng", e.target.value)}
            />
          </label>
        </div>
        {form.accuracy_m && (
          <small>
            Location accuracy: about {Math.round(form.accuracy_m)} m
          </small>
        )}
        <label className="upload">
          <Camera />
          {t(language, "photo")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => attach(e.target.files[0])}
          />
        </label>
        {photo && (
          <img
            className="report-photo"
            src={photo}
            alt="Attached incident evidence"
          />
        )}
        <label>
          {t(language, "notes")}
          <textarea
            required
            rows="3"
            maxLength="4000"
            value={form.description}
            placeholder="For example: rocks blocking both lanes near the bridge"
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
        <button
          type="button"
          className="action secondary"
          disabled={busy}
          onClick={record}
        >
          {recording ? <Square /> : <Mic />}
          {recording ? "Stop recording" : "Speak your report"}{" "}
          <small>(Bhashini)</small>
        </button>
        <button className="action primary" disabled={busy || recording}>
          <Send />
          {busy ? "Saving…" : t(language, "submit")}
        </button>
      </form>
      {!!queue.length && (
        <div className="notice">
          <WifiOff />
          <div>
            <strong>{queue.length} report(s) waiting to send</strong>
            {queue.map((item) => (
              <p key={item.id}>
                {item.type} · {item.last_error || "Waiting for a connection"}
              </p>
            ))}
            <button
              className="text-button"
              onClick={async () => {
                await syncQueuedIncidents();
                await reload();
              }}
            >
              Try sending again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

import React, { useState } from "react";
import { apiFetch as fetch, API_BASE } from "../utils/api";
import {
  Bell,
  Globe,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Send,
  CheckCircle2,
} from "lucide-react";

export default function AlertsCenter({ alerts = [], onSendCustomAlert }) {
  const [selectedLang, setSelectedLang] = useState("en");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const languages = [
    { code: "en", name: "English", native: "English" },
    { code: "as", name: "Assamese", native: "অসমীয়া" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "kha", name: "Khasi", native: "Khasi" },
    { code: "lus", name: "Mizo", native: "Mizo" },
    { code: "mni", name: "Manipuri", native: "মৈতৈলোন্" },
    { code: "brx", name: "Bodo", native: "बर'" },
  ];

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === "ALL") return true;
    return a.severity === severityFilter;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        height: "100%",
        overflowY: "auto",
        paddingRight: "8px",
      }}
    >
      {/* Top Banner and Language Selector */}
      <div
        className="necklink-card"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(232, 121, 249, 0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Globe size={20} color="var(--primary-accent)" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                Regional Multilingual Alert Dispatch Center
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--text-sub)" }}>
                Delivers targeted community warnings in 7 Northeast languages
                via Bhashini ULCA pipeline & Twilio SMS
              </p>
            </div>
          </div>
        </div>

        {/* Language Tabs */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.74rem",
              color: "var(--text-sub)",
              marginBottom: "8px",
            }}
          >
            SELECT REGIONAL SCRIPT / LANGUAGE FOR LIVE BROADCAST PREVIEW:
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  border:
                    selectedLang === l.code
                      ? "1px solid var(--primary-accent)"
                      : "1px solid var(--border-subtle)",
                  background:
                    selectedLang === l.code
                      ? "var(--primary-accent)"
                      : "var(--bg-surface-2)",
                  color:
                    selectedLang === l.code ? "#1A171A" : "var(--text-muted)",
                  fontWeight: selectedLang === l.code ? 700 : 500,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{l.name}</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                  ({l.native})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Twilio Live Carrier SMS Dispatch Console */}
      <TwilioSmsDispatcher apiBase={API_BASE} />

      {/* Alerts Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredAlerts.map((a) => {
          // Extract message in chosen language or fallback to English
          const text =
            (a.translations && a.translations[selectedLang]) || a.message;
          const isEmergency =
            a.severity === "EMERGENCY" || a.severity === "CRITICAL";

          return (
            <div
              key={a.id}
              className="necklink-card"
              style={{
                border: isEmergency
                  ? "1px solid var(--primary-accent)"
                  : "1px solid var(--border-subtle)",
                background: isEmergency
                  ? "rgba(232, 121, 249, 0.05)"
                  : "var(--bg-surface-1)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    className={`status-pill ${a.severity === "EMERGENCY" ? "CRITICAL_ALERT" : a.severity === "CRITICAL" ? "BLOCKED" : "AT_RISK"}`}
                  >
                    {a.severity}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#FFFFFF",
                    }}
                  >
                    {a.title}
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>
                  {new Date(a.created_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Render translated body */}
              <div
                style={{
                  fontSize: "0.92rem",
                  color: "#FFFFFF",
                  lineHeight: "1.5",
                  background: "var(--bg-surface-2)",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  borderLeft: "3px solid var(--primary-accent)",
                }}
              >
                {text}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.72rem",
                  color: "var(--text-sub)",
                }}
              >
                <span>
                  Recipients: <b>{a.recipients}</b>
                </span>
                <span>
                  Type: <b>{a.type}</b>
                </span>
                <span>
                  Language:{" "}
                  <b style={{ color: "var(--primary-accent)" }}>
                    {languages.find((l) => l.code === selectedLang)?.name}
                  </b>
                </span>
                <span style={{ color: "#10B981", fontWeight: 600 }}>
                  RECORDED · CHECK DELIVERY STATUS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TwilioSmsDispatcher({ apiBase = API_BASE }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customMsg, setCustomMsg] = useState(
    "EMERGENCY DISPATCH: NH-10 Teesta Valley landslide warning. Move convoys to alternate bypass.",
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/api/alerts/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          message: customMsg,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ status: "failed", error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="necklink-card"
      style={{
        background: "rgba(56, 189, 248, 0.05)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Radio size={18} color="#38BDF8" />
          <span
            style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}
          >
            SMS Dispatcher
          </span>
        </div>
        <span
          className="status-pill"
          style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8" }}
        >
          REQUIRES CONFIGURATION
        </span>
      </div>

      <p style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
        Send real-time high-priority SMS alerts directly to field responder
        mobile devices during critical corridor closures.
      </p>

      <form
        onSubmit={handleSend}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "10px",
          }}
        >
          <input
            type="tel"
            placeholder="Recipient (e.g. +919876543210)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending || !phoneNumber}
          className="pill-btn pill-btn-primary"
          style={{
            width: "fit-content",
            padding: "8px 20px",
            fontSize: "0.82rem",
          }}
        >
          <Send size={14} />
          <span>
            {sending
              ? "Transmitting via Carrier..."
              : "Dispatch Real Carrier SMS"}
          </span>
        </button>
      </form>

      {result && (
        <div
          style={{
            marginTop: "6px",
            padding: "10px 14px",
            borderRadius: "10px",
            background:
              result.status === "ok"
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(245, 158, 11, 0.15)",
            border:
              result.status === "ok"
                ? "1px solid #10B981"
                : "1px solid rgba(245, 158, 11, 0.4)",
            fontSize: "0.78rem",
            color: result.status === "ok" ? "#10B981" : "#F59E0B",
          }}
        >
          {result.status === "ok" ? (
            <div>
              ✓ SMS Dispatched! Twilio SID: <b>{result.result?.sid}</b> (Status:{" "}
              {result.result?.status})
            </div>
          ) : (
            <div>
              <b>Twilio Dispatch Response:</b>{" "}
              {result.result?.message || result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

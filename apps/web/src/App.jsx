import React, { useState, useEffect, useCallback } from "react";
import NavigationRail from "./components/NavigationRail";
import KpiRow from "./components/KpiRow";
import InteractiveMap from "./components/InteractiveMap";
import CorridorListDrawer from "./components/CorridorListDrawer";
import AiRoutingPanel from "./components/AiRoutingPanel";
import FleetTelematicsPanel from "./components/FleetTelematicsPanel";
import GlofWatchPanel from "./components/GlofWatchPanel";
import FieldReportingPwa from "./components/FieldReportingPwa";
import AlertsCenter from "./components/AlertsCenter";
import SimulationControlsModal from "./components/SimulationControlsModal";
import WeatherWidget from "./components/WeatherWidget";
import { queueOfflineIncident, syncQueuedIncidents } from "./utils/offlineQueue";
import { subscribeToFirebaseTelemetry } from "./utils/firebase";
import { Sparkles, AlertTriangle, Bell, CheckCircle2 } from "lucide-react";

const API_BASE = "http://localhost:5000";

export default function App() {
  const [activeTab, setActiveTab] = useState("command");
  const [isConnected, setIsConnected] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  // Core Data States (Backed strictly by Postgres database via API)
  const [roads, setRoads] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [glacialLakes, setGlacialLakes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [riskZones, setRiskZones] = useState([]);

  const [selectedCorridor, setSelectedCorridor] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [lastGlofResult, setLastGlofResult] = useState(null);
  const [liveToast, setLiveToast] = useState(null);

  const showToast = (title, message, type = "info") => {
    setLiveToast({ title, message, type });
    setTimeout(() => setLiveToast(null), 5000);
  };

  // 1. Fetch initial operational state from API
  const fetchAllData = useCallback(async () => {
    try {
      const [roadsRes, vehRes, alertsRes, lakesRes, incRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/roads`).then(r => r.json()),
        fetch(`${API_BASE}/api/vehicles`).then(r => r.json()),
        fetch(`${API_BASE}/api/alerts`).then(r => r.json()),
        fetch(`${API_BASE}/api/glacial-lakes`).then(r => r.json()),
        fetch(`${API_BASE}/api/incidents`).then(r => r.json()),
        fetch(`${API_BASE}/api/stats`).then(r => r.json())
      ]);

      if (roadsRes.status === "ok") setRoads(roadsRes.roads);
      if (vehRes.status === "ok") setVehicles(vehRes.vehicles);
      if (alertsRes.status === "ok") setAlerts(alertsRes.alerts);
      if (lakesRes.status === "ok") setGlacialLakes(lakesRes.lakes);
      if (incRes.status === "ok") setIncidents(incRes.incidents);
      if (statsRes.status === "ok") setStats(statsRes.stats);

      // Extract risk zones from initial lakes & roads
      const initialZones = [
        {
          id: "ZONE-TEESTA-GLOF",
          corridor_id: "CORR-NH10",
          name: "Teesta Basin Flash Flood & GLOF Cascade Path",
          type: "GLOF_PATH",
          severity: "CRITICAL",
          polygon_coordinates: [
            [88.42, 26.85],
            [88.62, 26.85],
            [88.65, 27.35],
            [88.38, 27.35],
            [88.42, 26.85]
          ],
          source: "SIMULATED_CRYOSPHERE_MODEL"
        },
        {
          id: "ZONE-PAGLA-PAHAR",
          corridor_id: "CORR-NH29",
          name: "Pagla Pahar Active Landslide Shear Zone",
          type: "LANDSLIDE_PRONE",
          severity: "HIGH",
          polygon_coordinates: [
            [93.80, 25.72],
            [94.05, 25.72],
            [94.05, 25.86],
            [93.80, 25.86],
            [93.80, 25.72]
          ],
          source: "GEOLOGICAL_SLOPE_ANALYSIS"
        }
      ];
      setRiskZones(initialZones);
    } catch (err) {
      console.warn("Error fetching data from API:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 2. Real-Time Telemetry Connection via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource = null;
    try {
      eventSource = new EventSource(`${API_BASE}/api/events`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleRealtimeEvent(payload);
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn("SSE connection error:", err);
    }

    const unsubscribeFirebase = subscribeToFirebaseTelemetry((fbEvent) => {
      if (fbEvent && fbEvent.type && fbEvent.data) {
        handleRealtimeEvent(fbEvent);
      }
    });

    return () => {
      if (eventSource) eventSource.close();
      if (typeof unsubscribeFirebase === "function") unsubscribeFirebase();
    };
  }, []);

  // Handle live incoming cause-and-effect events without page refresh
  const handleRealtimeEvent = (event) => {
    const { type, data } = event;
    if (type === "HEARTBEAT" || type === "INIT") return;

    if (type === "ROAD_STATUS_CHANGED" || type === "RISK_SCORE_UPDATED") {
      setRoads((prev) =>
        prev.map((r) =>
          r.id === data.corridor_id
            ? { ...r, status: data.status || r.status, risk_score: data.risk_score !== undefined ? data.risk_score : r.risk_score, rainfall_mm: data.rainfall_mm !== undefined ? data.rainfall_mm : r.rainfall_mm, current_speed: data.current_speed !== undefined ? data.current_speed : r.current_speed }
            : r
        )
      );
      if (data.recalculated_route) {
        setActiveRoute(data.recalculated_route);
      }
      showToast("Corridor Status Updated", `${data.corridor_name || data.corridor_id} changed to ${data.status || "Elevated Risk"}`, "warning");
    }

    if (type === "VEHICLE_LOCATION_UPDATED") {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === data.vehicle_id
            ? { ...v, current_lat: data.lat, current_lng: data.lng, current_speed: data.speed, status: data.status }
            : v
        )
      );
    }

    if (type === "VEHICLE_ENTERED_RISK_ZONE") {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === data.vehicle_id ? { ...v, status: "IN_RISK_ZONE" } : v
        )
      );
      showToast("Geofence Breach Triggered", `Vehicle ${data.vehicle_id} entered danger polygon: ${data.zone_name}`, "danger");
    }

    if (type === "VEHICLE_SPEED_ANOMALY") {
      setRoads((prev) =>
        prev.map((r) =>
          r.id === data.corridor_id
            ? { ...r, current_speed: data.current_speed, risk_score: data.updated_risk_score, status: data.status }
            : r
        )
      );
      showToast("Vehicle Speed Anomaly Alert", `Early warning on ${data.corridor_id}: Convoy slowed to ${data.current_speed} km/h`, "warning");
    }

    if (type === "INCIDENT_REPORTED" || type === "INCIDENT_SYNCED") {
      setIncidents((prev) => [data.incident, ...prev.filter(i => i.id !== data.incident?.id)]);
      showToast("Field Incident Synchronized", `${data.incident?.type} logged on ${data.incident?.corridor_id}`, "warning");
    }

    if (type === "GLOF_TRIGGERED" || type === "SEISMIC_ANOMALY") {
      setGlacialLakes((prev) =>
        prev.map((l) =>
          l.id === (data.lake_id || "LAKE-SLHONAK")
            ? { ...l, monitoring_status: "CRITICAL_ALERT" }
            : l
        )
      );
      setRoads((prev) =>
        prev.map((r) =>
          r.id === "CORR-NH10"
            ? { ...r, status: "GLOF_ALERT", risk_score: 0.96 }
            : r
        )
      );
      setLastGlofResult(data);
      showToast("EMERGENCY: Cryosphere GLOF Triggered", `South Lhonak burst surge moving down Teesta. NH-10 axis closed.`, "danger");
    }

    if (type === "ALERT_CREATED") {
      setAlerts((prev) => [data, ...prev]);
    }

    // Refresh KPI counts
    fetch(`${API_BASE}/api/stats`).then(r => r.json()).then(res => {
      if (res.status === "ok") setStats(res.stats);
    });
  };

  // --- Cause & Effect Chain Trigger Methods ---

  // Chain 1: Rain -> Risk -> Route -> ETA -> Dashboard
  const triggerChain1 = async (corridorId = "CORR-NH10") => {
    const res = await fetch(`${API_BASE}/api/roads/${corridorId}/rainfall-spike`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rainfall_mm: 125.0 })
    });
    const data = await res.json();
    if (data.chain_result?.recalculated_route) {
      setActiveRoute(data.chain_result.recalculated_route);
    }
    return data;
  };

  // Chain 2: Vehicle -> Risk Zone -> Geofence -> Alert
  const triggerChain2 = async (vehicleId = "NL-POL-09") => {
    // Send vehicle directly into Teesta flood risk polygon (88.48, 27.10)
    const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: 27.10,
        lng: 88.48,
        speed: 21.0,
        heading: 35.0
      })
    });
    return await res.json();
  };

  // Chain 3: Field Report -> Offline Queue -> Sync -> Dashboard
  const triggerChain3 = async () => {
    const incId = `INC-DEMO-${Date.now()}`;
    // 1. Queue offline
    await queueOfflineIncident({
      id: incId,
      type: "LANDSLIDE",
      corridor_id: "CORR-NH29",
      lat: 25.75,
      lng: 93.82,
      description: "Pagla Pahar mud and boulder slide obstructing both freight lanes.",
      severity: "CRITICAL",
      source: "FIELD_OFFICER_OFFLINE_SYNC"
    });
    // 2. Synchronize queue to API
    const syncRes = await syncQueuedIncidents(API_BASE);
    return { queued: 1, ...syncRes };
  };

  // Chain 4: Satellite/GLOF -> Mock Seismic Trigger -> Downstream Impact -> Red Zone -> Alert
  const triggerChain4 = async (lakeId = "LAKE-SLHONAK") => {
    const res = await fetch(`${API_BASE}/api/seismic-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lake_id: lakeId,
        magnitude: 4.8,
        depth_km: 4.5,
        classification: "ICE_ROCK_AVALANCHE_TRIGGER"
      })
    });
    const data = await res.json();
    setLastGlofResult(data.chain_result);
    return data;
  };

  // Chain 5: Vehicle Speed Anomaly -> Early Disruption Signal -> Risk Update
  const triggerChain5 = async (corridorId = "CORR-NH29") => {
    const res = await fetch(`${API_BASE}/api/vehicles/simulate-anomaly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        corridor_id: corridorId,
        speed_drop_kmh: -26.0
      })
    });
    return await res.json();
  };

  // Reset database back to clean seeded baseline
  const resetBaseline = async () => {
    try {
      await fetch(`${API_BASE}/api/roads/CORR-NH10/rainfall-spike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rainfall_mm: 12.0 })
      });
      await fetchAllData();
      setActiveRoute(null);
      showToast("Baseline Reset", "Corridors and telemetry restored to initial baseline parameters", "info");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", backgroundColor: "var(--bg-base)" }}>
      {/* 1. Left Vertical Navigation Rail */}
      <NavigationRail
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onOpenSimulator={() => setIsSimModalOpen(true)}
        unreadAlertsCount={alerts.length}
      />

      {/* 2. Main Content Viewport */}
      <main style={{
        flex: 1,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 28px",
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Top Header Bar */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px"
        }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
              {activeTab === "command" && "Command & Accessibility Intelligence Center"}
              {activeTab === "routing" && "Analytical Core: AI Risk-Weighted Route Optimizer"}
              {activeTab === "telematics" && "Fleet Telematics & Closed-Loop Early Signals"}
              {activeTab === "glof" && "Flagship Novelty: Cryosphere & GLOF Early Warning"}
              {activeTab === "field_pwa" && "Offline-First Mobile Field Reporting PWA"}
              {activeTab === "alerts" && "Regional Multilingual Emergency Dispatch"}
            </h1>
            <p style={{ fontSize: "0.82rem", color: "var(--text-sub)", marginTop: "2px" }}>
              Unified GIS, Weather, Seismic, Satellite & Fleet Telematics Architecture for North East India
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="pill-btn pill-btn-primary"
            >
              <Sparkles size={16} />
              <span>Simulate 5 Chains</span>
            </button>
          </div>
        </header>

        {/* Top KPI Metrics Row */}
        <KpiRow
          stats={stats}
          onCardClick={(tab) => {
            if (tab === "corridors") setActiveTab("command");
            else if (tab === "telematics") setActiveTab("telematics");
            else if (tab === "alerts") setActiveTab("alerts");
            else if (tab === "glof") setActiveTab("glof");
          }}
        />

        {/* Live OpenWeatherMap Feed across Strategic Hubs */}
        <WeatherWidget apiBase={API_BASE} />

        {/* Tab Content Display */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {activeTab === "command" && (
            <div style={{ display: "flex", gap: "20px", height: "100%" }}>
              {/* Left/Middle: Corridor List with Status Pills & Detail Drawer */}
              <CorridorListDrawer
                roads={roads}
                selectedCorridor={selectedCorridor}
                onSelectCorridor={(road) => setSelectedCorridor(road)}
                onTriggerRainfallSpike={(id) => triggerChain1(id)}
              />

              {/* Right Hero: Large Leaflet Map */}
              <div style={{ flex: 1, height: "100%" }}>
                <InteractiveMap
                  roads={roads}
                  vehicles={vehicles}
                  glacialLakes={glacialLakes}
                  riskZones={riskZones}
                  incidents={incidents}
                  activeRoute={activeRoute}
                  selectedCorridor={selectedCorridor}
                  onSelectCorridor={(road) => setSelectedCorridor(road)}
                />
              </div>
            </div>
          )}

          {activeTab === "routing" && (
            <AiRoutingPanel
              apiBase={API_BASE}
              onRouteCalculated={(r) => {
                setActiveRoute(r);
                setActiveTab("command");
              }}
            />
          )}

          {activeTab === "telematics" && (
            <FleetTelematicsPanel
              vehicles={vehicles}
              onTriggerGeofence={(id) => triggerChain2(id)}
              onTriggerSpeedAnomaly={(cid) => triggerChain5(cid)}
            />
          )}

          {activeTab === "glof" && (
            <GlofWatchPanel
              glacialLakes={glacialLakes}
              onTriggerSeismicGlof={(lakeId) => triggerChain4(lakeId)}
              lastGlofResult={lastGlofResult}
            />
          )}

          {activeTab === "field_pwa" && (
            <FieldReportingPwa
              corridors={roads}
              apiBase={API_BASE}
              onSyncComplete={() => fetchAllData()}
            />
          )}

          {activeTab === "alerts" && (
            <AlertsCenter
              alerts={alerts}
            />
          )}
        </div>

        {/* Live Event Toast Notification */}
        {liveToast && (
          <div style={{
            position: "absolute",
            bottom: "24px",
            right: "28px",
            background: "rgba(35, 31, 36, 0.95)",
            border: liveToast.type === "danger" ? "1px solid #EF4444" : "1px solid var(--primary-accent)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: "16px",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 3000,
            maxWidth: "420px",
            animation: "slideIn 0.3s ease"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: liveToast.type === "danger" ? "rgba(239, 68, 68, 0.2)" : "rgba(232, 121, 249, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Bell size={16} color={liveToast.type === "danger" ? "#EF4444" : "var(--primary-accent)"} />
            </div>
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#FFFFFF" }}>
                {liveToast.title}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                {liveToast.message}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5 Cause & Effect Chains Studio Modal */}
      <SimulationControlsModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onTriggerChain1={() => triggerChain1()}
        onTriggerChain2={() => triggerChain2()}
        onTriggerChain3={() => triggerChain3()}
        onTriggerChain4={() => triggerChain4()}
        onTriggerChain5={() => triggerChain5()}
        onResetBaseline={() => resetBaseline()}
      />
    </div>
  );
}

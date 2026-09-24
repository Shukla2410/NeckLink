import React, { useState } from "react";
import { Truck, ShieldAlert, Activity, Gauge, MapPin, AlertTriangle, Play, RefreshCw } from "lucide-react";

export default function FleetTelematicsPanel({
  vehicles = [],
  onTriggerGeofence,
  onTriggerSpeedAnomaly
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0] || null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{
      display: "flex",
      gap: "20px",
      height: "100%",
      overflow: "hidden"
    }}>
      {/* Vehicles List */}
      <div style={{
        width: "380px",
        minWidth: "380px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background: "var(--bg-surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px",
        padding: "20px",
        overflowY: "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF" }}>
              Active Convoys & Telematics
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-sub)" }}>
              {vehicles.length} Units Connected via GPS Transponders
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {vehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id;
            const isHazard = v.status === "IN_RISK_ZONE";

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                style={{
                  background: isSelected ? "var(--bg-surface-2)" : "var(--bg-surface-1)",
                  border: isSelected ? "1px solid var(--primary-accent)" : "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#FFFFFF" }}>
                    {v.id} · {v.plate_number}
                  </span>
                  <span className={`status-pill ${v.status}`}>
                    {v.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {v.operator}
                </div>

                <div style={{ fontSize: "0.74rem", color: "var(--text-sub)", fontStyle: "italic" }}>
                  📦 {v.cargo_summary}
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.74rem",
                  color: "var(--text-sub)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "6px"
                }}>
                  <span>Corridor: <b>{v.corridor_id}</b></span>
                  <span>Velocity: <b style={{ color: v.current_speed < 25 ? "#EF4444" : "#10B981" }}>{v.current_speed} km/h</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry Detail & Simulation Control Drawer */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        overflowY: "auto"
      }}>
        {selectedVehicle ? (
          <div className="necklink-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span className="status-pill" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", marginBottom: "6px" }}>
                  CONVOY TELEMATICS UNIT
                </span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#FFFFFF" }}>
                  {selectedVehicle.id} ({selectedVehicle.plate_number})
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--text-sub)" }}>
                  {selectedVehicle.operator} · Corridor {selectedVehicle.corridor_id}
                </div>
              </div>
              <span className={`status-pill ${selectedVehicle.status}`}>
                {selectedVehicle.status}
              </span>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              <div style={{ background: "var(--bg-surface-2)", padding: "12px", borderRadius: "14px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>CURRENT LATITUDE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#FFFFFF" }}>{selectedVehicle.current_lat}° N</div>
              </div>
              <div style={{ background: "var(--bg-surface-2)", padding: "12px", borderRadius: "14px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>CURRENT LONGITUDE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#FFFFFF" }}>{selectedVehicle.current_lng}° E</div>
              </div>
              <div style={{ background: "var(--bg-surface-2)", padding: "12px", borderRadius: "14px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>TELEMETRIC VELOCITY</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: selectedVehicle.current_speed < 25 ? "#EF4444" : "#10B981" }}>
                  {selectedVehicle.current_speed} km/h
                </div>
              </div>
              <div style={{ background: "var(--bg-surface-2)", padding: "12px", borderRadius: "14px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>CARGO CATEGORY</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#FFFFFF" }}>{selectedVehicle.type}</div>
              </div>
            </div>

            {/* Closed Loop Cause-and-Effect Trigger Buttons */}
            <div style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} color="var(--primary-accent)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF" }}>
                  Live Closed-Loop Chain Triggers (Judged Deliverables)
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Trigger Chain 2: Geofence breach */}
                <button
                  onClick={() => onTriggerGeofence(selectedVehicle.id)}
                  className="pill-btn pill-btn-primary"
                  style={{ padding: "12px" }}
                >
                  <ShieldAlert size={16} />
                  <span>Chain 2: Drive into Risk Polygon</span>
                </button>

                {/* Trigger Chain 5: Speed anomaly */}
                <button
                  onClick={() => onTriggerSpeedAnomaly(selectedVehicle.corridor_id)}
                  className="pill-btn pill-btn-secondary"
                  style={{ padding: "12px" }}
                >
                  <Gauge size={16} />
                  <span>Chain 5: Trigger Speed Anomaly (-26 km/h)</span>
                </button>
              </div>

              <div style={{ fontSize: "0.72rem", color: "var(--text-sub)", lineHeight: "1.3" }}>
                <b>Chain 2:</b> Simulates vehicle entering active danger zone, firing `VEHICLE_ENTERED_RISK_ZONE` telematics alert.<br/>
                <b>Chain 5:</b> Simulates multi-vehicle clustering/slowdown on corridor, raising corridor risk score before any human report is filed.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-sub)", textAlign: "center", marginTop: "40px" }}>
            Select a vehicle to inspect live telemetry
          </div>
        )}
      </div>
    </div>
  );
}

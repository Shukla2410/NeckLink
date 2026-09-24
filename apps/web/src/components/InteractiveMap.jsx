import React, { useEffect, useRef } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Polygon, 
  Marker, 
  Popup, 
  useMap 
} from "react-leaflet";
import L from "leaflet";

// Create custom DOM icons for markers
const createDivIcon = (color, pulseColor, label = "") => {
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 12px ${pulseColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: #1A171A;
      ">
        <div style="
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid ${pulseColor};
          animation: mapPulse 2s infinite ease-out;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const vehicleIconActive = createDivIcon("#38BDF8", "rgba(56, 189, 248, 0.6)");
const vehicleIconHazard = createDivIcon("#E879F9", "rgba(232, 121, 249, 0.8)");
const lakeIcon = createDivIcon("#A855F7", "rgba(168, 85, 247, 0.8)");
const incidentIcon = createDivIcon("#EF4444", "rgba(239, 68, 68, 0.8)");

// Helper to recenter map dynamically when a corridor or coordinate is selected
function MapRecenter({ targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords.length === 2) {
      map.flyTo(targetCoords, 9, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
}

export default function InteractiveMap({
  roads = [],
  vehicles = [],
  glacialLakes = [],
  riskZones = [],
  incidents = [],
  activeRoute = null,
  selectedCorridor = null,
  onSelectCorridor
}) {
  const mapCenter = [26.4, 92.5];
  const zoomLevel = 7;

  // Compute selected focus coordinate
  let focusCoords = null;
  if (selectedCorridor && selectedCorridor.coordinates && selectedCorridor.coordinates.length > 0) {
    const midIdx = Math.floor(selectedCorridor.coordinates.length / 2);
    // coordinates are [lng, lat]
    focusCoords = [selectedCorridor.coordinates[midIdx][1], selectedCorridor.coordinates[midIdx][0]];
  }

  const getCorridorColor = (road) => {
    if (road.status === "GLOF_ALERT") return "#E879F9";
    if (road.status === "BLOCKED" || road.risk_score >= 0.80) return "#EF4444";
    if (road.status === "AT_RISK" || road.risk_score >= 0.45) return "#F59E0B";
    return "#10B981";
  };

  return (
    <div style={{
      width: "100%",
      height: "100%",
      borderRadius: "20px",
      overflow: "hidden",
      position: "relative",
      border: "1px solid var(--border-subtle)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
    }}>
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <MapRecenter targetCoords={focusCoords} />

        {/* 100% Free OpenStreetMap tile layer (No API key required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* 1. Risk Zones (Polygons) */}
        {riskZones.map((z) => {
          if (!z.polygon_coordinates) return null;
          // Coordinates in DB are [lng, lat], Leaflet expects [lat, lng]
          const latLngs = z.polygon_coordinates.map(pt => [pt[1], pt[0]]);
          const isGlof = z.type === "GLOF_PATH" || z.severity === "CRITICAL";
          return (
            <Polygon
              key={z.id}
              positions={latLngs}
              pathOptions={{
                color: isGlof ? "#E879F9" : "#F59E0B",
                fillColor: isGlof ? "#E879F9" : "#F59E0B",
                fillOpacity: isGlof ? 0.25 : 0.15,
                weight: 2,
                dashArray: "4 6"
              }}
            >
              <Popup>
                <div style={{ minWidth: "180px" }}>
                  <div style={{ color: "var(--primary-accent)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>
                    ⚠️ {z.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Type: <b>{z.type}</b><br/>
                    Severity: <b>{z.severity}</b><br/>
                    Source: <i>{z.source}</i>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 2. Corridors (GeoJSON Polylines) */}
        {roads.map((road) => {
          if (!road.coordinates || road.coordinates.length < 2) return null;
          const latLngs = road.coordinates.map(pt => [pt[1], pt[0]]);
          const color = getCorridorColor(road);
          const isSelected = selectedCorridor?.id === road.id;
          const isGlof = road.status === "GLOF_ALERT";

          return (
            <Polyline
              key={road.id}
              positions={latLngs}
              eventHandlers={{
                click: () => onSelectCorridor?.(road)
              }}
              pathOptions={{
                color: isSelected ? "#FFFFFF" : color,
                weight: isSelected ? 7 : (isGlof ? 6 : 4),
                opacity: isSelected ? 1.0 : (isGlof ? 0.95 : 0.8),
                lineCap: "round",
                lineJoin: "round"
              }}
            >
              <Popup>
                <div style={{ minWidth: "220px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#FFFFFF" }}>
                      {road.code}
                    </span>
                    <span className={`status-pill ${road.status}`}>
                      {road.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    {road.name}
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                    background: "var(--bg-surface-2)",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    fontSize: "0.75rem"
                  }}>
                    <div>Risk Score: <b>{Math.round(road.risk_score * 100)}%</b></div>
                    <div>Distance: <b>{road.distance_km} km</b></div>
                    <div>Speed: <b>{road.current_speed} km/h</b></div>
                    <div>Rainfall: <b>{road.rainfall_mm} mm</b></div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 3. AI Calculated Routing Overlay (Optimal vs Shortest) */}
        {activeRoute && activeRoute.optimal_route?.coordinates && (
          <Polyline
            positions={activeRoute.optimal_route.coordinates}
            pathOptions={{
              color: "#E879F9",
              weight: 6,
              opacity: 0.9,
              dashArray: "1 8"
            }}
          />
        )}

        {/* 4. Glacial Lakes Markers */}
        {glacialLakes.map((lake) => (
          <Marker
            key={lake.id}
            position={[lake.lat, lake.lng]}
            icon={lakeIcon}
          >
            <Popup>
              <div style={{ minWidth: "200px" }}>
                <div style={{ color: "#E879F9", fontWeight: 700, fontSize: "0.9rem", marginBottom: "4px" }}>
                  🏔️ {lake.name}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Elevation: <b>{lake.elevation_m}m</b> · Area: <b>{lake.area_sq_km} km²</b><br/>
                  Growth: <b>+{lake.growth_rate_pct}%</b> · Stability: <b>{lake.moraine_stability}</b><br/>
                  Status: <b style={{ color: lake.monitoring_status === "CRITICAL_ALERT" ? "#E879F9" : "#F59E0B" }}>{lake.monitoring_status}</b>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-sub)", fontStyle: "italic" }}>
                  {lake.description}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 5. Tracked Vehicles Markers */}
        {vehicles.map((v) => {
          const isHazard = v.status === "IN_RISK_ZONE";
          return (
            <Marker
              key={v.id}
              position={[v.current_lat, v.current_lng]}
              icon={isHazard ? vehicleIconHazard : vehicleIconActive}
            >
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#FFFFFF" }}>
                      🚛 {v.id}
                    </span>
                    <span className={`status-pill ${v.status}`}>
                      {v.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Operator: <b>{v.operator}</b><br/>
                    Plate: <b>{v.plate_number}</b><br/>
                    Cargo: <i>{v.cargo_summary}</i><br/>
                    Speed: <b>{v.current_speed} km/h</b>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 6. Incidents Markers */}
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lng]}
            icon={incidentIcon}
          >
            <Popup>
              <div style={{ minWidth: "200px" }}>
                <div style={{ color: "#EF4444", fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>
                  ⚠️ {inc.type} ({inc.severity})
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  {inc.description}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-sub)" }}>
                  Source: {inc.source} · Status: {inc.sync_status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Legend Pill */}
      <div style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        background: "rgba(35, 31, 36, 0.92)",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "9999px",
        padding: "8px 18px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 800,
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "4px", backgroundColor: "#10B981", borderRadius: "2px" }}></span>
          <span>Open</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "4px", backgroundColor: "#F59E0B", borderRadius: "2px" }}></span>
          <span>At Risk</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "4px", backgroundColor: "#EF4444", borderRadius: "2px" }}></span>
          <span>Blocked</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "4px", backgroundColor: "#E879F9", borderRadius: "2px" }}></span>
          <span>GLOF / Critical</span>
        </div>
      </div>
    </div>
  );
}

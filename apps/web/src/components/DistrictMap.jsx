import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
} from "react-leaflet";
const colors = {
  ACCESSIBLE: "#34d399",
  PARTIAL: "#fbbf24",
  ISOLATED: "#fb7185",
  UNKNOWN: "#a1a1aa",
};
export default function DistrictMap({ districts, facilities }) {
  return (
    <section className="product-card">
      <h2>District access map</h2>
      <p className="muted">
        District polygons appear after importing verified boundaries. Facility
        points below are labelled demonstration records.
      </p>
      <div style={{ height: 380, marginTop: 16 }}>
        <MapContainer
          center={[26.4, 92.5]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {districts
            .filter((d) => d.geometry)
            .map((d) => (
              <GeoJSON
                key={d.id + d.accessibility + JSON.stringify(d.geometry)}
                data={{
                  type: "Feature",
                  properties: { name: d.name },
                  geometry: d.geometry,
                }}
                style={{
                  color: colors[d.accessibility],
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              >
                <Popup>
                  {d.name}: {d.accessibility}
                </Popup>
              </GeoJSON>
            ))}
          {facilities
            .filter((f) => f.lat != null && f.lng != null)
            .map((f) => (
              <CircleMarker
                key={f.id}
                center={[Number(f.lat), Number(f.lng)]}
                radius={7}
                pathOptions={{
                  color: "#fff",
                  fillColor: "#e879f9",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  {f.name}
                  <br />
                  {f.type}
                  <br />
                  Source: {f.source}
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </section>
  );
}

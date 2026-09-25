import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
const icon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border:3px solid white;background:#e879f9;border-radius:50%"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
export default function RouteMap({ route }) {
  const points = route.optimal_route?.coordinates || [];
  if (points.length < 2) return null;
  return (
    <div
      style={{
        height: 300,
        borderRadius: 16,
        overflow: "hidden",
        margin: "16px 0",
      }}
    >
      <MapContainer
        key={JSON.stringify(points)}
        bounds={points}
        boundsOptions={{ padding: [25, 25] }}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Polyline
          positions={points}
          pathOptions={{ color: "#e879f9", weight: 5 }}
        />
        <Marker position={points[0]} icon={icon}>
          <Popup>Start</Popup>
        </Marker>
        <Marker position={points.at(-1)} icon={icon}>
          <Popup>Destination</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

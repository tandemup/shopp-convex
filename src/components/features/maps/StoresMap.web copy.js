import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix iconos Leaflet en Web / Expo
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function StoresMap({ stores }) {
  const validStores = stores.filter(
    (s) => Number.isFinite(s.location?.lat) && Number.isFinite(s.location?.lng),
  );

  if (validStores.length === 0) return null;

  const center = [validStores[0].location.lat, validStores[0].location.lng];

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: 300, width: "100%", borderRadius: 12 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {validStores.map((store) => (
        <Marker
          key={store.id}
          position={[store.location.lat, store.location.lng]}
        >
          <Popup>
            <strong>{store.name}</strong>
            <br />
            {store.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

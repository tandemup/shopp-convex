import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const destinationIcon = new L.Icon({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.DivIcon({
  className: "parking-user-marker",
  html: `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #2563eb;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
    "></div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const freeSpotIcon = new L.DivIcon({
  className: "parking-free-spot-marker",
  html: `
    <div style="
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: #16a34a;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: 900;
    ">P</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function isValidCoord(value) {
  return Number.isFinite(Number(value));
}

function normalizeSpot(spot) {
  const lat = Number(spot?.lat);
  const lng = Number(spot?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    ...spot,
    lat,
    lng,
  };
}

export default function StoreMapPreview({
  lat,
  lng,
  userLat,
  userLng,
  parkingSpots = [],
}) {
  if (!isValidCoord(lat) || !isValidCoord(lng)) {
    return null;
  }

  const destinationLat = Number(lat);
  const destinationLng = Number(lng);

  const hasUserLocation = isValidCoord(userLat) && isValidCoord(userLng);

  const normalizedUserLat = hasUserLocation ? Number(userLat) : null;
  const normalizedUserLng = hasUserLocation ? Number(userLng) : null;

  const validParkingSpots = Array.isArray(parkingSpots)
    ? parkingSpots
        .map(normalizeSpot)
        .filter(Boolean)
        .filter((spot) => spot.status !== "destination")
    : [];

  return (
    <MapContainer
      center={[destinationLat, destinationLng]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker
        position={[destinationLat, destinationLng]}
        icon={destinationIcon}
      >
        <Popup>Destino</Popup>
      </Marker>

      {hasUserLocation ? (
        <Marker
          position={[normalizedUserLat, normalizedUserLng]}
          icon={userIcon}
        >
          <Popup>Tu posición aproximada</Popup>
        </Marker>
      ) : null}

      {validParkingSpots.map((spot) => (
        <Marker
          key={spot.id || `${spot.lat}-${spot.lng}`}
          position={[spot.lat, spot.lng]}
          icon={freeSpotIcon}
        >
          <Popup>
            Plaza libre
            {spot.revealedBy ? (
              <>
                <br />
                Avisó: {spot.revealedBy}
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

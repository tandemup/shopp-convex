import React from "react";
import { WebView } from "react-native-webview";

function isValidCoord(value) {
  return Number.isFinite(Number(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSpot(spot) {
  const lat = Number(spot?.lat);
  const lng = Number(spot?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: String(spot?.id || `${lat}-${lng}`),
    lat,
    lng,
    revealedBy: escapeHtml(spot?.revealedBy || ""),
    status: String(spot?.status || ""),
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

  const parkingSpotsJson = JSON.stringify(validParkingSpots);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    .marker-user {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #2563eb;
      border: 4px solid #ffffff;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
    }

    .marker-free-spot {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: #16a34a;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 14px;
      font-weight: 900;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const destinationLat = ${destinationLat};
    const destinationLng = ${destinationLng};
    const hasUserLocation = ${hasUserLocation ? "true" : "false"};
    const userLat = ${hasUserLocation ? normalizedUserLat : "null"};
    const userLng = ${hasUserLocation ? normalizedUserLng : "null"};
    const parkingSpots = ${parkingSpotsJson};

    const map = L.map("map", {
      zoomControl: true,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      touchZoom: true
    }).setView([destinationLat, destinationLng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    const userIcon = L.divIcon({
      className: "",
      html: '<div class="marker-user"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const freeSpotIcon = L.divIcon({
      className: "",
      html: '<div class="marker-free-spot">P</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const bounds = [];

    L.marker([destinationLat, destinationLng])
      .addTo(map)
      .bindPopup("Destino");

    bounds.push([destinationLat, destinationLng]);

    if (hasUserLocation) {
      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Tu posición aproximada");

      bounds.push([userLat, userLng]);
    }

    parkingSpots.forEach((spot) => {
      L.marker([spot.lat, spot.lng], { icon: freeSpotIcon })
        .addTo(map)
        .bindPopup(
          spot.revealedBy
            ? "Plaza libre<br/>Avisó: " + spot.revealedBy
            : "Plaza libre"
        );

      bounds.push([spot.lat, spot.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: 17
      });
    }
  </script>
</body>
</html>
`;

  return (
    <WebView
      source={{ html }}
      style={{ flex: 1 }}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

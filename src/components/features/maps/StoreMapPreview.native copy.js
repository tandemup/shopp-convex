import React from "react";
import { WebView } from "react-native-webview";

export default function StoreMapPreview({ lat, lng }) {
  if (lat == null || lng == null) return null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { height: 100%; margin: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      .addTo(map);

    L.marker([${lat}, ${lng}]).addTo(map);
  </script>
</body>
</html>
`;

  return (
    <WebView source={{ html }} style={{ flex: 1 }} scrollEnabled={false} />
  );
}

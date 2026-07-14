import React, { useMemo, useRef } from "react";
import { WebView } from "react-native-webview";

const DEFAULT_ZOOM = 15;
const DEFAULT_MIN_ZOOM = 13;
const DEFAULT_MAX_ZOOM = 21;

function isValidCoord(value) {
  const number = Number(value);

  return Number.isFinite(number);
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
  const lat = Number(spot?.lat ?? spot?.latitude);
  const lng = Number(spot?.lng ?? spot?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: String(spot?.id || spot?._id || `${lat}-${lng}`),
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
  onMapPress,
  selectedLat,
  selectedLng,
  defaultZoom = DEFAULT_ZOOM,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomControlsEnabled = true,
  zoomGesturesEnabled = false,
  preserveViewportOnMarkerChange = false,
}) {
  const webViewRef = useRef(null);

  if (!isValidCoord(lat) || !isValidCoord(lng)) {
    return null;
  }

  const destinationLat = Number(lat);
  const destinationLng = Number(lng);

  const hasUserLocation = isValidCoord(userLat) && isValidCoord(userLng);

  const normalizedUserLat = hasUserLocation ? Number(userLat) : null;

  const normalizedUserLng = hasUserLocation ? Number(userLng) : null;

  const hasSelectedPoint =
    isValidCoord(selectedLat) && isValidCoord(selectedLng);

  const normalizedSelectedLat = hasSelectedPoint ? Number(selectedLat) : null;

  const normalizedSelectedLng = hasSelectedPoint ? Number(selectedLng) : null;

  const validParkingSpots = useMemo(() => {
    if (!Array.isArray(parkingSpots)) {
      return [];
    }

    return parkingSpots
      .map(normalizeSpot)
      .filter(Boolean)
      .filter((spot) => spot.status !== "destination");
  }, [parkingSpots]);

  /*
   * El HTML solo contiene la estructura inicial.
   *
   * Los cambios posteriores de marcadores se envían
   * mediante injectJavaScript para no recargar el WebView
   * ni perder el centro y el zoom actuales.
   */
  const initialHtml = useMemo(() => {
    const initialParkingSpotsJson = JSON.stringify(validParkingSpots);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta
    name="viewport"
    content="
      width=device-width,
      initial-scale=1.0,
      maximum-scale=1.0,
      user-scalable=no
    "
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html,
    body,
    #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    .marker-center,
    .marker-user,
    .marker-sample,
    .marker-selected {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 3px solid #ffffff;
      box-shadow:
        0 4px 12px
        rgba(15, 23, 42, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    .marker-center {
      background: #16a34a;
    }

    .marker-user {
      background: #2563eb;
    }

    .marker-sample {
      background: #f97316;
    }

    .marker-selected {
      background: #dc2626;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const destinationLat =
      ${destinationLat};

    const destinationLng =
      ${destinationLng};

    const map = L.map("map", {
      zoomControl:
        ${zoomControlsEnabled ? "true" : "false"},

      attributionControl: true,
      dragging: true,

      scrollWheelZoom:
        ${zoomGesturesEnabled ? "true" : "false"},

      doubleClickZoom:
        ${zoomGesturesEnabled ? "true" : "false"},

      touchZoom:
        ${zoomGesturesEnabled ? "true" : "false"},

      boxZoom:
        ${zoomGesturesEnabled ? "true" : "false"},

      keyboard:
        ${zoomGesturesEnabled ? "true" : "false"},

      minZoom: ${Number(minZoom)},
      maxZoom: ${Number(maxZoom)}
    });

    map.setView(
      [
        destinationLat,
        destinationLng
      ],
      ${Number(defaultZoom)},
      {
        animate: false
      }
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          "© OpenStreetMap contributors",

        maxZoom: ${Number(maxZoom)},
        maxNativeZoom: 19
      }
    ).addTo(map);

    function createIcon(
      className,
      label
    ) {
      return L.divIcon({
        className: "",

        html:
          '<div class="' +
          className +
          '">' +
          label +
          "</div>",

        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });
    }

    const centerIcon = createIcon(
      "marker-center",
      "D"
    );

    const userIcon = createIcon(
      "marker-user",
      "U"
    );

    const sampleIcon = createIcon(
      "marker-sample",
      "P"
    );

    const selectedIcon = createIcon(
      "marker-selected",
      "X"
    );

    const dynamicLayers =
      L.layerGroup().addTo(map);

    L.marker(
      [
        destinationLat,
        destinationLng
      ],
      {
        icon: centerIcon
      }
    )
      .addTo(map)
      .bindPopup(
        "Centro<br/>" +
        destinationLat.toFixed(6) +
        ", " +
        destinationLng.toFixed(6)
      );

    function updateDynamicMarkers(data) {
      /*
       * Solo se actualizan los marcadores.
       *
       * No se ejecutan setView, flyTo,
       * panTo ni fitBounds.
       */
      dynamicLayers.clearLayers();

      if (data.hasUserLocation) {
        L.marker(
          [
            data.userLat,
            data.userLng
          ],
          {
            icon: userIcon
          }
        )
          .addTo(dynamicLayers)
          .bindPopup(
            "Usuario<br/>" +
            Number(data.userLat).toFixed(6) +
            ", " +
            Number(data.userLng).toFixed(6)
          );
      }

      if (data.hasSelectedPoint) {
        L.marker(
          [
            data.selectedLat,
            data.selectedLng
          ],
          {
            icon: selectedIcon
          }
        )
          .addTo(dynamicLayers)
          .bindPopup(
            "Punto seleccionado<br/>" +
            Number(data.selectedLat).toFixed(6) +
            ", " +
            Number(data.selectedLng).toFixed(6)
          );
      }

      data.parkingSpots.forEach(
        function (spot) {
          const popupText =
            "Muestra GPS<br/>" +
            Number(spot.lat).toFixed(6) +
            ", " +
            Number(spot.lng).toFixed(6) +
            (
              spot.revealedBy
                ? "<br/>" +
                  spot.revealedBy
                : ""
            );

          L.marker(
            [
              spot.lat,
              spot.lng
            ],
            {
              icon: sampleIcon
            }
          )
            .addTo(dynamicLayers)
            .bindPopup(popupText);
        }
      );
    }

    window.updateDynamicMarkers =
      updateDynamicMarkers;

    updateDynamicMarkers({
      hasUserLocation:
        ${hasUserLocation ? "true" : "false"},

      userLat:
        ${hasUserLocation ? normalizedUserLat : "null"},

      userLng:
        ${hasUserLocation ? normalizedUserLng : "null"},

      hasSelectedPoint:
        ${hasSelectedPoint ? "true" : "false"},

      selectedLat:
        ${hasSelectedPoint ? normalizedSelectedLat : "null"},

      selectedLng:
        ${hasSelectedPoint ? normalizedSelectedLng : "null"},

      parkingSpots:
        ${initialParkingSpotsJson}
    });

    map.on(
      "click",
      function (event) {
        const lat =
          Number(event.latlng.lat);

        const lng =
          Number(event.latlng.lng);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return;
        }

        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "map-press",
            lat,
            lng,
            latitude: lat,
            longitude: lng
          })
        );
      }
    );
  </script>
</body>
</html>
`;
  }, [
    destinationLat,
    destinationLng,
    defaultZoom,
    minZoom,
    maxZoom,
    zoomControlsEnabled,
    zoomGesturesEnabled,
  ]);

  const dynamicMarkersScript = useMemo(() => {
    const data = {
      hasUserLocation,
      userLat: normalizedUserLat,
      userLng: normalizedUserLng,
      hasSelectedPoint,
      selectedLat: normalizedSelectedLat,
      selectedLng: normalizedSelectedLng,
      parkingSpots: validParkingSpots,
    };

    return `
      if (
        typeof window.updateDynamicMarkers ===
        "function"
      ) {
        window.updateDynamicMarkers(
          ${JSON.stringify(data)}
        );
      }

      true;
    `;
  }, [
    hasUserLocation,
    normalizedUserLat,
    normalizedUserLng,
    hasSelectedPoint,
    normalizedSelectedLat,
    normalizedSelectedLng,
    validParkingSpots,
  ]);

  const handleLoadEnd = () => {
    webViewRef.current?.injectJavaScript(dynamicMarkersScript);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data?.type !== "map-press" || typeof onMapPress !== "function") {
        return;
      }

      const pressedLat = Number(data.lat ?? data.latitude);

      const pressedLng = Number(data.lng ?? data.longitude);

      if (!Number.isFinite(pressedLat) || !Number.isFinite(pressedLng)) {
        return;
      }

      onMapPress({
        lat: pressedLat,
        lng: pressedLng,
        latitude: pressedLat,
        longitude: pressedLng,
      });
    } catch (error) {
      console.warn("[StoreMapPreview.native] Mensaje inválido:", error);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: initialHtml }}
      style={{ flex: 1 }}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      onLoadEnd={handleLoadEnd}
      injectedJavaScript={dynamicMarkersScript}
      originWhitelist={["*"]}
    />
  );
}

import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const DEFAULT_LAT = 43.5322;
const DEFAULT_LNG = -5.6611;

const DEFAULT_ZOOM = 15;
const DEFAULT_MIN_ZOOM = 13;
const DEFAULT_MAX_ZOOM = 21;
const DEFAULT_FIT_MAX_ZOOM = 18;

function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidCoords(lat, lng) {
  return (
    isValidNumber(lat) &&
    isValidNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizePoint(point) {
  if (!point) return null;

  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.longitude);

  if (!isValidCoords(lat, lng)) {
    return null;
  }

  return {
    ...point,
    lat,
    lng,
  };
}

function createPinIcon({ color, label }) {
  return L.divIcon({
    className: "shopp-parking-marker",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 17px;
        background: ${color};
        border: 3px solid #ffffff;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.28);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 13px;
        font-weight: 900;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        ${label}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

const destinationIcon = createPinIcon({
  color: "#16a34a",
  label: "D",
});

const userIcon = createPinIcon({
  color: "#2563eb",
  label: "U",
});

function createPrecisionPinIcon({
  color = "#f97316",
  centerColor = "#ffffff",
  size = 42,
}) {
  const width = size;
  const height = Math.round(size * 1.35);

  return L.divIcon({
    className: "shopp-precision-marker",

    html: `
      <div
        style="
          width: ${width}px;
          height: ${height}px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          pointer-events: auto;
        "
      >
        <svg
          width="${width}"
          height="${height}"
          viewBox="0 0 42 56"
          xmlns="http://www.w3.org/2000/svg"
          style="
            display: block;
            overflow: visible;
            filter: drop-shadow(
              0 5px 5px rgba(15, 23, 42, 0.32)
            );
          "
        >
          <path
            d="
              M21 1
              C10.2 1 1.5 9.7 1.5 20.5
              C1.5 34.3 15.3 48.6 21 55
              C26.7 48.6 40.5 34.3 40.5 20.5
              C40.5 9.7 31.8 1 21 1
              Z
            "
            fill="${color}"
            stroke="#ffffff"
            stroke-width="3"
            stroke-linejoin="round"
          />

          <circle
            cx="21"
            cy="20.5"
            r="8"
            fill="${centerColor}"
          />

          <circle
            cx="21"
            cy="20.5"
            r="5"
            fill="rgba(15, 23, 42, 0.10)"
          />
        </svg>
      </div>
    `,

    iconSize: [width, height],

    /*
     * El extremo inferior del SVG coincide exactamente
     * con la coordenada del parkingSpot.
     */
    iconAnchor: [Math.round(width / 2), height],

    popupAnchor: [0, -height + 8],
  });
}
const parkingIcon = createPrecisionPinIcon({
  color: "#f97316",
  centerColor: "#ffffff",
  size: 25,
});

const selectedIcon = createPinIcon({
  color: "#dc2626",
  label: "X",
});

function MapClickHandler({ onMapPress }) {
  useMapEvents({
    click(event) {
      if (typeof onMapPress !== "function") {
        return;
      }

      const lat = Number(event?.latlng?.lat);
      const lng = Number(event?.latlng?.lng);

      if (!isValidCoords(lat, lng)) {
        return;
      }

      onMapPress({
        lat,
        lng,
        latitude: lat,
        longitude: lng,
      });
    },
  });

  return null;
}

/*
 * Este componente solo se monta cuando preserveViewportOnMarkerChange
 * es false.
 *
 * En la pantalla GPS Debug no se monta, por lo que añadir o borrar
 * marcadores no cambia automáticamente el centro ni el zoom.
 */
function MapAutoFit({
  destinationPoint,
  userPoint,
  selectedPoint,
  parkingPoints,
  defaultZoom = DEFAULT_ZOOM,
  fitMaxZoom = DEFAULT_FIT_MAX_ZOOM,
}) {
  const map = useMap();

  const points = useMemo(() => {
    return [
      destinationPoint,
      userPoint,
      selectedPoint,
      ...parkingPoints,
    ].filter(Boolean);
  }, [destinationPoint, userPoint, selectedPoint, parkingPoints]);

  const pointsKey = useMemo(() => {
    return points
      .map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
      .join("|");
  }, [points]);

  useEffect(() => {
    let cancelled = false;
    let frameOne = null;
    let frameTwo = null;

    const fitMap = () => {
      if (cancelled || !map) {
        return;
      }

      const container =
        typeof map.getContainer === "function" ? map.getContainer() : null;

      if (!container || !container.isConnected) {
        return;
      }

      if (!map._container || !map._mapPane) {
        return;
      }

      try {
        map.invalidateSize(false);

        if (points.length === 0) {
          map.setView([DEFAULT_LAT, DEFAULT_LNG], defaultZoom, {
            animate: false,
          });

          return;
        }

        if (points.length === 1) {
          map.setView([points[0].lat, points[0].lng], defaultZoom, {
            animate: false,
          });

          return;
        }

        const bounds = L.latLngBounds(
          points.map((point) => [point.lat, point.lng]),
        );

        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [34, 34],
            maxZoom: fitMaxZoom,
            animate: false,
          });
        }
      } catch (error) {
        console.warn(
          "[StoreMapPreview.web] Error ajustando mapa:",
          error?.message || error,
        );
      }
    };

    frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(fitMap);
    });

    return () => {
      cancelled = true;

      if (frameOne) {
        cancelAnimationFrame(frameOne);
      }

      if (frameTwo) {
        cancelAnimationFrame(frameTwo);
      }
    };
  }, [map, pointsKey, points.length, defaultZoom, fitMaxZoom]);

  return null;
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
  fitMaxZoom = DEFAULT_FIT_MAX_ZOOM,
  zoomControlsEnabled = true,
  zoomGesturesEnabled = false,
  preserveViewportOnMarkerChange = false,
}) {
  const destinationPoint = useMemo(() => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);

    if (!isValidCoords(nextLat, nextLng)) {
      return null;
    }

    return {
      lat: nextLat,
      lng: nextLng,
    };
  }, [lat, lng]);

  const userPoint = useMemo(() => {
    const nextLat = Number(userLat);
    const nextLng = Number(userLng);

    if (!isValidCoords(nextLat, nextLng)) {
      return null;
    }

    return {
      lat: nextLat,
      lng: nextLng,
    };
  }, [userLat, userLng]);

  const selectedPoint = useMemo(() => {
    const nextLat = Number(selectedLat);
    const nextLng = Number(selectedLng);

    if (!isValidCoords(nextLat, nextLng)) {
      return null;
    }

    return {
      lat: nextLat,
      lng: nextLng,
    };
  }, [selectedLat, selectedLng]);

  const parkingPoints = useMemo(() => {
    if (!Array.isArray(parkingSpots)) {
      return [];
    }

    return parkingSpots.map(normalizePoint).filter(Boolean);
  }, [parkingSpots]);

  /*
   * MapContainer utiliza center solo durante su creación.
   * No se proporciona una key variable y, por tanto, no se
   * reconstruye cuando cambian los marcadores.
   */
  const initialCenter = destinationPoint ||
    userPoint ||
    selectedPoint || {
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
    };

  return (
    <View style={styles.container}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={defaultZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        dragging
        zoomControl={zoomControlsEnabled}
        scrollWheelZoom={zoomGesturesEnabled}
        touchZoom={zoomGesturesEnabled}
        doubleClickZoom={zoomGesturesEnabled}
        boxZoom={zoomGesturesEnabled}
        keyboard={zoomGesturesEnabled}
        style={styles.map}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={maxZoom}
          maxNativeZoom={19}
        />

        <MapClickHandler onMapPress={onMapPress} />

        {!preserveViewportOnMarkerChange ? (
          <MapAutoFit
            destinationPoint={destinationPoint}
            userPoint={userPoint}
            selectedPoint={selectedPoint}
            parkingPoints={parkingPoints}
            defaultZoom={defaultZoom}
            fitMaxZoom={fitMaxZoom}
          />
        ) : null}

        {destinationPoint ? (
          <Marker
            position={[destinationPoint.lat, destinationPoint.lng]}
            icon={destinationIcon}
          >
            <Popup>
              <strong>Destino</strong>
              <br />
              {destinationPoint.lat.toFixed(6)},{" "}
              {destinationPoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        ) : null}

        {userPoint ? (
          <Marker position={[userPoint.lat, userPoint.lng]} icon={userIcon}>
            <Popup>
              <strong>Usuario</strong>
              <br />
              {userPoint.lat.toFixed(6)}, {userPoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        ) : null}

        {selectedPoint ? (
          <Marker
            position={[selectedPoint.lat, selectedPoint.lng]}
            icon={selectedIcon}
          >
            <Popup>
              <strong>Punto seleccionado</strong>
              <br />
              {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        ) : null}

        {parkingPoints.map((spot, index) => (
          <Marker
            key={spot.id || spot._id || `${spot.lat}-${spot.lng}-${index}`}
            position={[spot.lat, spot.lng]}
            icon={parkingIcon}
          >
            <Popup>
              <strong>Muestra GPS</strong>
              <br />
              {spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}
              {spot.revealedBy ? (
                <>
                  <br />
                  {spot.revealedBy}
                </>
              ) : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.userDot]} />
          <Text style={styles.legendText}>Usuario</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.destinationDot]} />
          <Text style={styles.legendText}>Centro</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.parkingDot]} />
          <Text style={styles.legendText}>Muestra</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.selectedDot]} />
          <Text style={styles.legendText}>Punto tocado</Text>
        </View>
      </View>

      {!parkingPoints.length ? (
        <View style={styles.emptySpotsBox} pointerEvents="none">
          <Text style={styles.emptySpotsText}>
            No hay muestras GPS guardadas.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 180,
    position: "relative",
    backgroundColor: "#e5e7eb",
  },

  map: {
    width: "100%",
    height: "100%",
    minHeight: 180,
  },

  legend: {
    position: "absolute",
    left: 12,
    top: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  userDot: {
    backgroundColor: "#2563eb",
  },

  destinationDot: {
    backgroundColor: "#16a34a",
  },

  parkingDot: {
    backgroundColor: "#f97316",
  },

  selectedDot: {
    backgroundColor: "#dc2626",
  },

  legendText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  emptySpotsBox: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  emptySpotsText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});

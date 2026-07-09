import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const DEFAULT_LAT = 43.5322;
const DEFAULT_LNG = -5.6611;

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

const parkingIcon = createPinIcon({
  color: "#f97316",
  label: "P",
});

function MapAutoFit({ destinationPoint, userPoint, parkingPoints }) {
  const map = useMap();

  const points = useMemo(() => {
    return [destinationPoint, userPoint, ...parkingPoints].filter(Boolean);
  }, [destinationPoint, userPoint, parkingPoints]);

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
      if (cancelled || !map) return;

      const container =
        typeof map.getContainer === "function" ? map.getContainer() : null;

      if (!container || !container.isConnected) return;
      if (!map._container || !map._mapPane) return;

      try {
        map.invalidateSize(false);

        if (points.length === 0) {
          map.setView([DEFAULT_LAT, DEFAULT_LNG], 14, {
            animate: false,
          });
          return;
        }

        if (points.length === 1) {
          map.setView([points[0].lat, points[0].lng], 16, {
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
            maxZoom: 17,
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
  }, [map, pointsKey, points.length]);

  return null;
}

export default function StoreMapPreview({
  lat,
  lng,
  userLat,
  userLng,
  parkingSpots = [],
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

  const parkingPoints = useMemo(() => {
    if (!Array.isArray(parkingSpots)) {
      return [];
    }

    return parkingSpots.map(normalizePoint).filter(Boolean);
  }, [parkingSpots]);

  const center = destinationPoint ||
    userPoint || {
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
    };

  return (
    <View style={styles.container}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        scrollWheelZoom
        style={styles.map}
        attributionControl
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoFit
          destinationPoint={destinationPoint}
          userPoint={userPoint}
          parkingPoints={parkingPoints}
        />

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

        {parkingPoints.map((spot, index) => (
          <Marker
            key={spot.id || `${spot.lat}-${spot.lng}-${index}`}
            position={[spot.lat, spot.lng]}
            icon={parkingIcon}
          >
            <Popup>
              <strong>Plaza comunicada</strong>
              <br />
              {spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}
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
          <Text style={styles.legendText}>Destino</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.parkingDot]} />
          <Text style={styles.legendText}>Plaza</Text>
        </View>
      </View>

      {!parkingPoints.length ? (
        <View style={styles.emptySpotsBox} pointerEvents="none">
          <Text style={styles.emptySpotsText}>
            No hay plazas libres reveladas ahora mismo.
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

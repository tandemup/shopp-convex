import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_CENTER = {
  lat: 43.5322,
  lng: -5.6611,
};

const normalizeLocation = (location) => {
  if (!location) return null;

  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    ...location,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
  };
};

const formatCoordinate = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toFixed(6);
};

const getDistanceMeters = (from, to) => {
  if (!from || !to) return null;

  const earthRadius = 6371000;

  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return "—";

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
};

const getBounds = (locations) => {
  const validLocations = locations.filter(Boolean);

  if (!validLocations.length) {
    return {
      minLat: DEFAULT_CENTER.lat - 0.005,
      maxLat: DEFAULT_CENTER.lat + 0.005,
      minLng: DEFAULT_CENTER.lng - 0.005,
      maxLng: DEFAULT_CENTER.lng + 0.005,
    };
  }

  const latitudes = validLocations.map((item) => item.lat);
  const longitudes = validLocations.map((item) => item.lng);

  let minLat = Math.min(...latitudes);
  let maxLat = Math.max(...latitudes);
  let minLng = Math.min(...longitudes);
  let maxLng = Math.max(...longitudes);

  const latPadding = Math.max((maxLat - minLat) * 0.25, 0.002);
  const lngPadding = Math.max((maxLng - minLng) * 0.25, 0.002);

  minLat -= latPadding;
  maxLat += latPadding;
  minLng -= lngPadding;
  maxLng += lngPadding;

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
  };
};

const getMarkerPosition = (location, bounds) => {
  if (!location || !bounds) {
    return {
      left: "50%",
      top: "50%",
    };
  }

  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;

  if (latRange === 0 || lngRange === 0) {
    return {
      left: "50%",
      top: "50%",
    };
  }

  const x = ((location.lng - bounds.minLng) / lngRange) * 100;
  const y = (1 - (location.lat - bounds.minLat) / latRange) * 100;

  const clampedX = Math.min(Math.max(x, 6), 94);
  const clampedY = Math.min(Math.max(y, 8), 92);

  return {
    left: `${clampedX}%`,
    top: `${clampedY}%`,
  };
};

const Marker = ({ type, location, bounds, label }) => {
  if (!location) return null;

  const position = getMarkerPosition(location, bounds);

  const iconName =
    type === "user" ? "person" : type === "destination" ? "flag" : "car";

  return (
    <View
      pointerEvents="none"
      style={[
        styles.markerWrapper,
        {
          left: position.left,
          top: position.top,
        },
      ]}
    >
      <View
        style={[
          styles.marker,
          type === "user" && styles.userMarker,
          type === "destination" && styles.destinationMarker,
          type === "parked" && styles.parkedMarker,
        ]}
      >
        <Ionicons name={iconName} size={15} color="#ffffff" />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.markerLabel,
          type === "user" && styles.userMarkerLabel,
          type === "destination" && styles.destinationMarkerLabel,
          type === "parked" && styles.parkedMarkerLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const MiniMapGrid = ({
  userLocation,
  destinationLocation,
  parkedLocation,
  bounds,
}) => {
  return (
    <View style={styles.mapCanvas}>
      <View style={styles.gridLineVerticalOne} />
      <View style={styles.gridLineVerticalTwo} />
      <View style={styles.gridLineHorizontalOne} />
      <View style={styles.gridLineHorizontalTwo} />

      <View style={styles.mapCenterPulse} />

      <Marker
        type="user"
        location={userLocation}
        bounds={bounds}
        label="Usuario"
      />

      <Marker
        type="destination"
        location={destinationLocation}
        bounds={bounds}
        label="Destino"
      />

      <Marker
        type="parked"
        location={parkedLocation}
        bounds={bounds}
        label="Coche"
      />
    </View>
  );
};

export default function ParkingMiniMap({
  currentUser,
  currentLocation,
  selectedDestination,
  parkedLocation,
}) {
  const userLocation = useMemo(() => {
    return normalizeLocation(currentLocation || currentUser?.location || null);
  }, [currentLocation, currentUser]);

  const destinationLocation = useMemo(() => {
    return normalizeLocation(selectedDestination?.location || null);
  }, [selectedDestination]);

  const normalizedParkedLocation = useMemo(() => {
    return normalizeLocation(parkedLocation);
  }, [parkedLocation]);

  const bounds = useMemo(() => {
    return getBounds([
      userLocation,
      destinationLocation,
      normalizedParkedLocation,
    ]);
  }, [userLocation, destinationLocation, normalizedParkedLocation]);

  const distanceToDestination = useMemo(() => {
    return getDistanceMeters(userLocation, destinationLocation);
  }, [userLocation, destinationLocation]);

  const distanceToCar = useMemo(() => {
    return getDistanceMeters(userLocation, normalizedParkedLocation);
  }, [userLocation, normalizedParkedLocation]);

  const hasAnyLocation =
    Boolean(userLocation) ||
    Boolean(destinationLocation) ||
    Boolean(normalizedParkedLocation);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="map-outline" size={18} color="#2563eb" />
          <Text style={styles.title}>Mapa Parking</Text>
        </View>

        <View style={styles.platformBadge}>
          <Text style={styles.platformBadgeText}>
            {Platform.OS === "web" ? "Web" : "App"}
          </Text>
        </View>
      </View>

      <View style={styles.mapBox}>
        <MiniMapGrid
          userLocation={userLocation}
          destinationLocation={destinationLocation}
          parkedLocation={normalizedParkedLocation}
          bounds={bounds}
        />

        {!hasAnyLocation ? (
          <View style={styles.emptyOverlay}>
            <Ionicons name="location-outline" size={28} color="#64748b" />
            <Text style={styles.emptyTitle}>Sin coordenadas disponibles</Text>
            <Text style={styles.emptyText}>
              Pulsa “Actualizar ubicación” para mostrar tu posición.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, styles.userDot]} />
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryLabel}>Usuario</Text>
            <Text style={styles.summaryValue}>
              {userLocation
                ? `${formatCoordinate(
                    userLocation.lat,
                  )}, ${formatCoordinate(userLocation.lng)}`
                : "Sin ubicación"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryItem}>
          <View style={[styles.dot, styles.destinationDot]} />
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryLabel}>Destino</Text>
            <Text style={styles.summaryValue}>
              {destinationLocation
                ? selectedDestination?.name || "Destino seleccionado"
                : "Sin destino"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryItem}>
          <View style={[styles.dot, styles.parkedDot]} />
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryLabel}>Coche</Text>
            <Text style={styles.summaryValue}>
              {normalizedParkedLocation
                ? `${formatCoordinate(
                    normalizedParkedLocation.lat,
                  )}, ${formatCoordinate(normalizedParkedLocation.lng)}`
                : "Sin aparcamiento guardado"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Al destino</Text>
          <Text style={styles.metricValue}>
            {formatDistance(distanceToDestination)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Al coche</Text>
          <Text style={styles.metricValue}>
            {formatDistance(distanceToCar)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 260,
    backgroundColor: "#ffffff",
  },

  header: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#ffffff",
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },

  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  platformBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563eb",
  },

  mapBox: {
    height: 260,
    backgroundColor: "#dbeafe",
    overflow: "hidden",
    position: "relative",
  },

  mapCanvas: {
    flex: 1,
    position: "relative",
    backgroundColor: "#dbeafe",
  },

  gridLineVerticalOne: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "33.333%",
    width: 1,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },

  gridLineVerticalTwo: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "66.666%",
    width: 1,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },

  gridLineHorizontalOne: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "33.333%",
    height: 1,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },

  gridLineHorizontalTwo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "66.666%",
    height: 1,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },

  mapCenterPulse: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },

  markerWrapper: {
    position: "absolute",
    alignItems: "center",
    transform: [
      {
        translateX: -20,
      },
      {
        translateY: -30,
      },
    ],
    zIndex: 5,
  },

  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  userMarker: {
    backgroundColor: "#2563eb",
  },

  destinationMarker: {
    backgroundColor: "#16a34a",
  },

  parkedMarker: {
    backgroundColor: "#f97316",
  },

  markerLabel: {
    marginTop: 4,
    maxWidth: 84,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },

  userMarkerLabel: {
    backgroundColor: "#2563eb",
  },

  destinationMarkerLabel: {
    backgroundColor: "#16a34a",
  },

  parkedMarkerLabel: {
    backgroundColor: "#f97316",
  },

  emptyOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 40,
    bottom: 40,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
    textAlign: "center",
  },

  summary: {
    padding: 14,
    gap: 10,
    backgroundColor: "#ffffff",
  },

  summaryItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },

  userDot: {
    backgroundColor: "#2563eb",
  },

  destinationDot: {
    backgroundColor: "#16a34a",
  },

  parkedDot: {
    backgroundColor: "#f97316",
  },

  summaryTextBlock: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  summaryValue: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
  },

  metrics: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  metricBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
});

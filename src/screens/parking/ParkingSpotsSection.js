import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function getStatusLabel(status) {
  switch (status) {
    case "free":
    case "available":
      return "Disponible";
    case "leaving":
      return "Quedará libre";
    case "occupied":
      return "Ocupada";
    default:
      return status || "Sin estado";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "free":
    case "available":
      return "#16a34a";
    case "leaving":
      return "#f97316";
    case "occupied":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return null;
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}

export default function ParkingSpotsSection({
  expanded,
  onToggle,
  parkingSpots,
  loading,
  userCoords,
  getDistanceMeters,
  formatElapsedTime,
  styles,
}) {
  const spots = Array.isArray(parkingSpots) ? parkingSpots : [];

  const getSpotDistance = (spot) => {
    if (
      typeof userCoords?.lat !== "number" ||
      typeof userCoords?.lng !== "number" ||
      typeof spot?.lat !== "number" ||
      typeof spot?.lng !== "number" ||
      typeof getDistanceMeters !== "function"
    ) {
      return null;
    }

    return getDistanceMeters(
      {
        latitude: userCoords.lat,
        longitude: userCoords.lng,
      },
      {
        latitude: spot.lat,
        longitude: spot.lng,
      },
    );
  };

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.collapsibleHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel="Mostrar plazas de aparcamiento"
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="car-outline" size={22} color="#2563eb" />

          <View style={styles.parkingSpotsHeaderText}>
            <Text style={styles.sectionTitle}>Plazas cercanas</Text>
            <Text style={styles.sectionSubtitle}>
              {loading
                ? "Consultando plazas..."
                : `${spots.length} plaza(s) encontrada(s)`}
            </Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#111827"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.parkingSpotsContent}>
          {loading ? (
            <View style={styles.parkingSpotsEmpty}>
              <Ionicons name="sync-outline" size={24} color="#64748b" />
              <Text style={styles.parkingSpotsEmptyTitle}>
                Consultando Convex
              </Text>
              <Text style={styles.parkingSpotsEmptyText}>
                Esperando la respuesta de parkingSpots.
              </Text>
            </View>
          ) : spots.length === 0 ? (
            <View style={styles.parkingSpotsEmpty}>
              <Ionicons name="location-outline" size={28} color="#94a3b8" />
              <Text style={styles.parkingSpotsEmptyTitle}>
                No hay plazas cercanas
              </Text>
              <Text style={styles.parkingSpotsEmptyText}>
                No se encontraron plazas válidas dentro del radio configurado.
              </Text>
            </View>
          ) : (
            spots.map((spot, index) => {
              const statusColor = getStatusColor(spot.status);
              const distance = getSpotDistance(spot);
              const formattedDistance = formatDistance(distance);

              return (
                <View
                  key={spot.id || spot._id || `parking-spot-${index}`}
                  style={styles.parkingSpotCard}
                >
                  <View style={styles.parkingSpotTopRow}>
                    <View style={styles.parkingSpotIcon}>
                      <Ionicons name="location" size={20} color="#2563eb" />
                    </View>

                    <View style={styles.parkingSpotMain}>
                      <Text style={styles.parkingSpotTitle}>
                        {spot.label || spot.name || `Plaza ${index + 1}`}
                      </Text>

                      <Text style={styles.parkingSpotOwner}>
                        Compartida por{" "}
                        {spot.revealedBy ||
                          spot.parkingAlias ||
                          spot.userId ||
                          "anonymous"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.parkingSpotStatus,
                        { backgroundColor: `${statusColor}18` },
                      ]}
                    >
                      <View
                        style={[
                          styles.parkingSpotStatusDot,
                          { backgroundColor: statusColor },
                        ]}
                      />
                      <Text
                        style={[
                          styles.parkingSpotStatusText,
                          { color: statusColor },
                        ]}
                      >
                        {getStatusLabel(spot.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.parkingSpotMetaRow}>
                    {formattedDistance ? (
                      <View style={styles.parkingSpotMetaItem}>
                        <Ionicons
                          name="walk-outline"
                          size={15}
                          color="#64748b"
                        />
                        <Text style={styles.parkingSpotMetaText}>
                          {formattedDistance}
                        </Text>
                      </View>
                    ) : null}

                    {typeof spot.accuracy === "number" ? (
                      <View style={styles.parkingSpotMetaItem}>
                        <Ionicons
                          name="radio-outline"
                          size={15}
                          color="#64748b"
                        />
                        <Text style={styles.parkingSpotMetaText}>
                          ±{Math.round(spot.accuracy)} m
                        </Text>
                      </View>
                    ) : null}

                    {spot.createdAt &&
                    typeof formatElapsedTime === "function" ? (
                      <View style={styles.parkingSpotMetaItem}>
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#64748b"
                        />
                        <Text style={styles.parkingSpotMetaText}>
                          {formatElapsedTime(spot.createdAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.parkingSpotCoordinates}>
                    <Text style={styles.parkingSpotCoordinatesText}>
                      {spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

// Añadir dentro de StyleSheet.create({ ... })

const styles = StyleSheet.create({
  parkingSpotsHeaderText: {
    flex: 1,
  },

  parkingSpotsContent: {
    gap: 10,
    paddingTop: 14,
  },

  parkingSpotsEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  parkingSpotsEmptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },

  parkingSpotsEmptyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#64748b",
    textAlign: "center",
  },

  parkingSpotCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
      },
      default: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.07,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
    }),
  },

  parkingSpotTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  parkingSpotIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },

  parkingSpotMain: {
    flex: 1,
    minWidth: 0,
  },

  parkingSpotTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },

  parkingSpotOwner: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },

  parkingSpotStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  parkingSpotStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

  parkingSpotStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  parkingSpotMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },

  parkingSpotMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  parkingSpotMetaText: {
    fontSize: 12,
    color: "#64748b",
  },

  parkingSpotCoordinates: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#f8fafc",
  },

  parkingSpotCoordinatesText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});

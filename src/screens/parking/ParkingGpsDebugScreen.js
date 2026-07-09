import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useMutation, useQuery } from "convex/react";
import moment from "moment";
import "moment/locale/es";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";

moment.locale("es");

const DEFAULT_CENTER = {
  lat: 43.5322,
  lng: -5.6611,
};

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = moment(value);

  if (!date.isValid()) return "Fecha no válida";

  return date.format("ddd D MMM HH:mm:ss");
}

function formatCoord(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toFixed(6);
}

function normalizeBrowserLocation(position) {
  if (!position?.coords) return null;

  const latitude = Number(position.coords.latitude);
  const longitude = Number(position.coords.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy:
      typeof position.coords.accuracy === "number"
        ? position.coords.accuracy
        : null,
    altitude:
      typeof position.coords.altitude === "number"
        ? position.coords.altitude
        : null,
    altitudeAccuracy:
      typeof position.coords.altitudeAccuracy === "number"
        ? position.coords.altitudeAccuracy
        : null,
    heading:
      typeof position.coords.heading === "number"
        ? position.coords.heading
        : null,
    speed:
      typeof position.coords.speed === "number" ? position.coords.speed : null,
    updatedAt: Date.now(),
  };
}

function normalizeExpoLocation(location) {
  if (!location?.coords) return null;

  const latitude = Number(location.coords.latitude);
  const longitude = Number(location.coords.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy:
      typeof location.coords.accuracy === "number"
        ? location.coords.accuracy
        : null,
    altitude:
      typeof location.coords.altitude === "number"
        ? location.coords.altitude
        : null,
    altitudeAccuracy:
      typeof location.coords.altitudeAccuracy === "number"
        ? location.coords.altitudeAccuracy
        : null,
    heading:
      typeof location.coords.heading === "number"
        ? location.coords.heading
        : null,
    speed:
      typeof location.coords.speed === "number" ? location.coords.speed : null,
    updatedAt: Date.now(),
  };
}

function getBrowserCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new Error("La geolocalización no está disponible en este navegador."),
      );
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location?.hostname !== "localhost"
    ) {
      reject(
        new Error(
          "La geolocalización requiere HTTPS. Usa localhost o Netlify HTTPS.",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const normalizedLocation = normalizeBrowserLocation(position);

        if (!normalizedLocation) {
          reject(new Error("No se pudieron leer coordenadas válidas."));
          return;
        }

        resolve(normalizedLocation);
      },
      (error) => {
        let message = "No se pudo obtener la ubicación actual.";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Permiso de ubicación denegado en el navegador.";
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          message = "La ubicación no está disponible en este dispositivo.";
        }

        if (error.code === error.TIMEOUT) {
          message = "La lectura de ubicación ha tardado demasiado.";
        }

        const normalizedError = new Error(message);
        normalizedError.code = error.code;

        reject(normalizedError);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

async function getNativeCurrentPosition() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Permiso de ubicación denegado.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const normalizedLocation = normalizeExpoLocation(position);

  if (!normalizedLocation) {
    throw new Error("No se pudieron leer coordenadas válidas.");
  }

  return normalizedLocation;
}

async function getCurrentPositionForPlatform() {
  if (Platform.OS === "web") {
    return getBrowserCurrentPosition();
  }

  return getNativeCurrentPosition();
}

function GpsPointCard({ spot, index, onDelete }) {
  const createdAt = spot.createdAt || spot.revealedAt || spot.updatedAt;

  return (
    <View style={styles.pointCard}>
      <View style={styles.pointHeader}>
        <Text style={styles.pointTitle}>Muestra #{index + 1}</Text>

        <View style={styles.pointBadge}>
          <Text style={styles.pointBadgeText}>
            {typeof spot.accuracy === "number"
              ? `±${Math.round(spot.accuracy)} m`
              : "sin precisión"}
          </Text>
        </View>
      </View>

      <View style={styles.pointRow}>
        <Text style={styles.pointLabel}>Latitud</Text>
        <Text style={styles.pointValue}>{formatCoord(spot.lat)}</Text>
      </View>

      <View style={styles.pointRow}>
        <Text style={styles.pointLabel}>Longitud</Text>
        <Text style={styles.pointValue}>{formatCoord(spot.lng)}</Text>
      </View>

      <View style={styles.pointRow}>
        <Text style={styles.pointLabel}>Fecha</Text>
        <Text style={styles.pointValue}>{formatDateTime(createdAt)}</Text>
      </View>

      {spot.locationSource ? (
        <View style={styles.pointRow}>
          <Text style={styles.pointLabel}>Origen</Text>
          <Text style={styles.pointValue}>{spot.locationSource}</Text>
        </View>
      ) : null}

      {spot.note ? <Text style={styles.pointNote}>{spot.note}</Text> : null}
      <Pressable
        style={styles.deleteSampleButton}
        onPress={() => onDelete?.(spot)}
      >
        <Ionicons name="trash-outline" size={16} color="#b91c1c" />
        <Text style={styles.deleteSampleButtonText}>Borrar muestra</Text>
      </Pressable>
    </View>
  );
}

export default function ParkingGpsDebugScreen({ navigation }) {
  const [saving, setSaving] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const createGpsDebugParkingSpot = useMutation(
    api.parking.createGpsDebugParkingSpot,
  );

  const deleteGpsDebugParkingSpot = useMutation(
    api.parking.deleteGpsDebugParkingSpot,
  );

  const spots = useQuery(api.parking.listGpsDebugParkingSpots, {
    limit: 150,
  });

  const parkingSpots = useMemo(() => {
    if (!Array.isArray(spots)) return [];

    return spots
      .filter(
        (spot) => typeof spot.lat === "number" && typeof spot.lng === "number",
      )
      .map((spot, index) => ({
        id: spot.id || String(spot._id || index),
        lat: spot.lat,
        lng: spot.lng,
        accuracy: spot.accuracy,
        revealedBy:
          typeof spot.accuracy === "number"
            ? `±${Math.round(spot.accuracy)} m`
            : spot.locationSource || "GPS",
        status: "free",
        createdAt: spot.createdAt || spot.revealedAt || spot.updatedAt,
      }));
  }, [spots]);

  const mapCenter = useMemo(() => {
    if (selectedPoint) {
      return {
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
      };
    }

    if (lastLocation) {
      return {
        lat: lastLocation.latitude,
        lng: lastLocation.longitude,
      };
    }

    if (parkingSpots.length > 0) {
      return {
        lat: parkingSpots[0].lat,
        lng: parkingSpots[0].lng,
      };
    }

    return DEFAULT_CENTER;
  }, [selectedPoint, lastLocation, parkingSpots]);

  const handleMapPress = (point) => {
    const lat = Number(point?.lat ?? point?.latitude);
    const lng = Number(point?.lng ?? point?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    setSelectedPoint({
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      selectedAt: Date.now(),
    });
  };

  const saveCurrentPosition = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const location = await getCurrentPositionForPlatform();

      setLastLocation(location);

      await createGpsDebugParkingSpot({
        lat: location.latitude,
        lng: location.longitude,
        accuracy:
          typeof location.accuracy === "number" ? location.accuracy : undefined,
        locationSource: Platform.OS === "web" ? "web-gps-debug" : "gps-debug",
        note: `GPS debug ${formatDateTime(Date.now())}`,
      });

      safeAlert(
        "Posición guardada",
        "La posición GPS se ha añadido a parkingSpots.",
      );
    } catch (error) {
      console.warn("[ParkingGpsDebugScreen] Error:", error);

      safeAlert(
        "No se pudo guardar",
        error?.message || "No se pudo leer o guardar la ubicación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveSelectedPoint = async () => {
    if (saving || !selectedPoint) return;

    setSaving(true);

    try {
      await createGpsDebugParkingSpot({
        lat: selectedPoint.latitude,
        lng: selectedPoint.longitude,
        accuracy: undefined,
        locationSource: "map-click",
        note: `Punto seleccionado en mapa ${formatDateTime(Date.now())}`,
      });

      safeAlert(
        "Punto guardado",
        "Las coordenadas seleccionadas en el mapa se han guardado en parkingSpots.",
      );
    } catch (error) {
      console.warn(
        "[ParkingGpsDebugScreen] Error saving selected point:",
        error,
      );

      safeAlert(
        "No se pudo guardar",
        error?.message || "No se pudo guardar el punto seleccionado.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSample = (spot) => {
    if (!spot?._id) {
      safeAlert(
        "No se puede borrar",
        "Esta muestra no tiene identificador válido.",
      );
      return;
    }

    safeAlert(
      "Borrar muestra",
      "¿Quieres borrar esta muestra GPS de parkingSpots?",
      [
        {
          key: "cancel",
          text: "Cancelar",
          style: "cancel",
        },
        {
          key: "delete",
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGpsDebugParkingSpot({
                spotId: spot._id,
              });

              safeAlert(
                "Muestra borrada",
                "La muestra GPS se ha eliminado correctamente.",
              );
            } catch (error) {
              console.warn(
                "[ParkingGpsDebugScreen] Error deleting GPS sample:",
                error,
              );

              safeAlert(
                "No se pudo borrar",
                error?.message || "No se pudo borrar la muestra GPS.",
              );
            }
          },
        },
      ],
    );
  };

  const clearSelectedPoint = () => {
    setSelectedPoint(null);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="chevron-back" size={20} color="#14532d" />
          <Text style={styles.backText}>Parking</Text>
        </Pressable>

        <Text style={styles.title}>GPS Debug</Text>

        <Text style={styles.subtitle}>
          Pantalla privada para estudiar el margen de error del GPS. Cada punto
          se guarda en Convex dentro de la tabla parkingSpots con zone:
          gps-debug.
        </Text>
      </View>

      <View style={styles.privateBox}>
        <Ionicons name="lock-closed-outline" size={18} color="#92400e" />
        <Text style={styles.privateText}>
          No mostrar esta pantalla en menús públicos. Úsala solo para pruebas
          internas.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Mapa de muestras GPS</Text>
            <Text style={styles.cardSubtitle}>
              Puntos guardados: {parkingSpots.length}
            </Text>
          </View>

          {saving ? <ActivityIndicator size="small" color="#15803d" /> : null}
        </View>

        <View style={styles.mapHintBox}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color="#475569"
          />
          <Text style={styles.mapHintText}>
            Pulsa en el mapa para obtener las coordenadas de un punto concreto.
            Después puedes guardarlo como muestra manual.
          </Text>
        </View>

        <View style={styles.mapContainer}>
          <StoreMapPreview
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            userLat={lastLocation?.latitude}
            userLng={lastLocation?.longitude}
            parkingSpots={parkingSpots}
            onMapPress={handleMapPress}
            selectedLat={selectedPoint?.lat}
            selectedLng={selectedPoint?.lng}
            defaultZoom={17}
            minZoom={14}
            maxZoom={21}
            fitMaxZoom={18}
          />
        </View>

        {selectedPoint ? (
          <View style={styles.selectedPointBox}>
            <View style={styles.selectedPointHeader}>
              <View style={styles.selectedPointTitleRow}>
                <Ionicons name="pin-outline" size={18} color="#dc2626" />
                <Text style={styles.selectedPointTitle}>
                  Punto seleccionado en el mapa
                </Text>
              </View>

              <Pressable
                hitSlop={8}
                onPress={clearSelectedPoint}
                style={styles.clearSelectedButton}
              >
                <Ionicons name="close-outline" size={18} color="#991b1b" />
              </Pressable>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointLabel}>Latitud</Text>
              <Text style={styles.pointValue}>
                {selectedPoint.latitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointLabel}>Longitud</Text>
              <Text style={styles.pointValue}>
                {selectedPoint.longitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.pointRow}>
              <Text style={styles.pointLabel}>Seleccionado</Text>
              <Text style={styles.pointValue}>
                {formatDateTime(selectedPoint.selectedAt)}
              </Text>
            </View>

            <Pressable
              style={[
                styles.saveSelectedButton,
                saving && styles.saveButtonDisabled,
              ]}
              onPress={saveSelectedPoint}
              disabled={saving}
            >
              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.saveSelectedButtonText}>
                Guardar punto seleccionado
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveCurrentPosition}
          disabled={saving}
        >
          <Ionicons name="locate-outline" size={18} color="#ffffff" />
          <Text style={styles.saveButtonText}>
            {saving
              ? "Leyendo y guardando..."
              : "Leer posición GPS actual y guardar"}
          </Text>
        </Pressable>
      </View>

      {lastLocation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Última lectura GPS</Text>

          <View style={styles.pointRow}>
            <Text style={styles.pointLabel}>Latitud</Text>
            <Text style={styles.pointValue}>
              {formatCoord(lastLocation.latitude)}
            </Text>
          </View>

          <View style={styles.pointRow}>
            <Text style={styles.pointLabel}>Longitud</Text>
            <Text style={styles.pointValue}>
              {formatCoord(lastLocation.longitude)}
            </Text>
          </View>

          <View style={styles.pointRow}>
            <Text style={styles.pointLabel}>Precisión declarada</Text>
            <Text style={styles.pointValue}>
              {typeof lastLocation.accuracy === "number"
                ? `±${Math.round(lastLocation.accuracy)} m`
                : "Sin dato"}
            </Text>
          </View>

          <View style={styles.pointRow}>
            <Text style={styles.pointLabel}>Fecha</Text>
            <Text style={styles.pointValue}>
              {formatDateTime(lastLocation.updatedAt)}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Muestras guardadas</Text>

        {!Array.isArray(spots) ? (
          <Text style={styles.loadingText}>Cargando puntos...</Text>
        ) : spots.length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no hay posiciones guardadas.
          </Text>
        ) : (
          <View style={styles.pointsList}>
            {spots.map((spot, index) => (
              <GpsPointCard
                key={spot.id || spot._id || index}
                spot={spot}
                index={index}
                onDelete={deleteSample}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 16,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },

  backText: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "900",
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
    fontWeight: "700",
  },

  privateBox: {
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  privateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",

    ...Platform.select({
      web: {
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  cardSubtitle: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },

  mapHintBox: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  mapHintText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },

  mapContainer: {
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#e5e7eb",
  },

  saveButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "#15803d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  selectedPointBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },

  selectedPointHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },

  selectedPointTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  selectedPointTitle: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "900",
  },

  clearSelectedButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },

  saveSelectedButton: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveSelectedButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  pointRow: {
    minHeight: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  pointLabel: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },

  pointValue: {
    flex: 1,
    textAlign: "right",
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  pointsList: {
    marginTop: 12,
    gap: 10,
  },

  pointCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    padding: 12,
  },

  pointHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  pointTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  pointBadge: {
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  pointBadgeText: {
    color: "#15803d",
    fontSize: 12,
    fontWeight: "900",
  },

  pointNote: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },

  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
  },
  deleteSampleButton: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  deleteSampleButtonText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "900",
  },
});

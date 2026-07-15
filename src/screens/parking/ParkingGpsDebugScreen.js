import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";

const DEFAULT_CITY = "gijon";
const DEFAULT_CENTER = { lat: 43.5322, lng: -5.6611 };
const ACCURACY_MODE = {
  MAXIMUM: "maximum",
  NORMAL: "normal",
};
const WORK_MODE = {
  FIELD: "field",
  OFFICE: "office",
};

function formatCoord(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(6) : "—";
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const values = [lat1, lng1, lat2, lng2].map(Number);

  if (!values.every(Number.isFinite)) return null;

  const [aLat, aLng, bLat, bLng] = values;
  const earthRadius = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) *
      Math.cos(toRadians(bLat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePosition(position) {
  if (!position?.coords) return null;

  const latitude = Number(position.coords.latitude);
  const longitude = Number(position.coords.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const optionalNumber = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy: optionalNumber(position.coords.accuracy),
    altitude: optionalNumber(position.coords.altitude),
    altitudeAccuracy: optionalNumber(position.coords.altitudeAccuracy),
    heading: optionalNumber(position.coords.heading),
    speed: optionalNumber(position.coords.speed),
    measuredAt: Date.now(),
  };
}

function getBrowserCurrentPosition(accuracyMode) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La geolocalización no está disponible."));
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location?.hostname !== "localhost"
    ) {
      reject(new Error("La geolocalización web requiere HTTPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const normalized = normalizePosition(position);
        normalized
          ? resolve(normalized)
          : reject(
              new Error("La lectura GPS no contiene coordenadas válidas."),
            );
      },
      (error) => {
        const messages = {
          1: "Permiso de ubicación denegado.",
          2: "La ubicación no está disponible.",
          3: "La lectura GPS ha tardado demasiado.",
        };
        reject(new Error(messages[error.code] || "No se pudo leer el GPS."));
      },
      {
        enableHighAccuracy: accuracyMode === ACCURACY_MODE.MAXIMUM,
        timeout: accuracyMode === ACCURACY_MODE.MAXIMUM ? 30000 : 15000,
        maximumAge: 0,
      },
    );
  });
}

async function getCurrentPositionForPlatform(accuracyMode) {
  if (Platform.OS === "web") {
    return getBrowserCurrentPosition(accuracyMode);
  }

  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Permiso de ubicación denegado.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy:
      accuracyMode === ACCURACY_MODE.MAXIMUM
        ? Location.Accuracy.Highest
        : Location.Accuracy.Balanced,
  });
  const normalized = normalizePosition(position);

  if (!normalized) throw new Error("No se obtuvieron coordenadas válidas.");

  return normalized;
}

function MeasurementCard({
  measurement,
  index,
  destination,
  onFocus,
  onDelete,
}) {
  const distance = distanceMeters(
    destination?.latitude,
    destination?.longitude,
    measurement.lat,
    measurement.lng,
  );

  return (
    <View style={styles.measurementCard}>
      <View style={styles.measurementHeader}>
        <View style={styles.measurementTitleBlock}>
          <Text style={styles.measurementTitle}>Muestra {index + 1}</Text>
          <Text style={styles.measurementZone}>
            {measurement.destinationName}
          </Text>
        </View>

        <View style={styles.accuracyBadge}>
          <Text style={styles.accuracyBadgeText}>
            {typeof measurement.accuracy === "number"
              ? `±${measurement.accuracy.toFixed(1)} m`
              : "Sin precisión"}
          </Text>
        </View>
      </View>

      <Text style={styles.coordinatesText}>
        {formatCoord(measurement.lat)}, {formatCoord(measurement.lng)}
      </Text>

      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Fecha</Text>
        <Text style={styles.dataValue}>
          {formatDateTime(measurement.measuredAt)}
        </Text>
      </View>

      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Distancia al centro</Text>
        <Text style={styles.dataValue}>
          {typeof distance === "number" ? `${distance.toFixed(1)} m` : "—"}
        </Text>
      </View>

      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Origen</Text>
        <Text style={styles.dataValue}>
          {measurement.locationSource === "manual-map"
            ? "punto manual"
            : measurement.locationSource || "gps"}{" "}
          · {measurement.platform || "—"}
        </Text>
      </View>

      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Modo solicitado</Text>
        <Text style={styles.dataValue}>
          {measurement.locationSource === "manual-map" ||
          measurement.platform === "office"
            ? "Punto de gabinete"
            : measurement.accuracyMode === ACCURACY_MODE.MAXIMUM
              ? "Precisión máxima"
              : "Precisión normal"}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={styles.focusButton}
          onPress={() => onFocus(measurement)}
        >
          <Ionicons name="locate-outline" size={16} color="#14532d" />
          <Text style={styles.focusButtonText}>Ver en mapa</Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(measurement)}
        >
          <Ionicons name="trash-outline" size={16} color="#b91c1c" />
          <Text style={styles.deleteButtonText}>Borrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ParkingGpsDebugScreen({ navigation }) {
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [destinationPickerVisible, setDestinationPickerVisible] =
    useState(false);
  const [readingLocation, setReadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [selectedMapPoint, setSelectedMapPoint] = useState(null);
  const [mapFocus, setMapFocus] = useState(DEFAULT_CENTER);
  const [mapRevision, setMapRevision] = useState(0);
  const [accuracyMode, setAccuracyMode] = useState(ACCURACY_MODE.MAXIMUM);
  const [workMode, setWorkMode] = useState(WORK_MODE.FIELD);
  const workModeRef = useRef(WORK_MODE.FIELD);

  const currentUser = useQuery(api.users.current);
  const isAdmin = currentUser?.isAdmin === true;

  const destinationsResult = useQuery(
    api.parking.listParkingDestinations,
    isAdmin ? { city: DEFAULT_CITY } : "skip",
  );
  const destinations = Array.isArray(destinationsResult)
    ? destinationsResult
    : [];

  const selectedDestination = useMemo(
    () =>
      destinations.find((item) => item.id === selectedDestinationId) ||
      destinations[0] ||
      null,
    [destinations, selectedDestinationId],
  );

  const measurementsResult = useQuery(
    api.parking.listParkingGpsMeasurements,
    isAdmin && selectedDestination
      ? { destinationId: selectedDestination.id, limit: 200 }
      : "skip",
  );
  const measurements = Array.isArray(measurementsResult)
    ? measurementsResult
    : [];

  const createMeasurement = useMutation(
    api.parking.createParkingGpsMeasurement,
  );
  const deleteMeasurement = useMutation(
    api.parking.deleteParkingGpsMeasurement,
  );

  useEffect(() => {
    if (!destinations.length) return;

    const exists = destinations.some(
      (item) => item.id === selectedDestinationId,
    );
    if (!exists) setSelectedDestinationId(destinations[0].id);
  }, [destinations, selectedDestinationId]);

  useEffect(() => {
    if (!selectedDestination) return;

    setMapFocus({
      lat: selectedDestination.latitude,
      lng: selectedDestination.longitude,
    });
    setSelectedMapPoint(null);
    setMapRevision((value) => value + 1);
  }, [selectedDestination?.id]);

  useEffect(() => {
    workModeRef.current = workMode;

    if (workMode !== WORK_MODE.OFFICE || !selectedDestination) return;

    // El modo gabinete no conserva ni utiliza una ubicación real previa.
    setLastLocation(null);
    setMapFocus({
      lat: selectedDestination.latitude,
      lng: selectedDestination.longitude,
    });
    setSelectedMapPoint(null);
    setMapRevision((value) => value + 1);
  }, [workMode, selectedDestination?.id]);

  const mapMeasurements = useMemo(
    () =>
      measurements.map((measurement, index) => ({
        ...measurement,
        alias: `Muestra ${measurements.length - index}`,
        status: "measurement",
      })),
    [measurements],
  );

  const focusMap = (point) => {
    const lat = Number(point?.lat ?? point?.latitude);
    const lng = Number(point?.lng ?? point?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setMapFocus({ lat, lng });
    setSelectedMapPoint({ lat, lng });
    setMapRevision((value) => value + 1);
  };

  const changeWorkMode = (nextMode) => {
    // Actualización síncrona para invalidar cualquier lectura GPS en curso.
    workModeRef.current = nextMode;
    setWorkMode(nextMode);
  };

  const readCurrentPosition = async ({ save }) => {
    if (workMode !== WORK_MODE.FIELD) {
      safeAlert(
        "GPS desactivado en gabinete",
        "En trabajo de gabinete solo puedes guardar el punto seleccionado en el mapa.",
      );
      return;
    }
    if (readingLocation || saving || !selectedDestination) return;

    save ? setSaving(true) : setReadingLocation(true);

    try {
      const location = await getCurrentPositionForPlatform(accuracyMode);
      // Una lectura iniciada en campo puede terminar después de cambiar a
      // gabinete. En ese caso se descarta completamente.
      if (workModeRef.current !== WORK_MODE.FIELD) return;
      setLastLocation(location);
      focusMap(location);

      if (save) {
        await createMeasurement({
          destinationId: selectedDestination.id,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          altitude: location.altitude,
          altitudeAccuracy: location.altitudeAccuracy,
          heading: location.heading,
          speed: location.speed,
          source: Platform.OS === "web" ? "web-geolocation" : "expo-location",
          platform: Platform.OS,
          accuracyMode,
        });

        safeAlert(
          "Coordenadas guardadas",
          `La medición se ha añadido a ${selectedDestination.label}.`,
        );
      }
    } catch (error) {
      safeAlert(
        save ? "No se pudo guardar" : "No se pudo obtener la posición",
        error?.message || "No se pudo leer la ubicación del dispositivo.",
      );
    } finally {
      setReadingLocation(false);
      setSaving(false);
    }
  };

  const saveSelectedMapPoint = async () => {
    if (workMode !== WORK_MODE.OFFICE || saving || !selectedDestination) return;

    const lat = Number(selectedMapPoint?.lat);
    const lng = Number(selectedMapPoint?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      safeAlert(
        "Selecciona un punto",
        "Pulsa primero sobre el mapa en el lugar donde quieras crear la coordenada.",
      );
      return;
    }

    setSaving(true);
    try {
      await createMeasurement({
        destinationId: selectedDestination.id,
        lat,
        lng,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        source: "manual-map",
        platform: "office",
        // El esquema Convex solo permite "maximum" o "normal".
        // El origen manual se conserva en source/platform.
        accuracyMode: ACCURACY_MODE.NORMAL,
      });
      safeAlert(
        "Punto de gabinete guardado",
        `La coordenada manual se ha añadido a ${selectedDestination.label}.`,
      );
    } catch (error) {
      safeAlert(
        "No se pudo guardar",
        error?.message || "No se pudo guardar el punto seleccionado.",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (measurement) => {
    safeAlert("Borrar medición", "¿Quieres eliminar esta lectura GPS?", [
      { key: "cancel", text: "Cancelar", style: "cancel" },
      {
        key: "delete",
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMeasurement({ measurementId: measurement._id });
          } catch (error) {
            safeAlert(
              "No se pudo borrar",
              error?.message || "No se pudo eliminar la medición.",
            );
          }
        },
      },
    ]);
  };

  if (currentUser === undefined) {
    return (
      <View style={styles.accessScreen}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.accessLoadingText}>Comprobando permisos…</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.accessScreen}>
        <View style={styles.accessCard}>
          <Ionicons name="lock-closed-outline" size={42} color="#b45309" />
          <Text style={styles.accessTitle}>Acceso restringido</Text>
          <Text style={styles.accessText}>
            Esta funcionalidad está disponible únicamente para usuarios con
            privilegios de administrador.
          </Text>
          <Pressable
            style={styles.accessBackButton}
            onPress={() => navigation?.goBack?.()}
          >
            <Ionicons name="chevron-back" size={18} color="#ffffff" />
            <Text style={styles.accessBackButtonText}>Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        workMode === WORK_MODE.OFFICE && styles.officeContent,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="chevron-back" size={20} color="#14532d" />
          <Text style={styles.backText}>Parking</Text>
        </Pressable>

        <Text style={styles.title}>Mediciones GPS</Text>
        <Text style={styles.subtitle}>
          Alterna entre trabajo de campo con GPS real y trabajo de gabinete con
          puntos seleccionados manualmente en el mapa.
        </Text>
      </View>

      <View style={styles.adminBox}>
        <Ionicons name="shield-checkmark-outline" size={19} color="#92400e" />
        <Text style={styles.adminText}>
          Herramienta administrativa. Convex comprueba el rol antes de leer,
          guardar o borrar mediciones.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Modalidad de trabajo</Text>
        <View style={styles.workModeRow}>
          <Pressable
            style={[
              styles.workModeButton,
              workMode === WORK_MODE.FIELD && styles.workModeButtonSelected,
            ]}
            onPress={() => changeWorkMode(WORK_MODE.FIELD)}
          >
            <Ionicons
              name="walk-outline"
              size={19}
              color={workMode === WORK_MODE.FIELD ? "#ffffff" : "#14532d"}
            />
            <View style={styles.workModeTextBlock}>
              <Text
                style={[
                  styles.workModeTitle,
                  workMode === WORK_MODE.FIELD && styles.workModeTitleSelected,
                ]}
              >
                Trabajo de campo
              </Text>
              <Text
                style={[
                  styles.workModeDescription,
                  workMode === WORK_MODE.FIELD &&
                    styles.workModeDescriptionSelected,
                ]}
              >
                Permite centrar y guardar la posición GPS actual.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.workModeButton,
              workMode === WORK_MODE.OFFICE && styles.workModeButtonSelected,
            ]}
            onPress={() => changeWorkMode(WORK_MODE.OFFICE)}
          >
            <Ionicons
              name="map-outline"
              size={19}
              color={workMode === WORK_MODE.OFFICE ? "#ffffff" : "#14532d"}
            />
            <View style={styles.workModeTextBlock}>
              <Text
                style={[
                  styles.workModeTitle,
                  workMode === WORK_MODE.OFFICE && styles.workModeTitleSelected,
                ]}
              >
                Trabajo de gabinete
              </Text>
              <Text
                style={[
                  styles.workModeDescription,
                  workMode === WORK_MODE.OFFICE &&
                    styles.workModeDescriptionSelected,
                ]}
              >
                GPS bloqueado: solo guarda el punto elegido sobre el mapa.
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Zona de trabajo</Text>

        <Pressable
          style={styles.destinationSelector}
          onPress={() => setDestinationPickerVisible((value) => !value)}
        >
          <View style={styles.destinationSelectorText}>
            <Text style={styles.destinationName}>
              {selectedDestination?.label || "Selecciona un destino"}
            </Text>
            <Text style={styles.destinationAddress} numberOfLines={2}>
              {selectedDestination?.address || "Cargando destinos…"}
            </Text>
          </View>
          <Ionicons
            name={destinationPickerVisible ? "chevron-up" : "chevron-down"}
            size={20}
            color="#15803d"
          />
        </Pressable>

        {destinationPickerVisible ? (
          <View style={styles.destinationList}>
            {destinations.map((destination) => {
              const selected = destination.id === selectedDestination?.id;
              return (
                <Pressable
                  key={destination.id}
                  style={[
                    styles.destinationOption,
                    selected && styles.destinationOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedDestinationId(destination.id);
                    setDestinationPickerVisible(false);
                  }}
                >
                  <Ionicons
                    name={selected ? "checkmark-circle" : "navigate-outline"}
                    size={19}
                    color={selected ? "#ffffff" : "#15803d"}
                  />
                  <View style={styles.destinationOptionText}>
                    <Text
                      style={[
                        styles.destinationOptionName,
                        selected && styles.destinationOptionNameSelected,
                      ]}
                    >
                      {destination.label}
                    </Text>
                    <Text
                      style={[
                        styles.destinationOptionMeta,
                        selected && styles.destinationOptionMetaSelected,
                      ]}
                    >
                      {destination.category}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {workMode === WORK_MODE.FIELD ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Precisión de la lectura</Text>

          <View style={styles.accuracyModeRow}>
            <Pressable
              style={[
                styles.accuracyModeButton,
                accuracyMode === ACCURACY_MODE.MAXIMUM &&
                  styles.accuracyModeButtonSelected,
              ]}
              onPress={() => setAccuracyMode(ACCURACY_MODE.MAXIMUM)}
            >
              <Ionicons
                name="radio-button-on-outline"
                size={18}
                color={
                  accuracyMode === ACCURACY_MODE.MAXIMUM ? "#ffffff" : "#15803d"
                }
              />
              <View style={styles.accuracyModeTextBlock}>
                <Text
                  style={[
                    styles.accuracyModeTitle,
                    accuracyMode === ACCURACY_MODE.MAXIMUM &&
                      styles.accuracyModeTitleSelected,
                  ]}
                >
                  Precisión máxima
                </Text>
                <Text
                  style={[
                    styles.accuracyModeDescription,
                    accuracyMode === ACCURACY_MODE.MAXIMUM &&
                      styles.accuracyModeDescriptionSelected,
                  ]}
                >
                  Más lenta y con mayor consumo; solicita la mejor lectura
                  disponible.
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.accuracyModeButton,
                accuracyMode === ACCURACY_MODE.NORMAL &&
                  styles.accuracyModeButtonSelected,
              ]}
              onPress={() => setAccuracyMode(ACCURACY_MODE.NORMAL)}
            >
              <Ionicons
                name="radio-button-on-outline"
                size={18}
                color={
                  accuracyMode === ACCURACY_MODE.NORMAL ? "#ffffff" : "#15803d"
                }
              />
              <View style={styles.accuracyModeTextBlock}>
                <Text
                  style={[
                    styles.accuracyModeTitle,
                    accuracyMode === ACCURACY_MODE.NORMAL &&
                      styles.accuracyModeTitleSelected,
                  ]}
                >
                  Precisión normal
                </Text>
                <Text
                  style={[
                    styles.accuracyModeDescription,
                    accuracyMode === ACCURACY_MODE.NORMAL &&
                      styles.accuracyModeDescriptionSelected,
                  ]}
                >
                  Lectura más rápida y con menor consumo de batería.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.workspace}>
        <View style={[styles.card, styles.workspaceMapCard]}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.cardTitle}>Mapa de mediciones</Text>
              <Text style={styles.cardSubtitle}>
                {measurements.length} muestras en{" "}
                {selectedDestination?.label || "la zona"}
              </Text>
            </View>
            {(readingLocation || saving) && (
              <ActivityIndicator size="small" color="#15803d" />
            )}
          </View>

          <View style={styles.mapContainer}>
            <StoreMapPreview
              key={`gps-map-${selectedDestination?.id || "none"}-${mapRevision}`}
              lat={selectedDestination?.latitude ?? DEFAULT_CENTER.lat}
              lng={selectedDestination?.longitude ?? DEFAULT_CENTER.lng}
              centerLat={mapFocus.lat}
              centerLng={mapFocus.lng}
              userLat={
                workMode === WORK_MODE.FIELD ? lastLocation?.lat : undefined
              }
              userLng={
                workMode === WORK_MODE.FIELD ? lastLocation?.lng : undefined
              }
              selectedLat={selectedMapPoint?.lat}
              selectedLng={selectedMapPoint?.lng}
              parkingSpots={mapMeasurements}
              onMapPress={(point) => setSelectedMapPoint(point)}
              defaultZoom={18}
              minZoom={13}
              maxZoom={21}
              fitMaxZoom={19}
              preserveViewportOnMarkerChange
              zoomControlsEnabled
              zoomGesturesEnabled={false}
              mapStyle="gray"
              parkingMarkerStyle="circle-stick"
              parkingMarkerBaseSize={18}
              markerSizeByZoom={false}
            />
          </View>

          <Text style={styles.mapHelp}>
            {workMode === WORK_MODE.OFFICE
              ? "Pulsa sobre el mapa para seleccionar la coordenada que deseas guardar."
              : "Arrastra el mapa para desplazarte. Usa los controles +/− para cambiar el zoom."}
          </Text>

          {workMode === WORK_MODE.FIELD && lastLocation ? (
            <View style={styles.currentLocationBox}>
              <Text style={styles.currentLocationTitle}>
                Última lectura del móvil
              </Text>
              <Text style={styles.coordinatesText}>
                {formatCoord(lastLocation.lat)}, {formatCoord(lastLocation.lng)}
              </Text>
              <Text style={styles.currentLocationMeta}>
                Precisión:{" "}
                {typeof lastLocation.accuracy === "number"
                  ? `±${lastLocation.accuracy.toFixed(1)} m`
                  : "sin dato"}
              </Text>
            </View>
          ) : null}

          {workMode === WORK_MODE.FIELD ? (
            <View style={styles.mainActions}>
              <Pressable
                disabled={readingLocation || saving || !selectedDestination}
                style={[
                  styles.secondaryButton,
                  (readingLocation || saving) && styles.disabled,
                ]}
                onPress={() => readCurrentPosition({ save: false })}
              >
                <Ionicons name="locate-outline" size={18} color="#14532d" />
                <Text style={styles.secondaryButtonText}>
                  Centrar mi posición
                </Text>
              </Pressable>

              <Pressable
                disabled={readingLocation || saving || !selectedDestination}
                style={[
                  styles.primaryButton,
                  (readingLocation || saving) && styles.disabled,
                ]}
                onPress={() => readCurrentPosition({ save: true })}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>
                  {saving ? "Guardando…" : "Tomar coordenadas"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.mainActions}>
              <Pressable
                disabled={saving || !selectedDestination || !selectedMapPoint}
                style={[
                  styles.primaryButton,
                  (saving || !selectedDestination || !selectedMapPoint) &&
                    styles.disabled,
                ]}
                onPress={saveSelectedMapPoint}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>
                  {saving ? "Guardando…" : "Guardar punto del mapa"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.card, styles.workspaceMeasurementsCard]}>
          <Text style={styles.cardTitle}>Mediciones guardadas</Text>
          <Text style={styles.cardSubtitle}>
            Las cards pertenecen únicamente al destino seleccionado.
          </Text>

          {measurementsResult === undefined ? (
            <Text style={styles.emptyText}>Cargando mediciones…</Text>
          ) : measurements.length === 0 ? (
            <Text style={styles.emptyText}>
              Todavía no hay lecturas en esta zona.
            </Text>
          ) : (
            <ScrollView
              style={styles.measurementsScroll}
              contentContainerStyle={styles.measurementsList}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {measurements.map((measurement, index) => (
                <MeasurementCard
                  key={measurement._id}
                  measurement={measurement}
                  index={measurements.length - index - 1}
                  destination={selectedDestination}
                  onFocus={focusMap}
                  onDelete={requestDelete}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f4f6" },
  accessScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  accessLoadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
  },
  accessCard: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  accessTitle: {
    marginTop: 12,
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
  },
  accessText: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "600",
  },
  accessBackButton: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#15803d",
  },
  accessBackButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  content: {
    width: "100%",
    maxWidth: 780,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 48,
  },
  officeContent: {
    maxWidth: "100%",
    alignSelf: "stretch",
    paddingHorizontal: Platform.select({ web: 28, default: 16 }),
  },
  header: { marginBottom: 16 },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  backText: { color: "#14532d", fontSize: 15, fontWeight: "900" },
  title: { color: "#111827", fontSize: 30, fontWeight: "900" },
  subtitle: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  adminBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  adminText: {
    flex: 1,
    color: "#92400e",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    ...Platform.select({
      web: { boxShadow: "0 8px 20px rgba(15,23,42,0.06)" },
      default: { elevation: 2 },
    }),
  },
  sectionLabel: {
    marginBottom: 8,
    color: "#14532d",
    fontSize: 13,
    fontWeight: "900",
  },
  destinationSelector: {
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  destinationSelectorText: { flex: 1, minWidth: 0 },
  destinationName: { color: "#111827", fontSize: 16, fontWeight: "900" },
  destinationAddress: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  destinationList: { marginTop: 10, gap: 8 },
  destinationOption: {
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  destinationOptionSelected: {
    borderColor: "#15803d",
    backgroundColor: "#15803d",
  },
  destinationOptionText: { flex: 1 },
  destinationOptionName: { color: "#111827", fontSize: 13, fontWeight: "900" },
  destinationOptionNameSelected: { color: "#ffffff" },
  destinationOptionMeta: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  destinationOptionMetaSelected: { color: "#dcfce7" },
  accuracyModeRow: { gap: 9 },
  accuracyModeButton: {
    minHeight: 68,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  accuracyModeButtonSelected: {
    borderColor: "#15803d",
    backgroundColor: "#15803d",
  },
  accuracyModeTextBlock: { flex: 1 },
  accuracyModeTitle: { color: "#14532d", fontSize: 14, fontWeight: "900" },
  accuracyModeTitleSelected: { color: "#ffffff" },
  accuracyModeDescription: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  accuracyModeDescriptionSelected: { color: "#dcfce7" },
  workModeRow: { gap: 9 },
  workModeButton: {
    minHeight: 72,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  workModeButtonSelected: {
    borderColor: "#15803d",
    backgroundColor: "#15803d",
  },
  workModeTextBlock: { flex: 1 },
  workModeTitle: { color: "#14532d", fontSize: 14, fontWeight: "900" },
  workModeTitleSelected: { color: "#ffffff" },
  workModeDescription: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  workModeDescriptionSelected: { color: "#dcfce7" },
  workspace: {
    gap: 16,
    ...Platform.select({
      web: { flexDirection: "row", alignItems: "stretch" },
      default: { flexDirection: "column" },
    }),
  },
  workspaceMapCard: {
    ...Platform.select({
      web: { flex: 1.45, minWidth: 0 },
      default: { width: "100%" },
    }),
  },
  workspaceMeasurementsCard: {
    ...Platform.select({
      web: { flex: 0.9, minWidth: 280, maxHeight: 490 },
      default: { width: "100%" },
    }),
  },
  mapHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  cardSubtitle: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  mapContainer: {
    height: Platform.select({ web: 360, default: 390 }),
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
  mapHelp: {
    marginTop: 9,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  currentLocationBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  currentLocationTitle: { color: "#1e3a8a", fontSize: 13, fontWeight: "900" },
  currentLocationMeta: {
    marginTop: 4,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  mainActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  primaryButton: {
    flexGrow: 1,
    minHeight: 46,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: "#15803d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 46,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryButtonText: { color: "#14532d", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  measurementsScroll: {
    marginTop: 12,
    ...Platform.select({ web: { flex: 1 }, default: { maxHeight: 520 } }),
  },
  measurementsList: { marginTop: 12, gap: 10 },
  measurementCard: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f8fafc",
  },
  measurementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  measurementTitleBlock: { flex: 1 },
  measurementTitle: { color: "#111827", fontSize: 15, fontWeight: "900" },
  measurementZone: {
    marginTop: 2,
    color: "#15803d",
    fontSize: 12,
    fontWeight: "800",
  },
  accuracyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
  },
  accuracyBadgeText: { color: "#14532d", fontSize: 11, fontWeight: "900" },
  coordinatesText: {
    marginTop: 9,
    color: "#111827",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  dataRow: {
    marginTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dataLabel: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  dataValue: {
    flex: 1,
    color: "#334155",
    fontSize: 12,
    textAlign: "right",
    fontWeight: "800",
  },
  cardActions: { marginTop: 12, flexDirection: "row", gap: 8 },
  focusButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  focusButtonText: { color: "#14532d", fontSize: 12, fontWeight: "900" },
  deleteButton: {
    minWidth: 100,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteButtonText: { color: "#b91c1c", fontSize: 12, fontWeight: "900" },
  emptyText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
});

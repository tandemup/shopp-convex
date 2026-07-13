import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import moment from "moment";
import "moment/locale/es";

import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { ROUTES } from "@/src/navigation/ROUTES";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";

moment.locale("es");

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const PARKING_LOCAL_EVENTS_STORAGE_KEY = "@shopp/parking/events";
const PARKING_LOCAL_STATE_STORAGE_KEY = "@shopp/parking/current-state";

const PARKING_STATUS = {
  LOOKING: "looking",
  PARKED: "parked",
  LEAVING: "leaving",
  ABANDONED: "abandoned",
  CANCELLED: "cancelled",
  INACTIVE: "inactive",
};

const PARKING_STATUS_LABELS = {
  [PARKING_STATUS.LOOKING]: "Buscando plaza",
  [PARKING_STATUS.PARKED]: "Aparqué",
  [PARKING_STATUS.LEAVING]: "Salí / dejo plaza",
  [PARKING_STATUS.ABANDONED]: "Búsqueda abandonada",
  [PARKING_STATUS.CANCELLED]: "Búsqueda cancelada",
  [PARKING_STATUS.INACTIVE]: "Inactivo",
};

const PARKING_STATUS_DESCRIPTIONS = {
  [PARKING_STATUS.LOOKING]: "Estás buscando una plaza cerca de tu destino.",
  [PARKING_STATUS.PARKED]:
    "Has aparcado. Puedes compartir la posición aproximada de la plaza.",
  [PARKING_STATUS.LEAVING]:
    "Estás saliendo y puedes avisar de que esa plaza queda libre.",
  [PARKING_STATUS.ABANDONED]:
    "Has abandonado la búsqueda porque no encontraste aparcamiento.",
  [PARKING_STATUS.CANCELLED]: "Has cancelado una búsqueda iniciada por error.",
  [PARKING_STATUS.INACTIVE]: "No estás compartiendo actividad de parking.",
};

const PARKING_STATUS_COLORS = {
  [PARKING_STATUS.LOOKING]: "#2563eb",
  [PARKING_STATUS.PARKED]: "#16a34a",
  [PARKING_STATUS.LEAVING]: "#f97316",
  [PARKING_STATUS.ABANDONED]: "#7c3aed",
  [PARKING_STATUS.CANCELLED]: "#6b7280",
  [PARKING_STATUS.INACTIVE]: "#6b7280",
};

const LOCATION_WATCH_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60000,
  distanceInterval: 75,
};

const LOCATION_SINGLE_OPTIONS = {
  accuracy: Location.Accuracy.High,
};

const WEB_LOCATION_POLL_INTERVAL_MS = 60000;
const WEB_LOCATION_DISTANCE_INTERVAL_METERS = 75;

const TRACKING_STATUSES = new Set([PARKING_STATUS.LOOKING]);

const STOPPED_STATUSES = new Set([
  PARKING_STATUS.PARKED,
  PARKING_STATUS.LEAVING,
  PARKING_STATUS.ABANDONED,
  PARKING_STATUS.CANCELLED,
  PARKING_STATUS.INACTIVE,
]);

const DEFAULT_PARKING_CITY = "gijon";
const DEFAULT_PARKING_ZONE = "general";
const VALID_SPOTS_RADIUS_METERS = 1000;

const DEFAULT_REGION = {
  latitude: 43.5322,
  longitude: -5.6611,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

const DEFAULT_SETTINGS = {
  parkingAlias: "",
  destinationId: "",
  destinationName: "",
  destinationAddress: "",
  destinationLatitude: null,
  destinationLongitude: null,
  customDestination: "",
};

const DEFAULT_CURRENT_STATE = {
  status: PARKING_STATUS.INACTIVE,
  latitude: null,
  longitude: null,
  accuracy: null,
  updatedAt: null,
};

function normalizeText(value) {
  return String(value || "").trim();
}

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatDateTime = (value) => {
  if (!value) return "Sin datos";

  const date = moment(value);

  if (!date.isValid()) return "Fecha no válida";

  return capitalizeFirst(date.format("ddd D MMM HH:mm"));
};

const formatElapsedTime = (value) => {
  if (!value) return "Sin datos";

  const date = moment(value);

  if (!date.isValid()) return "Fecha no válida";

  return date.fromNow();
};

function getDisplayParkingAlias(settings) {
  const alias = normalizeText(settings?.parkingAlias || settings?.userId);
  return alias || "anonymous";
}

function getDisplayDestination(settings) {
  const destinationName = normalizeText(settings?.destinationName);
  const customDestination = normalizeText(settings?.customDestination);

  return destinationName || customDestination || "Sin destino definido";
}

function getAvailableNextStatuses(currentStatus) {
  switch (currentStatus) {
    case PARKING_STATUS.LOOKING:
      return [
        PARKING_STATUS.PARKED,
        PARKING_STATUS.ABANDONED,
        PARKING_STATUS.CANCELLED,
      ];

    case PARKING_STATUS.PARKED:
      return [PARKING_STATUS.LEAVING];

    case PARKING_STATUS.LEAVING:
    case PARKING_STATUS.ABANDONED:
    case PARKING_STATUS.CANCELLED:
    case PARKING_STATUS.INACTIVE:
      return [PARKING_STATUS.LOOKING];

    default:
      return [PARKING_STATUS.LOOKING];
  }
}

function isValidStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;

  const availableStatuses = getAvailableNextStatuses(currentStatus);
  return availableStatuses.includes(nextStatus);
}

function buildEventMessage(status, destination) {
  if (status === PARKING_STATUS.LOOKING) {
    return `Estoy buscando plaza cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.PARKED) {
    return `He aparcado cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.LEAVING) {
    return `Estoy saliendo. Puede quedar una plaza libre cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.ABANDONED) {
    return `Abandono la búsqueda porque no encontré aparcamiento cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.CANCELLED) {
    return `Cancelo la búsqueda iniciada por error cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.INACTIVE) {
    return `Estoy inactivo en Parking cerca de ${destination}.`;
  }

  return `Estado actualizado cerca de ${destination}.`;
}

function createLocalEvent({
  parkingAlias,
  status,
  destinationName,
  destinationAddress,
  note,
  latitude,
  longitude,
  accuracy,
}) {
  const now = Date.now();

  return {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    parkingAlias,
    status,
    destinationName,
    destinationAddress,
    note,
    latitude,
    longitude,
    accuracy,
    createdAt: now,
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
    accuracy:
      typeof location.coords.accuracy === "number"
        ? location.coords.accuracy
        : null,
    updatedAt: Date.now(),
  };
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
    accuracy:
      typeof position.coords.accuracy === "number"
        ? position.coords.accuracy
        : null,
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
          "La geolocalización requiere HTTPS. Abre la app desde la URL segura de Netlify.",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const normalizedLocation = normalizeBrowserLocation(position);

        if (!normalizedLocation) {
          reject(
            new Error("No se pudieron leer coordenadas válidas del navegador."),
          );
          return;
        }

        resolve(normalizedLocation);
      },
      (error) => {
        let message = "No se pudo obtener la ubicación actual.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Permiso de ubicación denegado. Activa la ubicación para esta web en el navegador.";
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "La ubicación no está disponible. Comprueba GPS, WiFi o permisos del sistema.";
        }

        if (error.code === error.TIMEOUT) {
          message =
            "La lectura de ubicación ha tardado demasiado. Inténtalo de nuevo.";
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

function getDistanceMeters(fromLocation, toLocation) {
  if (
    typeof fromLocation?.latitude !== "number" ||
    typeof fromLocation?.longitude !== "number" ||
    typeof toLocation?.latitude !== "number" ||
    typeof toLocation?.longitude !== "number"
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;

  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(toLocation.latitude);
  const deltaLat = toRadians(toLocation.latitude - fromLocation.latitude);
  const deltaLng = toRadians(toLocation.longitude - fromLocation.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function StatusBadge({ status }) {
  const color = PARKING_STATUS_COLORS[status] || "#6b7280";

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusBadgeText, { color }]}>
        {PARKING_STATUS_LABELS[status] || "Sin estado"}
      </Text>
    </View>
  );
}

function CoordinateDropdown({ title, subtitle, open, onToggle, children }) {
  return (
    <View style={styles.coordinateDropdown}>
      <Pressable
        style={styles.coordinateDropdownHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.coordinateDropdownTitleBox}>
          <Text style={styles.coordinateDropdownTitle}>{title}</Text>

          {subtitle ? (
            <Text style={styles.coordinateDropdownSubtitle}>{subtitle}</Text>
          ) : null}
        </View>

        <Ionicons
          name={open ? "chevron-up-outline" : "chevron-down-outline"}
          size={20}
          color="#0f172a"
        />
      </Pressable>

      {open ? (
        <View style={styles.coordinateDropdownBody}>{children}</View>
      ) : null}
    </View>
  );
}

function CoordinateMapToggle({ label, value, onToggle, disabled }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: value,
        disabled: Boolean(disabled),
      }}
      disabled={disabled}
      onPress={onToggle}
      style={[
        styles.coordinateMapToggle,
        disabled && styles.coordinateMapToggleDisabled,
      ]}
    >
      <Ionicons
        name={value ? "checkbox-outline" : "square-outline"}
        size={22}
        color={disabled ? "#94a3b8" : "#2563eb"}
      />

      <Text
        style={[
          styles.coordinateMapToggleText,
          disabled && styles.coordinateMapToggleTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ParkingSpotsDropdown({ spots, loading, open, onToggle }) {
  const spotCount = Array.isArray(spots) ? spots.length : 0;

  return (
    <CoordinateDropdown
      title="Tabla parkingSpots"
      subtitle={
        loading
          ? "Consultando plazas guardadas en Convex..."
          : `${spotCount} ${
              spotCount === 1 ? "registro visible" : "registros visibles"
            }.`
      }
      open={open}
      onToggle={onToggle}
    >
      {loading ? (
        <View style={styles.parkingSpotsEmptyBox}>
          <Ionicons name="cloud-download-outline" size={22} color="#64748b" />

          <Text style={styles.parkingSpotsEmptyTitle}>
            Cargando parkingSpots
          </Text>

          <Text style={styles.parkingSpotsEmptyText}>
            Esperando la respuesta de Convex.
          </Text>
        </View>
      ) : spotCount === 0 ? (
        <View style={styles.parkingSpotsEmptyBox}>
          <Ionicons name="location-outline" size={22} color="#94a3b8" />

          <Text style={styles.parkingSpotsEmptyTitle}>
            Sin plazas registradas
          </Text>

          <Text style={styles.parkingSpotsEmptyText}>
            La consulta no ha devuelto registros de parkingSpots dentro del
            radio actual.
          </Text>
        </View>
      ) : (
        <View style={styles.parkingSpotsList}>
          {spots.map((spot, index) => {
            const spotId = spot.id || spot._id || `parking-spot-${index}`;

            const statusLabel = spot.status || "sin estado";

            const dateValue =
              spot.revealedAt ||
              spot.updatedAt ||
              spot.createdAt ||
              spot._creationTime;

            const hasCoordinates =
              typeof spot.lat === "number" && typeof spot.lng === "number";

            return (
              <View key={String(spotId)} style={styles.parkingSpotRow}>
                <View style={styles.parkingSpotHeader}>
                  <View style={styles.parkingSpotTitleBox}>
                    <Text style={styles.parkingSpotTitle}>
                      Plaza {index + 1}
                    </Text>

                    <Text numberOfLines={1} style={styles.parkingSpotId}>
                      {String(spotId)}
                    </Text>
                  </View>

                  <View style={styles.parkingSpotStatusBadge}>
                    <Text style={styles.parkingSpotStatusText}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.parkingSpotDataRow}>
                  <Text style={styles.parkingSpotDataLabel}>Coordenadas</Text>

                  <Text style={styles.parkingSpotDataValue}>
                    {hasCoordinates
                      ? `${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}`
                      : "Sin coordenadas"}
                  </Text>
                </View>

                <View style={styles.parkingSpotDataRow}>
                  <Text style={styles.parkingSpotDataLabel}>Alias</Text>

                  <Text style={styles.parkingSpotDataValue}>
                    {spot.alias ||
                      spot.revealedBy ||
                      spot.parkingAlias ||
                      "anonymous"}
                  </Text>
                </View>

                {spot.city ? (
                  <View style={styles.parkingSpotDataRow}>
                    <Text style={styles.parkingSpotDataLabel}>Ciudad</Text>

                    <Text style={styles.parkingSpotDataValue}>{spot.city}</Text>
                  </View>
                ) : null}

                {spot.zone ? (
                  <View style={styles.parkingSpotDataRow}>
                    <Text style={styles.parkingSpotDataLabel}>Zona</Text>

                    <Text style={styles.parkingSpotDataValue}>{spot.zone}</Text>
                  </View>
                ) : null}

                {typeof spot.accuracy === "number" ? (
                  <View style={styles.parkingSpotDataRow}>
                    <Text style={styles.parkingSpotDataLabel}>Precisión</Text>

                    <Text style={styles.parkingSpotDataValue}>
                      {Math.round(spot.accuracy)} m
                    </Text>
                  </View>
                ) : null}

                {spot.locationSource ? (
                  <View style={styles.parkingSpotDataRow}>
                    <Text style={styles.parkingSpotDataLabel}>Origen</Text>

                    <Text style={styles.parkingSpotDataValue}>
                      {spot.locationSource}
                    </Text>
                  </View>
                ) : null}

                {spot.destinationName ? (
                  <View style={styles.parkingSpotDataRow}>
                    <Text style={styles.parkingSpotDataLabel}>Destino</Text>

                    <Text style={styles.parkingSpotDataValue}>
                      {spot.destinationName}
                    </Text>
                  </View>
                ) : null}

                {spot.destinationAddress ? (
                  <View style={styles.parkingSpotDataRow}>
                    <Text style={styles.parkingSpotDataLabel}>Dirección</Text>

                    <Text style={styles.parkingSpotDataValue}>
                      {spot.destinationAddress}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.parkingSpotDataRow,
                    styles.parkingSpotDataRowLast,
                  ]}
                >
                  <Text style={styles.parkingSpotDataLabel}>Actualización</Text>

                  <Text style={styles.parkingSpotDataValue}>
                    {dateValue ? formatDateTime(dateValue) : "Sin datos"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </CoordinateDropdown>
  );
}

function LocationSummary({
  userLatitude,
  userLongitude,
  userAccuracy,
  destinationName,
  destinationAddress,
  destinationLatitude,
  destinationLongitude,
  userCoordinatesExpanded,
  onToggleUserCoordinates,
  destinationCoordinatesExpanded,
  onToggleDestinationCoordinates,
  showUserOnMap,
  onToggleShowUserOnMap,
  showDestinationOnMap,
  onToggleShowDestinationOnMap,
}) {
  const hasUserLocation =
    typeof userLatitude === "number" && typeof userLongitude === "number";

  const hasDestinationLocation =
    typeof destinationLatitude === "number" &&
    typeof destinationLongitude === "number";

  return (
    <View style={styles.locationSummaryBlock}>
      <CoordinateDropdown
        title="Coordenadas del usuario"
        subtitle="Posición GPS actual detectada por la app."
        open={userCoordinatesExpanded}
        onToggle={onToggleUserCoordinates}
      >
        <View style={styles.coordsBox}>
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Latitud usuario</Text>
            <Text style={styles.coordValue}>
              {hasUserLocation ? userLatitude.toFixed(6) : "Sin dato"}
            </Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Longitud usuario</Text>
            <Text style={styles.coordValue}>
              {hasUserLocation ? userLongitude.toFixed(6) : "Sin dato"}
            </Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Precisión</Text>
            <Text style={styles.coordValue}>
              {typeof userAccuracy === "number"
                ? `${Math.round(userAccuracy)} m`
                : "Sin dato"}
            </Text>
          </View>

          <CoordinateMapToggle
            label="Mostrar usuario en el mapa"
            value={showUserOnMap}
            onToggle={onToggleShowUserOnMap}
            disabled={!hasUserLocation}
          />
        </View>
      </CoordinateDropdown>

      <CoordinateDropdown
        title="Coordenadas del destino"
        subtitle="Destino elegido para buscar aparcamiento."
        open={destinationCoordinatesExpanded}
        onToggle={onToggleDestinationCoordinates}
      >
        <View style={styles.coordsBox}>
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Destino</Text>
            <Text style={styles.coordValue}>
              {destinationName || "Sin destino"}
            </Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Dirección</Text>
            <Text style={styles.coordValue}>
              {destinationAddress || "Sin dirección"}
            </Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Latitud destino</Text>
            <Text style={styles.coordValue}>
              {hasDestinationLocation
                ? destinationLatitude.toFixed(6)
                : "Sin dato"}
            </Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Longitud destino</Text>
            <Text style={styles.coordValue}>
              {hasDestinationLocation
                ? destinationLongitude.toFixed(6)
                : "Sin dato"}
            </Text>
          </View>

          <CoordinateMapToggle
            label="Mostrar destino en el mapa"
            value={showDestinationOnMap}
            onToggle={onToggleShowDestinationOnMap}
            disabled={!hasDestinationLocation}
          />
        </View>
      </CoordinateDropdown>
    </View>
  );
}

function LocationSection({
  expanded,
  onToggle,
  latitude,
  longitude,
  accuracy,
  onRefreshLocation,
  loadingLocation,
  selectedDestination,
  selectedDestinationName,
  selectedDestinationAddress,
  destinationCoords,
  mapCenter,
  userCoords,
  activeParkingSpots,
  parkingSpotsLoading,
  onMarkValidSpot,
  markingValidSpot,
  validParkingSpotsCount,
}) {
  const [userCoordinatesExpanded, setUserCoordinatesExpanded] = useState(false);
  const [destinationCoordinatesExpanded, setDestinationCoordinatesExpanded] =
    useState(false);
  const [parkingSpotsExpanded, setParkingSpotsExpanded] = useState(false);

  const [showUserOnMap, setShowUserOnMap] = useState(true);
  const [showDestinationOnMap, setShowDestinationOnMap] = useState(true);

  const hasUserCoords =
    typeof userCoords?.lat === "number" && typeof userCoords?.lng === "number";

  const hasDestinationCoords =
    typeof destinationCoords?.lat === "number" &&
    typeof destinationCoords?.lng === "number";

  const visibleUserCoords = showUserOnMap && hasUserCoords ? userCoords : null;

  const visibleDestinationCoords =
    showDestinationOnMap && hasDestinationCoords ? destinationCoords : null;

  const visibleMapCenter = useMemo(() => {
    if (visibleUserCoords && !visibleDestinationCoords) {
      return visibleUserCoords;
    }

    if (visibleDestinationCoords && !visibleUserCoords) {
      return visibleDestinationCoords;
    }

    if (visibleUserCoords && visibleDestinationCoords) {
      return mapCenter;
    }

    return {
      lat: DEFAULT_REGION.latitude,
      lng: DEFAULT_REGION.longitude,
    };
  }, [visibleUserCoords, visibleDestinationCoords, mapCenter]);

  const safeMapLat =
    typeof visibleMapCenter?.lat === "number"
      ? visibleMapCenter.lat
      : DEFAULT_REGION.latitude;

  const safeMapLng =
    typeof visibleMapCenter?.lng === "number"
      ? visibleMapCenter.lng
      : DEFAULT_REGION.longitude;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.collapsibleHeader}
        onPress={onToggle}
        accessibilityRole="button"
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="map-outline" size={22} color="#2563eb" />

          <View>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <Text style={styles.sectionSubtitle}>
              Coordenadas aproximadas de la plaza.
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
        <View style={styles.locationContent}>
          <LocationSummary
            userLatitude={latitude}
            userLongitude={longitude}
            userAccuracy={accuracy}
            destinationName={selectedDestinationName}
            destinationAddress={selectedDestinationAddress}
            destinationLatitude={destinationCoords?.lat}
            destinationLongitude={destinationCoords?.lng}
            userCoordinatesExpanded={userCoordinatesExpanded}
            onToggleUserCoordinates={() =>
              setUserCoordinatesExpanded((value) => !value)
            }
            destinationCoordinatesExpanded={destinationCoordinatesExpanded}
            onToggleDestinationCoordinates={() =>
              setDestinationCoordinatesExpanded((value) => !value)
            }
            showUserOnMap={showUserOnMap}
            onToggleShowUserOnMap={() => setShowUserOnMap((value) => !value)}
            showDestinationOnMap={showDestinationOnMap}
            onToggleShowDestinationOnMap={() =>
              setShowDestinationOnMap((value) => !value)
            }
          />
          <ParkingSpotsDropdown
            spots={activeParkingSpots}
            loading={parkingSpotsLoading}
            open={parkingSpotsExpanded}
            onToggle={() => setParkingSpotsExpanded((value) => !value)}
          />
          <Pressable
            accessibilityRole="button"
            style={[
              styles.secondaryActionButton,
              loadingLocation && styles.actionButtonDisabled,
            ]}
            onPress={onRefreshLocation}
            disabled={loadingLocation}
          >
            <Ionicons name="locate-outline" size={18} color="#2563eb" />

            <Text style={styles.secondaryActionButtonText}>
              {loadingLocation
                ? "Obteniendo ubicación..."
                : "Actualizar ubicación"}
            </Text>
          </Pressable>

          <Text style={styles.validSpotCounterText}>
            {validParkingSpotsCount > 0
              ? `${validParkingSpotsCount} plaza(s) válidas visibles en el mapa.`
              : "No hay plazas válidas visibles todavía."}
          </Text>
          <View style={styles.mapVisibilityHint}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#64748b"
            />
            <Text style={styles.mapVisibilityHintText}>
              Activa una o ambas casillas para centrar el mapa en usuario,
              destino o ajustar ambos puntos.
            </Text>
          </View>

          <View style={styles.mapContainer}>
            <StoreMapPreview
              lat={visibleDestinationCoords?.lat}
              lng={visibleDestinationCoords?.lng}
              userLat={visibleUserCoords?.lat}
              userLng={visibleUserCoords?.lng}
              parkingSpots={activeParkingSpots}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EventCard({ event, isOwnUser }) {
  const color = PARKING_STATUS_COLORS[event.status] || "#6b7280";
  const hasLocation =
    typeof event.latitude === "number" && typeof event.longitude === "number";

  return (
    <View style={[styles.eventCard, isOwnUser && styles.eventCardOwn]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventUserBlock}>
          <Text style={styles.eventUser}>
            {event.parkingAlias || event.userId}
            {isOwnUser ? " (Tú)" : ""}
          </Text>

          <Text style={styles.eventDate}>
            {formatDateTime(event.createdAt)}
          </Text>
        </View>

        <View
          style={[styles.eventStatusPill, { backgroundColor: `${color}16` }]}
        >
          <Text style={[styles.eventStatusPillText, { color }]}>
            {PARKING_STATUS_LABELS[event.status] || "Estado"}
          </Text>
        </View>
      </View>

      <Text style={styles.eventMessage}>{event.note}</Text>

      {event.destinationName ? (
        <View style={styles.eventMetaRow}>
          <Ionicons name="navigate-outline" size={15} color="#6b7280" />
          <Text style={styles.eventMetaText}>{event.destinationName}</Text>
        </View>
      ) : null}

      {event.destinationAddress ? (
        <View style={styles.eventMetaRow}>
          <Ionicons name="business-outline" size={15} color="#6b7280" />
          <Text style={styles.eventMetaText}>{event.destinationAddress}</Text>
        </View>
      ) : null}

      {hasLocation ? (
        <View style={styles.eventCoords}>
          <Text style={styles.eventCoordsText}>
            {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ParkingSpotsSection({
  expanded,
  onToggle,
  parkingSpots,
  loading,
  userCoords,
}) {
  const spots = Array.isArray(parkingSpots) ? parkingSpots : [];

  const getStatusLabel = (status) => {
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
  };

  const getStatusColor = (status) => {
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
  };

  const getSpotDistance = (spot) => {
    if (
      typeof userCoords?.lat !== "number" ||
      typeof userCoords?.lng !== "number" ||
      typeof spot?.lat !== "number" ||
      typeof spot?.lng !== "number"
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

  const formatDistance = (distance) => {
    if (!Number.isFinite(distance)) {
      return null;
    }

    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }

    return `${(distance / 1000).toFixed(1)} km`;
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

              const latitude =
                typeof spot.lat === "number" ? spot.lat : spot.latitude;

              const longitude =
                typeof spot.lng === "number" ? spot.lng : spot.longitude;

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
                        {
                          backgroundColor: `${statusColor}18`,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.parkingSpotStatusDot,
                          {
                            backgroundColor: statusColor,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.parkingSpotStatusText,
                          {
                            color: statusColor,
                          },
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

                    {spot.createdAt || spot.revealedAt || spot.updatedAt ? (
                      <View style={styles.parkingSpotMetaItem}>
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#64748b"
                        />

                        <Text style={styles.parkingSpotMetaText}>
                          {formatElapsedTime(
                            spot.createdAt || spot.revealedAt || spot.updatedAt,
                          )}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {typeof latitude === "number" &&
                  typeof longitude === "number" ? (
                    <View style={styles.parkingSpotCoordinates}>
                      <Text style={styles.parkingSpotCoordinatesText}>
                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function ParkingScreen({ navigation }) {
  const scrollRef = useRef(null);
  const locationWatcherRef = useRef(null);
  const currentStateRef = useRef(DEFAULT_CURRENT_STATE);
  const latestUserLocationRef = useRef(null);
  const parkedSpotLocationRef = useRef(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentState, setCurrentState] = useState(DEFAULT_CURRENT_STATE);
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState("");

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const [parkingSpotsExpanded, setParkingSpotsExpanded] = useState(true);

  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState(null);
  const [markingValidSpot, setMarkingValidSpot] = useState(false);

  const createValidParkingSpotMutation = useMutation(
    api.parking.createValidParkingSpot,
  );

  const validParkingSpots = useQuery(api.parking.listValidParkingSpots, {
    city: DEFAULT_PARKING_CITY,
    zone: DEFAULT_PARKING_ZONE,
    lat:
      typeof currentState.latitude === "number"
        ? currentState.latitude
        : undefined,
    lng:
      typeof currentState.longitude === "number"
        ? currentState.longitude
        : undefined,
    radiusMeters: VALID_SPOTS_RADIUS_METERS,
    limit: 100,
  });
  useEffect(() => {
    currentStateRef.current = currentState;

    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      latestUserLocationRef.current = {
        latitude: currentState.latitude,
        longitude: currentState.longitude,
        accuracy: currentState.accuracy,
        updatedAt: currentState.updatedAt,
      };

      if (currentState.status === PARKING_STATUS.PARKED) {
        parkedSpotLocationRef.current = {
          latitude: currentState.latitude,
          longitude: currentState.longitude,
          accuracy: currentState.accuracy,
          updatedAt: currentState.updatedAt,
        };
      }
    }
  }, [currentState]);

  const displayParkingAlias = useMemo(
    () => getDisplayParkingAlias(settings),
    [settings],
  );

  const displayDestination = useMemo(
    () => getDisplayDestination(settings),
    [settings],
  );

  const destinationAddress = useMemo(
    () => normalizeText(settings.destinationAddress),
    [settings.destinationAddress],
  );

  const destinationCoords = useMemo(() => {
    const lat = Number(settings.destinationLatitude);
    const lng = Number(settings.destinationLongitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }, [settings.destinationLatitude, settings.destinationLongitude]);

  const mapCenter = useMemo(() => {
    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      return {
        lat: currentState.latitude,
        lng: currentState.longitude,
      };
    }

    if (destinationCoords) {
      return destinationCoords;
    }

    return {
      lat: DEFAULT_REGION.latitude,
      lng: DEFAULT_REGION.longitude,
    };
  }, [currentState.latitude, currentState.longitude, destinationCoords]);

  const userCoords = useMemo(() => {
    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      return {
        lat: currentState.latitude,
        lng: currentState.longitude,
      };
    }

    return null;
  }, [currentState.latitude, currentState.longitude]);

  const activeParkingSpots = useMemo(() => {
    if (!Array.isArray(validParkingSpots)) {
      return [];
    }

    return validParkingSpots
      .filter((spot) => {
        const lat =
          typeof spot.lat === "number" ? spot.lat : spot.location?.lat;

        const lng =
          typeof spot.lng === "number" ? spot.lng : spot.location?.lng;

        return Number.isFinite(lat) && Number.isFinite(lng);
      })
      .map((spot) => {
        const lat =
          typeof spot.lat === "number" ? spot.lat : spot.location?.lat;

        const lng =
          typeof spot.lng === "number" ? spot.lng : spot.location?.lng;

        return {
          ...spot,

          id: spot.id || String(spot._id),

          lat,
          lng,

          accuracy:
            typeof spot.accuracy === "number"
              ? spot.accuracy
              : spot.location?.accuracy,

          revealedBy:
            spot.revealedBy || spot.parkingAlias || spot.userId || "anonymous",

          status: spot.status || "free",

          createdAt: spot.revealedAt || spot.createdAt || spot.updatedAt,
        };
      })
      .sort((spotA, spotB) => {
        if (
          typeof userCoords?.lat !== "number" ||
          typeof userCoords?.lng !== "number"
        ) {
          return 0;
        }

        const distanceA = getDistanceMeters(
          {
            latitude: userCoords.lat,
            longitude: userCoords.lng,
          },
          {
            latitude: spotA.lat,
            longitude: spotA.lng,
          },
        );

        const distanceB = getDistanceMeters(
          {
            latitude: userCoords.lat,
            longitude: userCoords.lng,
          },
          {
            latitude: spotB.lat,
            longitude: spotB.lng,
          },
        );

        return distanceA - distanceB;
      });
  }, [validParkingSpots, userCoords]);

  const availableNextStatuses = useMemo(
    () => getAvailableNextStatuses(currentState.status),
    [currentState.status],
  );

  const hasUserSettings = useMemo(() => {
    return Boolean(normalizeText(settings.parkingAlias || settings.userId));
  }, [settings.parkingAlias, settings.userId]);

  const hasDestination = useMemo(() => {
    return displayDestination !== "Sin destino definido";
  }, [displayDestination]);

  const canPublish = hasUserSettings && hasDestination;

  const persistCurrentState = useCallback(async (nextState) => {
    currentStateRef.current = nextState;
    setCurrentState(nextState);

    try {
      await AsyncStorage.setItem(
        PARKING_LOCAL_STATE_STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error saving current state:", error);
    }
  }, []);

  const persistEvents = useCallback(async (nextEvents) => {
    setEvents(nextEvents);

    try {
      await AsyncStorage.setItem(
        PARKING_LOCAL_EVENTS_STORAGE_KEY,
        JSON.stringify(nextEvents),
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error saving events:", error);
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationPermissionStatus(permission.status);

    if (permission.status !== "granted") {
      safeAlert(
        "Permiso de ubicación necesario",
        "Activa la ubicación para poder compartir coordenadas de parking.",
      );

      return false;
    }

    return true;
  }, []);

  const stopLocationWatcher = useCallback(() => {
    const subscription = locationWatcherRef.current;
    locationWatcherRef.current = null;

    if (!subscription) {
      return;
    }

    try {
      if (typeof subscription.remove === "function") {
        subscription.remove();
      }
    } catch (error) {
      console.warn(
        "[ParkingScreen] Error stopping location watcher:",
        error?.message || error,
      );
    }
  }, []);

  const applyLocationToCurrentState = useCallback(
    async (location, options = {}) => {
      if (!location) return null;

      const nextState = {
        ...currentStateRef.current,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        updatedAt: location.updatedAt || Date.now(),
      };

      latestUserLocationRef.current = {
        latitude: nextState.latitude,
        longitude: nextState.longitude,
        accuracy: nextState.accuracy,
        updatedAt: nextState.updatedAt,
      };

      if (options.saveAsParkedSpot) {
        parkedSpotLocationRef.current = latestUserLocationRef.current;
      }

      await persistCurrentState(nextState);

      return latestUserLocationRef.current;
    },
    [persistCurrentState],
  );

  const readCurrentLocation = useCallback(async () => {
    if (Platform.OS === "web") {
      return getBrowserCurrentPosition();
    }

    const position = await Location.getCurrentPositionAsync(
      LOCATION_SINGLE_OPTIONS,
    );

    return normalizeExpoLocation(position);
  }, []);

  const getCurrentLocation = useCallback(
    async ({ persist = true, saveAsParkedSpot = false } = {}) => {
      try {
        setLoadingLocation(true);

        let normalizedLocation = null;

        if (Platform.OS === "web") {
          normalizedLocation = await getBrowserCurrentPosition();
          setLocationPermissionStatus("granted");
        } else {
          const hasPermission = await requestLocationPermission();

          if (!hasPermission) {
            return null;
          }

          const position = await Location.getCurrentPositionAsync(
            LOCATION_SINGLE_OPTIONS,
          );

          normalizedLocation = normalizeExpoLocation(position);
        }

        if (!normalizedLocation) {
          return null;
        }

        latestUserLocationRef.current = normalizedLocation;

        if (saveAsParkedSpot) {
          parkedSpotLocationRef.current = normalizedLocation;
        }

        if (persist) {
          await applyLocationToCurrentState(normalizedLocation, {
            saveAsParkedSpot,
          });
        }

        return normalizedLocation;
      } catch (error) {
        console.warn("[ParkingScreen] Error getting location:", error);

        if (Platform.OS === "web" && error?.code === 1) {
          setLocationPermissionStatus("denied");
        }

        safeAlert(
          "Ubicación no disponible",
          error?.message || "No se ha podido obtener la ubicación actual.",
        );

        return null;
      } finally {
        setLoadingLocation(false);
      }
    },
    [applyLocationToCurrentState, requestLocationPermission],
  );

  const startLocationWatcher = useCallback(async () => {
    if (locationWatcherRef.current) {
      return;
    }

    if (Platform.OS === "web") {
      try {
        const initialLocation = await readCurrentLocation();

        if (initialLocation) {
          setLocationPermissionStatus("granted");
          await applyLocationToCurrentState(initialLocation);
        }
      } catch (error) {
        if (error?.code === 1) {
          setLocationPermissionStatus("denied");
        }

        console.warn(
          "[ParkingScreen] Error getting initial web location:",
          error?.message || error,
        );
      }

      const intervalId = setInterval(async () => {
        try {
          const activeStatus = currentStateRef.current?.status;

          if (activeStatus !== PARKING_STATUS.LOOKING) {
            stopLocationWatcher();
            return;
          }

          const nextLocation = await readCurrentLocation();

          if (!nextLocation) {
            return;
          }

          setLocationPermissionStatus("granted");

          const previousLocation =
            latestUserLocationRef.current ||
            (typeof currentStateRef.current?.latitude === "number" &&
            typeof currentStateRef.current?.longitude === "number"
              ? {
                  latitude: currentStateRef.current.latitude,
                  longitude: currentStateRef.current.longitude,
                  accuracy: currentStateRef.current.accuracy,
                  updatedAt: currentStateRef.current.updatedAt,
                }
              : null);

          const distanceMeters = getDistanceMeters(
            previousLocation,
            nextLocation,
          );

          if (
            !previousLocation ||
            distanceMeters >= WEB_LOCATION_DISTANCE_INTERVAL_METERS
          ) {
            await applyLocationToCurrentState(nextLocation);
          }
        } catch (error) {
          if (error?.code === 1) {
            setLocationPermissionStatus("denied");
            stopLocationWatcher();
          }

          console.warn(
            "[ParkingScreen] Error polling web location:",
            error?.message || error,
          );
        }
      }, WEB_LOCATION_POLL_INTERVAL_MS);

      locationWatcherRef.current = {
        remove: () => clearInterval(intervalId),
      };

      return;
    }

    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      return;
    }

    try {
      const initialPosition = await Location.getCurrentPositionAsync(
        LOCATION_SINGLE_OPTIONS,
      );

      const initialLocation = normalizeExpoLocation(initialPosition);

      if (initialLocation) {
        await applyLocationToCurrentState(initialLocation);
      }
    } catch (error) {
      console.warn("[ParkingScreen] Error getting initial location:", error);
    }

    try {
      const subscription = await Location.watchPositionAsync(
        LOCATION_WATCH_OPTIONS,
        async (position) => {
          const watchedLocation = normalizeExpoLocation(position);

          if (!watchedLocation) {
            return;
          }

          const activeStatus = currentStateRef.current?.status;

          if (activeStatus !== PARKING_STATUS.LOOKING) {
            stopLocationWatcher();
            return;
          }

          await applyLocationToCurrentState(watchedLocation);
        },
      );

      locationWatcherRef.current = subscription;
    } catch (error) {
      console.warn("[ParkingScreen] Error starting location watcher:", error);

      safeAlert(
        "Ubicación no disponible",
        "No se ha podido iniciar el seguimiento de ubicación.",
      );
    }
  }, [
    applyLocationToCurrentState,
    readCurrentLocation,
    requestLocationPermission,
    stopLocationWatcher,
  ]);

  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PARKING_SETTINGS_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);
        const parkingAlias = parsed?.parkingAlias || parsed?.userId || "";

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          parkingAlias,
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.warn("[ParkingScreen] Error loading settings:", error);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  const loadLocalState = useCallback(async () => {
    try {
      const [rawState, rawEvents] = await Promise.all([
        AsyncStorage.getItem(PARKING_LOCAL_STATE_STORAGE_KEY),
        AsyncStorage.getItem(PARKING_LOCAL_EVENTS_STORAGE_KEY),
      ]);

      if (rawState) {
        const parsedState = JSON.parse(rawState);
        const nextState = {
          ...DEFAULT_CURRENT_STATE,
          ...parsedState,
        };

        currentStateRef.current = nextState;
        setCurrentState(nextState);
      }

      if (rawEvents) {
        const parsedEvents = JSON.parse(rawEvents);
        setEvents(Array.isArray(parsedEvents) ? parsedEvents : []);
      }
    } catch (error) {
      console.warn("[ParkingScreen] Error loading local parking data:", error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadLocalState();
  }, [loadSettings, loadLocalState]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => {
      loadSettings();
    });

    return unsubscribe;
  }, [navigation, loadSettings]);

  useEffect(() => {
    if (TRACKING_STATUSES.has(currentState.status)) {
      startLocationWatcher();
      return;
    }

    if (STOPPED_STATUSES.has(currentState.status)) {
      stopLocationWatcher();
    }
  }, [currentState.status, startLocationWatcher, stopLocationWatcher]);

  useEffect(() => {
    return () => {
      stopLocationWatcher();
    };
  }, [stopLocationWatcher]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    });
  };

  const openSettings = () => {
    if (navigation?.navigate) {
      navigation.navigate(ROUTES.PARKING_SETTINGS);
    }
  };

  const showInvalidTransitionAlert = (nextStatus) => {
    const currentLabel =
      PARKING_STATUS_LABELS[currentState.status] || currentState.status;
    const nextLabel = PARKING_STATUS_LABELS[nextStatus] || nextStatus;

    safeAlert(
      "Cambio de estado no permitido",
      `No puedes pasar directamente de "${currentLabel}" a "${nextLabel}".`,
    );
  };

  const updateLocationOnly = async () => {
    const location = await getCurrentLocation({
      persist: true,
      saveAsParkedSpot: currentState.status === PARKING_STATUS.PARKED,
    });

    if (location) {
      setLocationExpanded(true);
    }
  };

  const markCurrentPositionAsValidSpot = async () => {
    if (markingValidSpot) return;

    setMarkingValidSpot(true);

    try {
      let location =
        latestUserLocationRef.current ||
        (typeof currentState.latitude === "number" &&
        typeof currentState.longitude === "number"
          ? {
              latitude: currentState.latitude,
              longitude: currentState.longitude,
              accuracy: currentState.accuracy,
              updatedAt: currentState.updatedAt,
            }
          : null);

      if (!location) {
        location = await getCurrentLocation({
          persist: true,
          saveAsParkedSpot: false,
        });
      }

      if (
        typeof location?.latitude !== "number" ||
        typeof location?.longitude !== "number"
      ) {
        safeAlert(
          "Ubicación necesaria",
          "Primero actualiza la ubicación para poder marcar una plaza válida.",
        );
        return;
      }

      const result = await createValidParkingSpotMutation({
        city: DEFAULT_PARKING_CITY,
        zone: DEFAULT_PARKING_ZONE,

        alias: displayParkingAlias,

        lat: location.latitude,
        lng: location.longitude,
        accuracy:
          typeof location.accuracy === "number" ? location.accuracy : undefined,
        locationSource: Platform.OS === "web" ? "web" : "gps",

        destinationName: displayDestination,
        destinationAddress,
      });

      const localEvent = createLocalEvent({
        parkingAlias: displayParkingAlias,
        status: PARKING_STATUS.LEAVING,
        destinationName: displayDestination,
        destinationAddress,
        note: result?.updated
          ? "He actualizado una posición válida para aparcar."
          : "He marcado una nueva posición válida para aparcar.",
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });

      await persistEvents([localEvent, ...events].slice(0, 100));

      setLocationExpanded(true);

      safeAlert(
        "Plaza guardada",
        "La posición se ha guardado como plaza válida para aparcar.",
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error marking valid spot:", error);

      safeAlert(
        "No se pudo guardar",
        error?.message || "No se ha podido guardar la posición válida.",
      );
    } finally {
      setMarkingValidSpot(false);
    }
  };

  const publishStatus = async (nextStatus) => {
    if (!canPublish) {
      safeAlert(
        "Configura Parking",
        "Antes de publicar tu estado, introduce un alias público y un destino en Ajustes.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Abrir Ajustes",
            onPress: openSettings,
          },
        ],
      );
      return;
    }

    if (!isValidStatusTransition(currentState.status, nextStatus)) {
      showInvalidTransitionAlert(nextStatus);
      return;
    }

    let nextLocation = {
      latitude: currentState.latitude,
      longitude: currentState.longitude,
      accuracy: currentState.accuracy,
      updatedAt: currentState.updatedAt,
    };

    if (nextStatus === PARKING_STATUS.LOOKING) {
      const freshLocation =
        latestUserLocationRef.current ||
        (await getCurrentLocation({ persist: true }));

      if (freshLocation) {
        nextLocation = freshLocation;
      }
    }

    if (nextStatus === PARKING_STATUS.PARKED) {
      const parkedLocation =
        latestUserLocationRef.current ||
        (await getCurrentLocation({
          persist: false,
          saveAsParkedSpot: true,
        }));

      if (parkedLocation) {
        nextLocation = parkedLocation;
        parkedSpotLocationRef.current = parkedLocation;
      }

      stopLocationWatcher();
    }

    if (nextStatus === PARKING_STATUS.LEAVING) {
      stopLocationWatcher();

      const releasedSpotLocation =
        parkedSpotLocationRef.current ||
        latestUserLocationRef.current ||
        nextLocation;

      if (
        typeof releasedSpotLocation?.latitude === "number" &&
        typeof releasedSpotLocation?.longitude === "number"
      ) {
        nextLocation = releasedSpotLocation;
      }
    }

    if (
      nextStatus === PARKING_STATUS.ABANDONED ||
      nextStatus === PARKING_STATUS.CANCELLED ||
      nextStatus === PARKING_STATUS.INACTIVE
    ) {
      stopLocationWatcher();
    }

    const cleanedNote = normalizeText(note);

    const event = createLocalEvent({
      parkingAlias: displayParkingAlias,
      status: nextStatus,
      destinationName: displayDestination,
      destinationAddress,
      note: cleanedNote || buildEventMessage(nextStatus, displayDestination),
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      accuracy: nextLocation.accuracy,
    });

    const nextState = {
      status: nextStatus,
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      accuracy: nextLocation.accuracy,
      updatedAt: Date.now(),
    };

    await persistCurrentState(nextState);
    await persistEvents([event, ...events].slice(0, 100));

    setNote("");
    setLocationExpanded(true);
    scrollToBottom();
  };

  const resetFlow = async () => {
    const latestLocation =
      latestUserLocationRef.current ||
      (await getCurrentLocation({ persist: false }));

    const nextState = {
      ...currentState,
      status: PARKING_STATUS.LOOKING,
      latitude:
        typeof latestLocation?.latitude === "number"
          ? latestLocation.latitude
          : currentState.latitude,
      longitude:
        typeof latestLocation?.longitude === "number"
          ? latestLocation.longitude
          : currentState.longitude,
      accuracy:
        typeof latestLocation?.accuracy === "number"
          ? latestLocation.accuracy
          : currentState.accuracy,
      updatedAt: Date.now(),
    };

    await persistCurrentState(nextState);
    await startLocationWatcher();

    const event = createLocalEvent({
      parkingAlias: displayParkingAlias,
      status: PARKING_STATUS.LOOKING,
      destinationName: displayDestination,
      destinationAddress,
      note: buildEventMessage(PARKING_STATUS.LOOKING, displayDestination),
      latitude: nextState.latitude,
      longitude: nextState.longitude,
      accuracy: nextState.accuracy,
    });

    await persistEvents([event, ...events].slice(0, 100));
    scrollToBottom();
  };

  const clearLocalEvents = () => {
    safeAlert(
      "Limpiar actividad",
      "¿Quieres borrar solo la actividad local de parking? Los ajustes no se borrarán.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(PARKING_LOCAL_EVENTS_STORAGE_KEY);
              setEvents([]);
            } catch (error) {
              console.warn("[ParkingScreen] Error clearing events:", error);
            }
          },
        },
      ],
    );
  };

  const renderStatusButton = (status, iconName) => {
    const active = currentState.status === status;
    const allowed = active || availableNextStatuses.includes(status);
    const color = PARKING_STATUS_COLORS[status];

    return (
      <Pressable
        key={status}
        style={[
          styles.statusButton,
          active && {
            backgroundColor: `${color}18`,
            borderColor: color,
          },
          !allowed && styles.statusButtonDisabled,
        ]}
        onPress={() => publishStatus(status)}
        disabled={!allowed}
      >
        <Ionicons
          name={iconName}
          size={20}
          color={allowed ? color : "#9ca3af"}
        />

        <View style={styles.statusButtonTextBlock}>
          <Text
            style={[
              styles.statusButtonTitle,
              active && { color },
              !allowed && styles.statusButtonTitleDisabled,
            ]}
          >
            {PARKING_STATUS_LABELS[status]}
          </Text>

          <Text
            style={[
              styles.statusButtonSubtitle,
              !allowed && styles.statusButtonSubtitleDisabled,
            ]}
          >
            {active
              ? "Estado actual"
              : allowed
                ? "Cambiar estado"
                : "No disponible"}
          </Text>
        </View>
      </Pressable>
    );
  };

  const canShowRestartButton =
    currentState.status === PARKING_STATUS.LEAVING ||
    currentState.status === PARKING_STATUS.ABANDONED ||
    currentState.status === PARKING_STATUS.CANCELLED ||
    currentState.status === PARKING_STATUS.INACTIVE;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Parking</Text>
            <Text style={styles.subtitle}>
              Comparte si estás buscando plaza, si aparcaste, si dejas una plaza
              libre o si abandonas la búsqueda.
            </Text>
          </View>

          <Pressable style={styles.settingsButton} onPress={openSettings}>
            <Ionicons name="settings-outline" size={22} color="#111827" />
          </Pressable>
        </View>

        {!settingsLoaded ? (
          <View style={styles.card}>
            <Text style={styles.loadingText}>Cargando ajustes...</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.currentHeader}>
            <View>
              <Text style={styles.cardEyebrow}>Estado actual</Text>
              <Text style={styles.currentUser}>{displayParkingAlias}</Text>
            </View>

            <StatusBadge status={currentState.status} />
          </View>

          <Text style={styles.currentDescription}>
            {PARKING_STATUS_DESCRIPTIONS[currentState.status]}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Destino</Text>
              <Text style={styles.infoValue}>{displayDestination}</Text>

              {destinationAddress ? (
                <Text style={styles.infoExtra}>{destinationAddress}</Text>
              ) : null}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Última actualización</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(currentState.updatedAt)}
              </Text>

              {currentState.updatedAt ? (
                <Text style={styles.infoExtra}>
                  {formatElapsedTime(currentState.updatedAt)}
                </Text>
              ) : null}
            </View>
          </View>

          {locationPermissionStatus === "denied" ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#b45309" />
              <Text style={styles.warningText}>
                El permiso de ubicación está denegado. Puedes seguir usando
                Parking, pero no se actualizará tu posición.
              </Text>
            </View>
          ) : null}

          {!hasUserSettings || !hasDestination ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#b45309" />
              <Text style={styles.warningText}>
                Falta configurar alias público o destino. Abre Ajustes antes de
                publicar.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Pressable
            style={styles.collapsibleHeader}
            onPress={() => setStatusExpanded((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{
              expanded: statusExpanded,
            }}
            accessibilityLabel="Cambiar estado"
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons
                name="swap-horizontal-outline"
                size={22}
                color="#2563eb"
              />

              <View style={styles.collapsibleHeaderText}>
                <Text style={styles.sectionTitle}>Cambiar estado</Text>

                <Text style={styles.sectionSubtitle}>
                  Estado actual:{" "}
                  {PARKING_STATUS_LABELS[currentState.status] || "Sin estado"}
                </Text>
              </View>
            </View>

            <Ionicons
              name={statusExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color="#111827"
            />
          </Pressable>

          {statusExpanded ? (
            <View style={styles.statusDropdownContent}>
              <View style={styles.statusButtons}>
                {renderStatusButton(PARKING_STATUS.LOOKING, "search-outline")}

                {renderStatusButton(PARKING_STATUS.PARKED, "car-outline")}

                {renderStatusButton(PARKING_STATUS.LEAVING, "exit-outline")}

                {renderStatusButton(PARKING_STATUS.ABANDONED, "walk-outline")}

                {renderStatusButton(
                  PARKING_STATUS.CANCELLED,
                  "close-circle-outline",
                )}
              </View>

              {canShowRestartButton ? (
                <Pressable style={styles.resetButton} onPress={resetFlow}>
                  <Ionicons name="refresh-outline" size={18} color="#2563eb" />

                  <Text style={styles.resetButtonText}>
                    Empezar de nuevo como buscando plaza
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#2563eb"
            />
            <Text style={styles.sectionTitle}>Mensaje opcional</Text>
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ejemplo: estoy en doble fila, salgo en 2 minutos..."
            placeholderTextColor="#9ca3af"
            style={styles.noteInput}
            multiline
            maxLength={180}
          />

          <Text style={styles.charCounter}>{note.length}/180</Text>
        </View>

        <LocationSection
          expanded={locationExpanded}
          onToggle={() => setLocationExpanded((prev) => !prev)}
          latitude={currentState.latitude}
          longitude={currentState.longitude}
          accuracy={currentState.accuracy}
          onRefreshLocation={updateLocationOnly}
          loadingLocation={loadingLocation}
          selectedDestination={settings.destinationId}
          selectedDestinationName={displayDestination}
          selectedDestinationAddress={destinationAddress}
          destinationCoords={destinationCoords}
          mapCenter={mapCenter}
          userCoords={userCoords}
          activeParkingSpots={activeParkingSpots}
          parkingSpotsLoading={validParkingSpots === undefined}
          onMarkValidSpot={markCurrentPositionAsValidSpot}
          markingValidSpot={markingValidSpot}
          validParkingSpotsCount={activeParkingSpots.length}
        />

        <View style={styles.card}>
          <View style={styles.activityCollapsibleHeader}>
            <Pressable
              style={styles.activityToggleButton}
              onPress={() => setActivityExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{
                expanded: activityExpanded,
              }}
              accessibilityLabel="Actividad de parking"
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="time-outline" size={22} color="#2563eb" />

                <View style={styles.collapsibleHeaderText}>
                  <Text style={styles.sectionTitle}>Actividad</Text>

                  <Text style={styles.sectionSubtitle}>
                    {events.length === 0
                      ? "Sin cambios de estado."
                      : `${events.length} ${
                          events.length === 1
                            ? "evento guardado"
                            : "eventos guardados"
                        }.`}
                  </Text>
                </View>
              </View>

              <Ionicons
                name={activityExpanded ? "chevron-up" : "chevron-down"}
                size={22}
                color="#111827"
              />
            </Pressable>

            {activityExpanded && events.length > 0 ? (
              <Pressable
                onPress={clearLocalEvents}
                accessibilityRole="button"
                accessibilityLabel="Limpiar actividad"
                hitSlop={8}
                style={styles.clearActivityButton}
              >
                <Text style={styles.clearText}>Limpiar</Text>
              </Pressable>
            ) : null}
          </View>

          {activityExpanded ? (
            <View style={styles.activityDropdownContent}>
              {events.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="chatbox-outline" size={24} color="#9ca3af" />

                  <Text style={styles.emptyTitle}>Sin actividad todavía</Text>

                  <Text style={styles.emptyText}>
                    Publica un estado para crear el primer mensaje.
                  </Text>
                </View>
              ) : (
                <View style={styles.eventsList}>
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isOwnUser={
                        (event.parkingAlias || event.userId) ===
                        displayParkingAlias
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },

  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",

    ...Platform.select({
      web: {
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
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

  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },

  currentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  cardEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  currentUser: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  currentDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
    marginBottom: 14,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  infoGrid: {
    gap: 10,
  },

  infoBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  infoExtra: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  warningBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },

  statusButtons: {
    gap: 10,
  },

  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },

  statusButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    opacity: 0.7,
  },

  statusButtonTextBlock: {
    flex: 1,
  },

  statusButtonTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 2,
  },

  statusButtonTitleDisabled: {
    color: "#9ca3af",
  },

  statusButtonSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },

  statusButtonSubtitleDisabled: {
    color: "#9ca3af",
  },

  resetButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  resetButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },

  noteInput: {
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    color: "#111827",
    textAlignVertical: "top",
  },

  charCounter: {
    alignSelf: "flex-end",
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },

  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  locationContent: {
    marginTop: 14,
  },

  locationEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  locationEmptyText: {
    flex: 1,
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "700",
  },

  coordsBox: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },

  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  coordLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "800",
  },

  coordValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "900",
  },

  secondaryActionButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },

  actionButtonDisabled: {
    opacity: 0.6,
  },

  mapContainer: {
    marginTop: 12,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#e5e7eb",
  },

  clearText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#b91c1c",
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  emptyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
  },

  eventsList: {
    gap: 10,
  },

  eventCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },

  eventCardOwn: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },

  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  eventUserBlock: {
    flex: 1,
  },

  eventUser: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  eventDate: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },

  eventStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },

  eventStatusPillText: {
    fontSize: 11,
    fontWeight: "900",
  },

  eventMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 8,
  },

  eventMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },

  eventMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
    fontWeight: "700",
  },

  eventCoords: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  eventCoordsText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "900",
  },

  locationSummaryBlock: {
    gap: 8,
  },

  locationSummaryTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  locationSummaryTitleSpaced: {
    marginTop: 10,
  },

  coordinateDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },

  coordinateDropdownHeader: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#f8fafc",
  },

  coordinateDropdownTitleBox: {
    flex: 1,
    minWidth: 0,
  },

  coordinateDropdownTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },

  coordinateDropdownSubtitle: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },

  coordinateDropdownBody: {
    padding: 12,
    backgroundColor: "#ffffff",
  },
  coordinateMapToggle: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
  },

  coordinateMapToggleDisabled: {
    opacity: 0.55,
  },

  coordinateMapToggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },

  coordinateMapToggleTextDisabled: {
    color: "#94a3b8",
  },

  mapVisibilityHint: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  mapVisibilityHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#64748b",
  },
  validSpotButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#ecfdf5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  validSpotButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#15803d",
  },

  validSpotCounterText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
    fontWeight: "700",
    textAlign: "center",
  },
  parkingSpotsList: {
    gap: 10,
  },

  parkingSpotsEmptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  parkingSpotsEmptyTitle: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },

  parkingSpotsEmptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "600",
  },

  parkingSpotRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },

  parkingSpotHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },

  parkingSpotTitleBox: {
    flex: 1,
    minWidth: 0,
  },

  parkingSpotTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },

  parkingSpotId: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },

  parkingSpotStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  parkingSpotStatusText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#15803d",
    textTransform: "uppercase",
  },

  parkingSpotDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  parkingSpotDataRowLast: {
    borderBottomWidth: 0,
  },

  parkingSpotDataLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "800",
  },

  parkingSpotDataValue: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "900",
    textAlign: "right",
  },
  collapsibleHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  statusDropdownContent: {
    marginTop: 14,
  },
  activityHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  activityDropdownContent: {
    marginTop: 14,
  },

  activityCollapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  activityToggleButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  clearActivityButton: {
    minHeight: 36,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  activityDropdownContent: {
    marginTop: 14,
  },
});

export {
  PARKING_SETTINGS_STORAGE_KEY,
  PARKING_LOCAL_EVENTS_STORAGE_KEY,
  PARKING_LOCAL_STATE_STORAGE_KEY,
  PARKING_STATUS,
  PARKING_STATUS_LABELS,
};

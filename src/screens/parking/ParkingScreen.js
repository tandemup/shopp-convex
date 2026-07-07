// screens/ParkingScreen.js
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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import moment from "moment";
import "moment/locale/es";

import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { ROUTES } from "@/src/navigation/ROUTES";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";
import { useMap } from "react-leaflet";

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
  accuracy: Location.Accuracy.Balanced,
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

const DEFAULT_REGION = {
  latitude: 43.5322,
  longitude: -5.6611,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

const DEFAULT_SETTINGS = {
  userId: "",
  destinationId: "",
  destinationName: "",
  destinationAddress: "",
  destinationLatitude: null,
  destinationLongitude: null,
  customDestination: "",
};

const DEFAULT_CURRENT_STATE = {
  status: PARKING_STATUS.LOOKING,
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

function getDisplayUserId(settings) {
  const userId = normalizeText(settings?.userId);
  return userId || "userId";
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
  userId,
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
    userId,
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

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatCoordinate(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "No disponible";
  }

  return numberValue.toFixed(6);
}

function LocationSummary({
  userLatitude,
  userLongitude,
  userAccuracy,
  destinationName,
  destinationAddress,
  destinationLatitude,
  destinationLongitude,
}) {
  const [userCoordsExpanded, setUserCoordsExpanded] = useState(false);
  const [destinationCoordsExpanded, setDestinationCoordsExpanded] =
    useState(false);

  const userCoordsText =
    Number.isFinite(Number(userLatitude)) &&
    Number.isFinite(Number(userLongitude))
      ? `${formatCoordinate(userLatitude)}, ${formatCoordinate(userLongitude)}`
      : "Ubicación del usuario no disponible";

  const destinationCoordsText =
    Number.isFinite(Number(destinationLatitude)) &&
    Number.isFinite(Number(destinationLongitude))
      ? `${formatCoordinate(destinationLatitude)}, ${formatCoordinate(
          destinationLongitude,
        )}`
      : "Coordenadas del destino no disponibles";

  return (
    <View style={styles.locationSummary}>
      <Pressable
        style={styles.coordsToggleHeader}
        onPress={() => setUserCoordsExpanded((value) => !value)}
      >
        <View style={styles.coordsToggleTitleRow}>
          <Ionicons name="navigate-outline" size={18} color="#2563eb" />

          <View style={styles.coordsToggleTextBlock}>
            <Text style={styles.locationSummaryTitle}>
              Coordenadas del usuario
            </Text>

            <Text style={styles.coordsCollapsedText} numberOfLines={1}>
              {userCoordsText}
            </Text>
          </View>
        </View>

        <Ionicons
          name={userCoordsExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#111827"
        />
      </Pressable>

      {userCoordsExpanded ? (
        <View style={styles.coordsDetailsBox}>
          <InfoRow
            label="Latitud usuario"
            value={formatCoordinate(userLatitude)}
          />

          <InfoRow
            label="Longitud usuario"
            value={formatCoordinate(userLongitude)}
          />

          <InfoRow
            label="Precisión"
            value={
              userAccuracy != null && Number.isFinite(Number(userAccuracy))
                ? `${Math.round(Number(userAccuracy))} m`
                : "No disponible"
            }
          />
        </View>
      ) : null}

      <Pressable
        style={[styles.coordsToggleHeader, styles.coordsToggleHeaderSpaced]}
        onPress={() => setDestinationCoordsExpanded((value) => !value)}
      >
        <View style={styles.coordsToggleTitleRow}>
          <Ionicons name="flag-outline" size={18} color="#2563eb" />

          <View style={styles.coordsToggleTextBlock}>
            <Text style={styles.locationSummaryTitle}>
              Coordenadas del destino
            </Text>

            <Text style={styles.coordsCollapsedText} numberOfLines={1}>
              {destinationName || destinationCoordsText}
            </Text>
          </View>
        </View>

        <Ionicons
          name={destinationCoordsExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#111827"
        />
      </Pressable>

      {destinationCoordsExpanded ? (
        <View style={styles.coordsDetailsBox}>
          <InfoRow
            label="Destino"
            value={destinationName || "No seleccionado"}
          />

          <InfoRow
            label="Dirección"
            value={destinationAddress || "No disponible"}
          />

          <InfoRow
            label="Latitud destino"
            value={formatCoordinate(destinationLatitude)}
          />

          <InfoRow
            label="Longitud destino"
            value={formatCoordinate(destinationLongitude)}
          />
        </View>
      ) : null}
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
  mapRefreshKey,
}) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.collapsibleHeader} onPress={onToggle}>
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
          />

          <Pressable
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

          <View style={styles.mapContainer}>
            <StoreMapPreview
              key={[
                "parking-map",
                mapRefreshKey,
                selectedDestination || "no-destination",
                mapCenter?.lat || "no-map-lat",
                mapCenter?.lng || "no-map-lng",
                userCoords?.lat || "no-user-lat",
                userCoords?.lng || "no-user-lng",
              ].join("-")}
              lat={mapCenter?.lat}
              lng={mapCenter?.lng}
              userLat={userCoords?.lat}
              userLng={userCoords?.lng}
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
            {event.userId}
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
  const [mapFocusCoords, setMapFocusCoords] = useState(null);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState(null);

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

  const displayUserId = useMemo(() => getDisplayUserId(settings), [settings]);

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
      typeof mapFocusCoords?.lat === "number" &&
      typeof mapFocusCoords?.lng === "number"
    ) {
      return mapFocusCoords;
    }

    if (destinationCoords) {
      return destinationCoords;
    }

    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      return {
        lat: currentState.latitude,
        lng: currentState.longitude,
      };
    }

    return {
      lat: DEFAULT_REGION.latitude,
      lng: DEFAULT_REGION.longitude,
    };
  }, [
    mapFocusCoords,
    destinationCoords,
    currentState.latitude,
    currentState.longitude,
  ]);

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
    return events
      .filter((event) => {
        return (
          event.status === PARKING_STATUS.LEAVING &&
          typeof event.latitude === "number" &&
          typeof event.longitude === "number"
        );
      })
      .map((event) => ({
        id: event.id,
        lat: event.latitude,
        lng: event.longitude,
        revealedBy: event.userId,
        status: event.status,
        createdAt: event.createdAt,
      }));
  }, [events]);

  const availableNextStatuses = useMemo(
    () => getAvailableNextStatuses(currentState.status),
    [currentState.status],
  );

  const hasUserSettings = useMemo(() => {
    return Boolean(normalizeText(settings.userId));
  }, [settings.userId]);

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
    const position = await Location.getCurrentPositionAsync(
      LOCATION_SINGLE_OPTIONS,
    );

    return normalizeExpoLocation(position);
  }, []);

  const getCurrentLocation = useCallback(
    async ({ persist = true, saveAsParkedSpot = false } = {}) => {
      try {
        setLoadingLocation(true);

        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
          return null;
        }

        const position = await Location.getCurrentPositionAsync(
          LOCATION_SINGLE_OPTIONS,
        );

        const normalizedLocation = normalizeExpoLocation(position);

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

        safeAlert(
          "Ubicación no disponible",
          "No se ha podido obtener la ubicación actual.",
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

    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      return;
    }

    if (Platform.OS === "web") {
      try {
        const initialLocation = await readCurrentLocation();

        if (initialLocation) {
          await applyLocationToCurrentState(initialLocation);
        }
      } catch (error) {
        console.warn(
          "[ParkingScreen] Error getting initial web location:",
          error,
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
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
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

  useEffect(() => {
    setMapFocusCoords(null);
    setMapRefreshKey((prev) => prev + 1);
  }, [settings.destinationId]);

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

  const publishStatus = async (nextStatus) => {
    if (!canPublish) {
      safeAlert(
        "Configura Parking",
        "Antes de publicar tu estado, introduce un User ID y un destino en Ajustes.",
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
      await startLocationWatcher();

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
      userId: displayUserId,
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
    setMapRefreshKey((prev) => prev + 1);
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
      userId: displayUserId,
      status: PARKING_STATUS.LOOKING,
      destinationName: displayDestination,
      destinationAddress,
      note: buildEventMessage(PARKING_STATUS.LOOKING, displayDestination),
      latitude: nextState.latitude,
      longitude: nextState.longitude,
      accuracy: nextState.accuracy,
    });

    await persistEvents([event, ...events].slice(0, 100));
    setMapRefreshKey((prev) => prev + 1);
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
              <Text style={styles.currentUser}>{displayUserId}</Text>
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
                Falta configurar User ID o destino. Abre Ajustes antes de
                publicar.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color="#2563eb"
            />
            <Text style={styles.sectionTitle}>Cambiar estado</Text>
          </View>

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
          mapRefreshKey={mapRefreshKey}
        />

        <View style={styles.card}>
          <View style={styles.activityHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={22} color="#2563eb" />

              <View>
                <Text style={styles.sectionTitle}>Actividad</Text>
                <Text style={styles.sectionSubtitle}>
                  Últimos cambios de estado de parking.
                </Text>
              </View>
            </View>

            {events.length > 0 ? (
              <Pressable onPress={clearLocalEvents}>
                <Text style={styles.clearText}>Limpiar</Text>
              </Pressable>
            ) : null}
          </View>

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
                  isOwnUser={event.userId === displayUserId}
                />
              ))}
            </View>
          )}
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

  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
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
  locationSummary: {
    gap: 8,
  },

  coordsToggleHeader: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  coordsToggleHeaderSpaced: {
    marginTop: 4,
  },

  coordsToggleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  locationSummaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  coordsDetailsBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
  },

  coordsCollapsedText: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  infoRow: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  infoLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },

  infoValue: {
    flex: 1.4,
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    textAlign: "right",
  },

  locationContent: {
    marginTop: 14,
    gap: 12,
  },

  locationSummary: {
    gap: 8,
  },

  coordsToggleHeader: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  coordsToggleHeaderSpaced: {
    marginTop: 4,
  },

  coordsToggleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  coordsToggleTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  locationSummaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  coordsDetailsBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
  },

  coordsCollapsedText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
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
});

export {
  PARKING_SETTINGS_STORAGE_KEY,
  PARKING_LOCAL_EVENTS_STORAGE_KEY,
  PARKING_LOCAL_STATE_STORAGE_KEY,
  PARKING_STATUS,
  PARKING_STATUS_LABELS,
};

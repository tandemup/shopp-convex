// screens/ParkingScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
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
import { ROUTES } from "@/src/navigation/ROUTES";
import * as Location from "expo-location";
//import MapView, { Marker } from "react-native-maps";
//import ParkingLeafletMap from "@/src/components/ParkingLeafletMap";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const PARKING_LOCAL_EVENTS_STORAGE_KEY = "@shopp/parking/events";
const PARKING_LOCAL_STATE_STORAGE_KEY = "@shopp/parking/current-state";

const PARKING_STATUS = {
  LOOKING: "looking",
  PARKED: "parked",
  LEAVING: "leaving",
};

const PARKING_STATUS_LABELS = {
  [PARKING_STATUS.LOOKING]: "Buscando plaza",
  [PARKING_STATUS.PARKED]: "Aparqué",
  [PARKING_STATUS.LEAVING]: "Salí / dejo plaza",
};

const PARKING_STATUS_DESCRIPTIONS = {
  [PARKING_STATUS.LOOKING]: "Estás buscando una plaza cerca de tu destino.",
  [PARKING_STATUS.PARKED]:
    "Has aparcado. Puedes compartir la posición aproximada de la plaza.",
  [PARKING_STATUS.LEAVING]:
    "Estás saliendo y puedes avisar de que esa plaza queda libre.",
};

const PARKING_STATUS_COLORS = {
  [PARKING_STATUS.LOOKING]: "#2563eb",
  [PARKING_STATUS.PARKED]: "#16a34a",
  [PARKING_STATUS.LEAVING]: "#f97316",
};

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

function formatDateTime(timestamp) {
  if (!timestamp) return "Sin actualizar";

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

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
      return [PARKING_STATUS.PARKED];

    case PARKING_STATUS.PARKED:
      return [PARKING_STATUS.LEAVING];

    case PARKING_STATUS.LEAVING:
      return [];

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

function LocationSummary({ latitude, longitude, accuracy }) {
  const hasLocation =
    typeof latitude === "number" && typeof longitude === "number";

  if (!hasLocation) {
    return (
      <View style={styles.locationEmpty}>
        <Ionicons name="location-outline" size={18} color="#6b7280" />
        <Text style={styles.locationEmptyText}>
          Todavía no hay coordenadas guardadas.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.coordsBox}>
      <View style={styles.coordRow}>
        <Text style={styles.coordLabel}>Latitud</Text>
        <Text style={styles.coordValue}>{latitude.toFixed(6)}</Text>
      </View>

      <View style={styles.coordRow}>
        <Text style={styles.coordLabel}>Longitud</Text>
        <Text style={styles.coordValue}>{longitude.toFixed(6)}</Text>
      </View>

      {typeof accuracy === "number" ? (
        <View style={styles.coordRow}>
          <Text style={styles.coordLabel}>Precisión</Text>
          <Text style={styles.coordValue}>{Math.round(accuracy)} m</Text>
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
  mapCenter,
  userCoords,
  activeParkingSpots,
}) {
  const hasLocation =
    typeof latitude === "number" && typeof longitude === "number";

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
            latitude={latitude}
            longitude={longitude}
            accuracy={accuracy}
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
              key={`parking-map-${selectedDestination}-${mapCenter.lat}-${mapCenter.lng}`}
              lat={mapCenter.lat}
              lng={mapCenter.lng}
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

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentState, setCurrentState] = useState(DEFAULT_CURRENT_STATE);
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationExpanded, setLocationExpanded] = useState(false);

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
  }, [destinationCoords, currentState.latitude, currentState.longitude]);

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
        setCurrentState({
          ...DEFAULT_CURRENT_STATE,
          ...parsedState,
        });
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

  const persistCurrentState = async (nextState) => {
    setCurrentState(nextState);

    try {
      await AsyncStorage.setItem(
        PARKING_LOCAL_STATE_STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error saving current state:", error);
    }
  };

  const persistEvents = async (nextEvents) => {
    setEvents(nextEvents);

    try {
      await AsyncStorage.setItem(
        PARKING_LOCAL_EVENTS_STORAGE_KEY,
        JSON.stringify(nextEvents),
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error saving events:", error);
    }
  };

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

    Alert.alert(
      "Cambio de estado no permitido",
      `No puedes pasar directamente de "${currentLabel}" a "${nextLabel}".`,
    );
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Permiso de ubicación necesario",
          "Activa la ubicación para poder compartir coordenadas de parking.",
        );
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      const nextState = {
        ...currentState,
        ...nextLocation,
        updatedAt: Date.now(),
      };

      await persistCurrentState(nextState);

      return nextLocation;
    } catch (error) {
      console.warn("[ParkingScreen] Error getting location:", error);

      Alert.alert(
        "Ubicación no disponible",
        "No se ha podido obtener la ubicación actual.",
      );

      return null;
    } finally {
      setLoadingLocation(false);
    }
  };

  const updateLocationOnly = async () => {
    const location = await getCurrentLocation();

    if (location) {
      setLocationExpanded(true);
    }
  };

  const publishStatus = async (nextStatus) => {
    if (!canPublish) {
      Alert.alert(
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
    };

    if (
      nextStatus === PARKING_STATUS.PARKED ||
      nextStatus === PARKING_STATUS.LEAVING
    ) {
      const location = await getCurrentLocation();

      if (location) {
        nextLocation = location;
      }
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

    const nextEvents = [event, ...events].slice(0, 100);

    await persistCurrentState(nextState);
    await persistEvents(nextEvents);

    setNote("");
    setLocationExpanded(true);
    scrollToBottom();
  };

  const resetFlow = async () => {
    const nextState = {
      ...currentState,
      status: PARKING_STATUS.LOOKING,
      updatedAt: Date.now(),
    };

    await persistCurrentState(nextState);

    const event = createLocalEvent({
      userId: displayUserId,
      status: PARKING_STATUS.LOOKING,
      destinationName: displayDestination,
      destinationAddress,
      note: buildEventMessage(PARKING_STATUS.LOOKING, displayDestination),
      latitude: currentState.latitude,
      longitude: currentState.longitude,
      accuracy: currentState.accuracy,
    });

    await persistEvents([event, ...events].slice(0, 100));
    scrollToBottom();
  };

  const clearLocalEvents = () => {
    Alert.alert(
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
              Comparte si estás buscando plaza, si aparcaste o si dejas una
              plaza libre.
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
              <Text style={styles.currentUser}>{displayUserId} (Tú)</Text>
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
            </View>
          </View>

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
          </View>

          {currentState.status === PARKING_STATUS.LEAVING ? (
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
          mapCenter={mapCenter}
          userCoords={userCoords}
          activeParkingSpots={activeParkingSpots}
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

  mapWrapper: {
    marginTop: 12,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#e5e7eb",
  },

  map: {
    flex: 1,
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
});

export {
  PARKING_SETTINGS_STORAGE_KEY,
  PARKING_LOCAL_EVENTS_STORAGE_KEY,
  PARKING_LOCAL_STATE_STORAGE_KEY,
  PARKING_STATUS,
  PARKING_STATUS_LABELS,
};

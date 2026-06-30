import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import moment from "moment";
import "moment/locale/es";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import StoreMapPreview from "@/components/features/maps/StoreMapPreview";

const DEFAULT_CITY = "gijon";
const DEFAULT_DESTINATION = "palacio-deportes";
const DEFAULT_USER_ID = "anonymous";

const DESTINATION_OPTIONS = [
  {
    id: "palacio-deportes",
    label: "Palacio de los Deportes",
    category: "Deporte",
    address: "Paseo del Doctor Fleming, 929, 33203 Gijón, Asturias",
    latitude: 43.53502,
    longitude: -5.63586,
  },
  {
    id: "el-corte-ingles",
    label: "El Corte Inglés",
    category: "Centro comercial",
    address: "C/ Ramón Areces, 2, 33211 Gijón, Asturias",
    latitude: 43.5361,
    longitude: -5.6844,
  },
  {
    id: "los-fresnos",
    label: "C.C. Los Fresnos",
    category: "Centro comercial",
    address: "C. Río de Oro, 3, Centro, 33209 Gijón, Asturias",
    latitude: 43.5321,
    longitude: -5.6619,
  },
  {
    id: "el-molinon",
    label: "El Molinón",
    category: "Estadio",
    address: "C/ Luis Adaro Falcó, 33203 Gijón, Asturias",
    latitude: 43.536329,
    longitude: -5.637417,
  },
  {
    id: "hospital-cabuenes",
    label: "Hospital de Cabueñes",
    category: "Hospital",
    address: "Calle Los Prados, 395, 33203 Gijón, Asturias",
    latitude: 43.525186,
    longitude: -5.606614,
  },
  {
    id: "playa-san-lorenzo",
    label: "Playa de San Lorenzo",
    category: "Ocio",
    address: "Avda. Rufo García Rendueles, Paseo Marítimo, Gijón, Asturias",
    latitude: 43.541062,
    longitude: -5.650062,
  },
  {
    id: "intu-asturias",
    label: "Intu Asturias / Parque Principado",
    category: "Centro comercial",
    address: "Autovía Ruta de la Plata, Km 4,5, 33429 Lugones, Siero, Asturias",
    latitude: 43.4012,
    longitude: -5.8095,
  },
];

const PARKING_STATUS_OPTIONS = [
  {
    key: "looking",
    icon: "search-outline",
    label: "Buscando plaza",
    message: "Estoy buscando plaza para aparcar.",
    blockedFrom: ["parked", "leaving"],
  },
  {
    key: "parked",
    icon: "car-sport-outline",
    label: "Ya aparqué",
    message: "Ya he aparcado.",
    blockedFrom: ["leaving"],
  },
  {
    key: "leaving",
    icon: "exit-outline",
    label: "Voy a salir",
    message: "Voy a salir y dejo una plaza libre.",
    blockedFrom: ["looking"],
  },
];

const MAX_POST_LENGTH = 280;
const LOW_CHARS_WARNING = 30;
const PARKING_MESSAGES_LIMIT = 80;
const CLEANUP_INTERVAL_MS = 60 * 1000;

moment.locale("es");

export default function ParkingScreen({ userId = DEFAULT_USER_ID }) {
  const [activeDestination, setActiveDestination] =
    useState(DEFAULT_DESTINATION);
  const [activeUserId, setActiveUserId] = useState(userId || DEFAULT_USER_ID);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showLocationSection, setShowLocationSection] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [currentGpsCoords, setCurrentGpsCoords] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState("");

  const flatListRef = useRef(null);
  const previousMessagesCountRef = useRef(0);
  const didInitialScrollRef = useRef(false);

  const { location } = useLocation();

  const userCoords =
    location?.lat != null && location?.lng != null
      ? {
          lat: location.lat,
          lng: location.lng,
        }
      : null;

  const activeDestinationData = useMemo(() => {
    return (
      DESTINATION_OPTIONS.find((destination) => {
        return destination.id === activeDestination;
      }) || DESTINATION_OPTIONS[0]
    );
  }, [activeDestination]);

  const activeDestinationLabel =
    activeDestinationData?.label || activeDestination || "Sin destino";

  const activeDestinationAddress = activeDestinationData?.address || "";

  const activeMapCenter = useMemo(() => {
    return {
      lat: activeDestinationData?.latitude || 43.5453,
      lng: activeDestinationData?.longitude || -5.6615,
    };
  }, [activeDestinationData]);

  const displayCoords = currentGpsCoords || activeMapCenter;

  /*
    Para no cambiar el backend Convex:
    - city queda fijo en "gijon"
    - zone usa el destino seleccionado
    Así cada destino funciona como una room independiente.
  */
  const convexCity = DEFAULT_CITY;
  const convexZone = activeDestination;

  const messages = useQuery(api.parking.listParkingMessages, {
    city: convexCity,
    zone: convexZone,
    limit: PARKING_MESSAGES_LIMIT,
  });

  const activeParkingSpotsResult = useQuery(
    api.parking.listActiveParkingSpots,
    {
      city: convexCity,
      zone: convexZone,
      limit: 20,
    },
  );

  const sendParkingMessage = useMutation(api.parking.sendParkingMessage);

  const deleteExpiredLookingMessages = useMutation(
    api.parking.deleteExpiredLookingMessages,
  );

  const expireOldFreeParkingSpots = useMutation(
    api.parking.expireOldFreeParkingSpots,
  );

  const data = useMemo(() => {
    return Array.isArray(messages) ? messages : [];
  }, [messages]);

  const activeParkingSpots = useMemo(() => {
    return Array.isArray(activeParkingSpotsResult)
      ? activeParkingSpotsResult
      : [];
  }, [activeParkingSpotsResult]);

  const isLoading = messages === undefined;

  const textLength = text.length;
  const remainingChars = MAX_POST_LENGTH - textLength;
  const isOverLimit = remainingChars < 0;
  const isNearLimit = remainingChars <= LOW_CHARS_WARNING;
  const canSend = Boolean(text.trim()) && !sending && !isOverLimit;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function cleanupParkingData() {
      try {
        await deleteExpiredLookingMessages({
          city: convexCity,
          zone: convexZone,
        });

        await expireOldFreeParkingSpots({
          city: convexCity,
          zone: convexZone,
        });
      } catch (error) {
        console.error("Error limpiando datos de parking:", error);
      }
    }

    cleanupParkingData();

    const intervalId = setInterval(() => {
      cleanupParkingData();
    }, CLEANUP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [
    deleteExpiredLookingMessages,
    expireOldFreeParkingSpots,
    convexCity,
    convexZone,
  ]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const previousCount = previousMessagesCountRef.current;
    const currentCount = data.length;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      previousMessagesCountRef.current = currentCount;

      if (currentCount > 0) {
        scrollToBottom(false);
      }

      return;
    }

    if (currentCount > previousCount) {
      scrollToBottom(true);
    }

    previousMessagesCountRef.current = currentCount;
  }, [data.length, isLoading]);

  function scrollToBottom(animated = true) {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }

  async function playMessageTone() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/messageTone.mp3"),
      );

      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error("Error reproduciendo messageTone.mp3:", error);
    }
  }

  async function getFreshGpsCoords() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        return null;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = currentPosition?.coords?.latitude;
      const lng = currentPosition?.coords?.longitude;
      const accuracy = currentPosition?.coords?.accuracy;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        lat,
        lng,
        accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
        source: "gps",
      };
    } catch (error) {
      console.error("Error obteniendo GPS actual:", error);
      return null;
    }
  }

  async function getCoordsForStatus(statusKey = "") {
    const shouldUseFreshGps = ["looking", "parked", "leaving"].includes(
      statusKey,
    );

    const hasUserGps =
      Number.isFinite(userCoords?.lat) && Number.isFinite(userCoords?.lng);

    if (shouldUseFreshGps) {
      const freshGpsCoords = await getFreshGpsCoords();

      if (freshGpsCoords) {
        return freshGpsCoords;
      }

      if (hasUserGps) {
        return {
          lat: userCoords.lat,
          lng: userCoords.lng,
          source: "context-gps",
        };
      }
    }

    return {
      lat: activeMapCenter.lat,
      lng: activeMapCenter.lng,
      source: "destination",
    };
  }

  async function cleanupParkingDataOnce() {
    try {
      await deleteExpiredLookingMessages({
        city: convexCity,
        zone: convexZone,
      });

      await expireOldFreeParkingSpots({
        city: convexCity,
        zone: convexZone,
      });
    } catch (error) {
      console.error("Error limpiando datos de parking:", error);
    }
  }

  function buildMessageWithDestination(messageText) {
    const cleanText = String(messageText || "").trim();

    if (!cleanText) {
      return "";
    }

    const destinationPrefix = `[Destino: ${activeDestinationLabel}]`;
    const addressPrefix = activeDestinationAddress
      ? `[Dirección: ${activeDestinationAddress}]`
      : "";

    return `${destinationPrefix} ${addressPrefix} ${cleanText}`.trim();
  }

  async function postMessage(messageText, statusKey = "") {
    const cleanUserId = activeUserId.trim() || DEFAULT_USER_ID;
    const finalText = buildMessageWithDestination(messageText);

    if (!finalText || sending) {
      return;
    }

    if (finalText.length > MAX_POST_LENGTH) {
      setErrorMessage(
        `El mensaje supera el límite de ${MAX_POST_LENGTH} caracteres. Prueba a escribir un aviso más corto.`,
      );
      return;
    }

    setSending(true);
    setErrorMessage("");

    try {
      const messageCoords = await getCoordsForStatus(statusKey);

      if (["looking", "parked", "leaving"].includes(statusKey)) {
        setCurrentGpsCoords({
          lat: messageCoords.lat,
          lng: messageCoords.lng,
        });

        setShowLocationSection(true);
        setShowMapPreview(true);
      }

      await sendParkingMessage({
        city: convexCity,
        zone: convexZone,
        userId: cleanUserId,
        text: finalText,
        status: statusKey || undefined,
        lat: messageCoords.lat,
        lng: messageCoords.lng,
        accuracy: messageCoords.accuracy,
        locationSource: messageCoords.source,
      });

      await cleanupParkingDataOnce();

      setText("");
      setSelectedStatus(statusKey);
      playMessageTone();
      setNow(Date.now());
      scrollToBottom(true);
    } catch (error) {
      console.error("Error enviando mensaje de parking con Convex:", error);
      setErrorMessage(error?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    await postMessage(text);
  }

  async function handleStatusPress(option) {
    await postMessage(option.message, option.key);
  }

  function handleSelectDestination(nextDestination) {
    if (!nextDestination || nextDestination === activeDestination) {
      return;
    }

    setActiveDestination(nextDestination);
    setSelectedStatus("");
    setCurrentGpsCoords(null);
    setShowMapPreview(false);
    setErrorMessage("");
  }

  function handleChangeText(value) {
    setText(value);

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function formatElapsedTime(createdAt) {
    if (!createdAt) {
      return "";
    }

    const date = moment(createdAt);

    if (!date.isValid()) {
      return "";
    }

    return date.from(now);
  }

  function formatSpotTimeLeft(expiresAt) {
    if (!expiresAt) {
      return "";
    }

    const diff = expiresAt - Date.now();

    if (diff <= 0) {
      return "expirada";
    }

    const minutes = Math.max(1, Math.ceil(diff / 60000));

    if (minutes === 1) {
      return "válida 1 min";
    }

    return `válida ${minutes} min`;
  }

  async function handleOpenUrl(url) {
    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error abriendo enlace:", error);
    }
  }

  async function openCoordsInGoogleMaps(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error abriendo coordenadas en Google Maps:", error);
    }
  }

  async function openAddressInGoogleMaps() {
    const encodedAddress = encodeURIComponent(activeDestinationAddress);
    const url = activeDestinationAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
      : `https://www.google.com/maps/search/?api=1&query=${displayCoords.lat},${displayCoords.lng}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error abriendo dirección en Google Maps:", error);
    }
  }

  const openInGoogleMaps = async () => {
    await openCoordsInGoogleMaps(displayCoords.lat, displayCoords.lng);
  };

  const CoordinatesBadge = ({
    lat,
    lng,
    variant = "default",
    label = "Coordenadas",
  }) => {
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    if (!hasCoords) {
      return null;
    }

    return (
      <Pressable
        onPress={() => openCoordsInGoogleMaps(lat, lng)}
        style={({ pressed }) => [
          styles.coordsBadge,
          variant === "message" && styles.coordsBadgeMessage,
          variant === "freeSpot" && styles.coordsBadgeFreeSpot,
          pressed && styles.coordsBadgePressed,
        ]}
      >
        <Ionicons
          name={
            variant === "freeSpot" ? "checkmark-circle" : "location-outline"
          }
          size={variant === "message" ? 14 : 16}
          color={variant === "freeSpot" ? "#15803d" : "#14532d"}
        />

        <View style={styles.coordsBadgeTextBlock}>
          {label ? (
            <Text
              style={[
                styles.coordsBadgeLabel,
                variant === "message" && styles.coordsBadgeLabelMessage,
              ]}
            >
              {label}
            </Text>
          ) : null}

          <Text
            style={[
              styles.coordsBadgeText,
              variant === "message" && styles.coordsBadgeTextMessage,
            ]}
          >
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>
        </View>
      </Pressable>
    );
  };

  function renderMessageText(value) {
    const content = String(value || "");
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const parts = content.split(urlRegex);

    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          const isUrl = /^https?:\/\/[^\s]+$/i.test(part);

          if (!isUrl) {
            return (
              <Text key={`text-${index}`} style={styles.messageText}>
                {part}
              </Text>
            );
          }

          return (
            <Text
              key={`url-${index}`}
              style={styles.messageLink}
              onPress={() => handleOpenUrl(part)}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  }

  function renderDestinationButton(destination) {
    const selected = destination.id === activeDestination;

    return (
      <Pressable
        key={destination.id}
        onPress={() => handleSelectDestination(destination.id)}
        style={({ pressed }) => [
          styles.destinationButton,
          selected && styles.destinationButtonSelected,
          pressed && styles.selectorButtonPressed,
        ]}
      >
        <View style={styles.destinationButtonIcon}>
          <Ionicons
            name={selected ? "navigate-circle" : "navigate-circle-outline"}
            size={20}
            color={selected ? "#ffffff" : "#15803d"}
          />
        </View>

        <View style={styles.destinationButtonTextBlock}>
          <Text
            style={[
              styles.destinationButtonText,
              selected && styles.destinationButtonTextSelected,
            ]}
          >
            {destination.label}
          </Text>

          <Text
            style={[
              styles.destinationButtonMeta,
              selected && styles.destinationButtonMetaSelected,
            ]}
          >
            {destination.category}
          </Text>

          <Text
            style={[
              styles.destinationAddress,
              selected && styles.destinationAddressSelected,
            ]}
            numberOfLines={2}
          >
            {destination.address}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderStatusButton(option) {
    const selected = selectedStatus === option.key;

    return (
      <Pressable
        key={option.key}
        onPress={() => handleStatusPress(option)}
        disabled={sending}
        style={({ pressed }) => [
          styles.actionButton,
          selected && styles.actionButtonSelected,
          pressed && !sending && styles.actionButtonPressed,
          sending && styles.actionButtonDisabled,
        ]}
      >
        <Ionicons
          name={option.icon}
          size={21}
          color={selected ? "#ffffff" : "#15803d"}
        />

        <Text
          style={[styles.actionText, selected && styles.actionTextSelected]}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  }

  const ActiveSpotsSection = () => {
    if (!activeParkingSpots.length) {
      return (
        <View style={styles.freeSpotsEmpty}>
          <Ionicons name="leaf-outline" size={18} color="#6b7280" />
          <Text style={styles.freeSpotsEmptyText}>
            No hay plazas libres reveladas ahora mismo.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.freeSpotsBlock}>
        <Text style={styles.freeSpotsTitle}>Plazas libres reveladas</Text>

        {activeParkingSpots.map((spot) => {
          return (
            <View key={spot._id} style={styles.freeSpotRow}>
              <CoordinatesBadge
                lat={spot.lat}
                lng={spot.lng}
                variant="freeSpot"
                label={`Libre · ${formatSpotTimeLeft(spot.expiresAt)}`}
              />

              <Text style={styles.freeSpotMeta}>
                Avisó: {spot.revealedBy || "anonymous"}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const LocationSection = () => {
    const hasCoords =
      Number.isFinite(displayCoords.lat) && Number.isFinite(displayCoords.lng);

    return (
      <View style={styles.locationCollapseCard}>
        <Pressable
          onPress={() => setShowLocationSection((current) => !current)}
          style={({ pressed }) => [
            styles.locationCollapseHeader,
            pressed && styles.locationCollapseHeaderPressed,
          ]}
        >
          <View style={styles.locationCollapseTitleBlock}>
            <Ionicons name="location-outline" size={20} color="#14532d" />

            <View style={styles.locationTitleTextBlock}>
              <Text style={styles.sectionLabel}>Ubicación</Text>

              <Text style={styles.locationCollapseSubtitle}>
                {activeDestinationLabel}
              </Text>

              <Text style={styles.locationCollapseAddress} numberOfLines={2}>
                {activeDestinationAddress}
              </Text>
            </View>
          </View>

          <Ionicons
            name={showLocationSection ? "chevron-up" : "chevron-down"}
            size={22}
            color="#14532d"
          />
        </Pressable>

        {showLocationSection ? (
          <View style={styles.locationCollapseBody}>
            {hasCoords && showMapPreview ? (
              <View style={styles.mapContainer}>
                <StoreMapPreview
                  lat={displayCoords.lat}
                  lng={displayCoords.lng}
                  userLat={userCoords?.lat}
                  userLng={userCoords?.lng}
                  parkingSpots={activeParkingSpots}
                />
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={36} color="#999" />

                <Text style={styles.mapPlaceholderText}>
                  {hasCoords
                    ? "Previsualización del mapa"
                    : "Ubicación no disponible"}
                </Text>
              </View>
            )}

            {hasCoords ? (
              <CoordinatesBadge
                lat={displayCoords.lat}
                lng={displayCoords.lng}
                label={
                  currentGpsCoords
                    ? "Coordenadas GPS actuales"
                    : "Coordenadas del destino"
                }
              />
            ) : null}

            {hasCoords ? (
              <View style={styles.locationButtonsRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setShowMapPreview((current) => !current)}
                >
                  <Ionicons
                    name={showMapPreview ? "eye-off-outline" : "map-outline"}
                    size={18}
                    color="#1a73e8"
                  />

                  <Text style={styles.secondaryButtonText}>
                    {showMapPreview ? "Ocultar mapa" : "Ver mapa"}
                  </Text>
                </Pressable>

                <Pressable style={styles.mapsButton} onPress={openInGoogleMaps}>
                  <Ionicons name="navigate-outline" size={18} color="#fff" />

                  <Text style={styles.mapsButtonText}>Google Maps</Text>
                </Pressable>
              </View>
            ) : null}

            <ActiveSpotsSection />
          </View>
        ) : null}
      </View>
    );
  };

  function renderHeader() {
    return (
      <View>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.iconCircle}>
              <Ionicons name="car-outline" size={26} color="#15803d" />
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>Parking</Text>

              <Text style={styles.subtitle}>
                Chat rápido para avisar de plazas libres cerca del destino
                seleccionado.
              </Text>
            </View>

            <Pressable
              onPress={() => setShowSettingsPanel((current) => !current)}
              style={({ pressed }) => [
                styles.settingsToggleButton,
                pressed && styles.settingsToggleButtonPressed,
              ]}
            >
              <Text style={styles.settingsToggleButtonText}>
                {showSettingsPanel ? "Ocultar" : "Ajustes"}
              </Text>
            </Pressable>
          </View>

          {showSettingsPanel ? (
            <View style={styles.settingsPanel}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Destino</Text>

                <View style={styles.destinationGrid}>
                  {DESTINATION_OPTIONS.map(renderDestinationButton)}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>User ID</Text>

                <TextInput
                  value={activeUserId}
                  onChangeText={setActiveUserId}
                  placeholder="anonymous"
                  placeholderTextColor="#888"
                  style={styles.usernameInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                />
              </View>

              <Text style={styles.roomHint}>
                Canal: parking · destino: {activeDestination}
              </Text>
            </View>
          ) : null}

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusTitleBlock}>
                <Text style={styles.cardTitle}>Estado actual</Text>

                <Text style={styles.cardSubtitle}>
                  {activeDestinationLabel}
                </Text>

                <Pressable
                  onPress={openAddressInGoogleMaps}
                  style={({ pressed }) => [
                    styles.addressInlineButton,
                    pressed && styles.addressInlineButtonPressed,
                  ]}
                >
                  <Ionicons name="location-outline" size={14} color="#1a73e8" />

                  <Text style={styles.cardAddress} numberOfLines={2}>
                    {activeDestinationAddress}
                  </Text>
                </Pressable>
              </View>

              {sending ? (
                <ActivityIndicator size="small" color="#15803d" />
              ) : null}
            </View>

            <View style={styles.actions}>
              {PARKING_STATUS_OPTIONS.map(renderStatusButton)}
            </View>
          </View>
        </View>

        <LocationSection />

        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>Chat de parking</Text>

          <Text style={styles.chatSubtitle}>
            {activeDestinationLabel} · {activeUserId.trim() || DEFAULT_USER_ID}
          </Text>
        </View>
      </View>
    );
  }

  function renderMessage({ item }) {
    const createdAt = item.createdAt ?? item._creationTime;

    const cleanActiveUserId = activeUserId.trim() || DEFAULT_USER_ID;
    const messageUserId = String(item.userId || DEFAULT_USER_ID).trim();

    const isMine = messageUserId === cleanActiveUserId;

    const date = createdAt ? moment(createdAt).format("HH:mm") : "";
    const elapsedTime = formatElapsedTime(createdAt);

    return (
      <View style={[styles.messageCard, isMine && styles.messageCardMine]}>
        <View style={styles.messageHeader}>
          <View style={styles.messageUserBlock}>
            <Text style={[styles.username, isMine && styles.usernameMine]}>
              {isMine ? "Tú" : messageUserId}
            </Text>

            {item.status ? (
              <Text style={styles.statusBadge}>{item.status}</Text>
            ) : null}
          </View>

          <View style={styles.messageTimeBlock}>
            <Text style={styles.elapsedTime}>{elapsedTime}</Text>
            <Text style={styles.time}>{date}</Text>
          </View>
        </View>

        {renderMessageText(item.text)}

        <CoordinatesBadge
          lat={item.lat}
          lng={item.lng}
          variant="message"
          label=""
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenShell}>
        <KeyboardAvoidingView
          style={styles.phoneFrame}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            {isLoading ? (
              <FlatList
                data={[]}
                keyExtractor={(item) => item._id}
                ListHeaderComponent={renderHeader()}
                ListFooterComponent={
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>Cargando mensajes...</Text>
                  </View>
                }
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <FlatList
                ref={flatListRef}
                data={data}
                keyExtractor={(item) => item._id}
                renderItem={renderMessage}
                ListHeaderComponent={renderHeader()}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={30}
                      color="#9ca3af"
                    />

                    <Text style={styles.emptyText}>
                      Todavía no hay mensajes de parking para este destino.
                    </Text>
                  </View>
                }
              />
            )}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <View
                style={[
                  styles.composerBox,
                  isOverLimit && styles.composerBoxError,
                ]}
              >
                <TextInput
                  value={text}
                  onChangeText={handleChangeText}
                  placeholder="Escribe una ubicación, aviso o enlace..."
                  placeholderTextColor="#888"
                  style={styles.input}
                  multiline
                  maxLength={MAX_POST_LENGTH}
                  returnKeyType="send"
                  onSubmitEditing={
                    Platform.OS === "web" ? handleSend : undefined
                  }
                />

                <View style={styles.composerFooter}>
                  <Text style={styles.composerHint}>
                    Se añadirá el destino seleccionado al mensaje.
                  </Text>

                  <Text
                    style={[
                      styles.charCounter,
                      isNearLimit && styles.charCounterWarning,
                      isOverLimit && styles.charCounterError,
                    ]}
                  >
                    {textLength}/{MAX_POST_LENGTH}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={({ pressed }) => [
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                  pressed && canSend && styles.sendButtonPressed,
                ]}
              >
                <Text style={styles.sendButtonText}>
                  {sending ? "..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e9e9e9",
  },

  screenShell: {
    flex: 1,
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    justifyContent: Platform.OS === "web" ? "center" : "flex-start",
    paddingHorizontal: Platform.OS === "web" ? 16 : 0,
    paddingVertical: Platform.OS === "web" ? 16 : 0,
    backgroundColor: Platform.OS === "web" ? "#e9e9e9" : "#f8fafc",
  },

  phoneFrame: {
    flex: 1,
    width: Platform.OS === "web" ? "100%" : undefined,
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    maxHeight: Platform.OS === "web" ? 860 : undefined,
    borderRadius: Platform.OS === "web" ? 26 : 0,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: Platform.OS === "web" ? 0.14 : 0,
    shadowRadius: 30,
    elevation: Platform.OS === "web" ? 8 : 0,
  },

  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: "#f8fafc",
  },

  scrollContent: {
    paddingBottom: 14,
  },

  header: {
    marginBottom: 10,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  iconCircle: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
    borderRadius: 24,
  },

  titleBlock: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
  },

  settingsToggleButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsToggleButtonPressed: {
    opacity: 0.75,
  },

  settingsToggleButtonText: {
    color: "#14532d",
    fontSize: 13,
    fontWeight: "800",
  },

  settingsPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#bbf7d0",
    gap: 14,
  },

  fieldBlock: {
    gap: 8,
  },

  fieldLabel: {
    color: "#14532d",
    fontSize: 13,
    fontWeight: "800",
  },

  selectorButtonPressed: {
    opacity: 0.75,
  },

  destinationGrid: {
    gap: 8,
  },

  destinationButton: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  destinationButtonSelected: {
    borderColor: "#15803d",
    backgroundColor: "#14532d",
  },

  destinationButtonIcon: {
    width: 28,
    alignItems: "center",
  },

  destinationButtonTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  destinationButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  destinationButtonTextSelected: {
    color: "#ffffff",
  },

  destinationButtonMeta: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "800",
  },

  destinationButtonMetaSelected: {
    color: "#dcfce7",
  },

  destinationAddress: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },

  destinationAddressSelected: {
    color: "#f0fdf4",
  },

  usernameInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 15,
  },

  roomHint: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  statusCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 18,
  },

  statusHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  statusTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    color: "#14532d",
    fontSize: 17,
    fontWeight: "900",
  },

  cardSubtitle: {
    marginTop: 2,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  addressInlineButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },

  addressInlineButtonPressed: {
    opacity: 0.75,
  },

  cardAddress: {
    flex: 1,
    color: "#1a73e8",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  actions: {
    gap: 8,
  },

  actionButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
    borderRadius: 14,
  },

  actionButtonSelected: {
    backgroundColor: "#15803d",
    borderColor: "#15803d",
  },

  actionButtonPressed: {
    opacity: 0.8,
  },

  actionButtonDisabled: {
    opacity: 0.55,
  },

  actionText: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "800",
  },

  actionTextSelected: {
    color: "#ffffff",
  },

  mapContainer: {
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },

  mapPlaceholder: {
    height: 180,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: "#777",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a73e8",
    backgroundColor: "#ffffff",
  },

  secondaryButtonText: {
    marginLeft: 8,
    color: "#1a73e8",
    fontSize: 14,
    fontWeight: "600",
  },

  mapsButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a73e8",
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  mapsButtonText: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  chatHeader: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },

  chatTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },

  chatSubtitle: {
    flexShrink: 1,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },

  loadingContainer: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 8,
    color: "#6b7280",
  },

  emptyContainer: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
  },

  emptyText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  messageCard: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    borderRadius: 16,
  },

  messageCardMine: {
    alignSelf: "flex-end",
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  },

  messageHeader: {
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  messageUserBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  username: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "900",
  },

  usernameMine: {
    color: "#14532d",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    fontSize: 11,
    fontWeight: "900",
  },

  messageTimeBlock: {
    alignItems: "flex-end",
    gap: 2,
  },

  elapsedTime: {
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "700",
  },

  time: {
    color: "#6b7280",
    fontSize: 12,
  },

  messageText: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 21,
  },

  messageLink: {
    color: "#1465d8",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  errorBox: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff1f1",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ffb4b4",
  },

  errorText: {
    color: "#9f1d1d",
    fontSize: 13,
    fontWeight: "700",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
    backgroundColor: "#f8fafc",
  },

  composerBox: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 7,
    backgroundColor: "#ffffff",
  },

  composerBoxError: {
    borderColor: "#d93025",
    backgroundColor: "#fffafa",
  },

  input: {
    minHeight: 44,
    maxHeight: 120,
    padding: 0,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    outlineStyle: Platform.OS === "web" ? "none" : undefined,
  },

  composerFooter: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  composerHint: {
    flex: 1,
    color: "#6b7280",
    fontSize: 11,
  },

  charCounter: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "900",
  },

  charCounterWarning: {
    color: "#b76b00",
  },

  charCounterError: {
    color: "#d93025",
  },

  sendButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#15803d",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendButtonPressed: {
    opacity: 0.8,
  },

  sendButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  sectionLabel: {
    marginBottom: 2,
    color: "#14532d",
    fontSize: 17,
    fontWeight: "900",
  },

  locationCollapseCard: {
    marginBottom: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 18,
    overflow: "hidden",
  },

  locationCollapseHeader: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#ffffff",
  },

  locationCollapseHeaderPressed: {
    opacity: 0.75,
  },

  locationCollapseTitleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  locationTitleTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  locationCollapseSubtitle: {
    marginTop: 2,
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },

  locationCollapseAddress: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  locationCollapseBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  locationButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  coordsBadge: {
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  coordsBadgeMessage: {
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderColor: "#bbf7d0",
  },

  coordsBadgeFreeSpot: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },

  coordsBadgePressed: {
    opacity: 0.75,
  },

  coordsBadgeTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  coordsBadgeLabel: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "900",
  },

  coordsBadgeLabelMessage: {
    display: "none",
  },

  coordsBadgeText: {
    marginTop: 2,
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "800",
  },

  coordsBadgeTextMessage: {
    marginTop: 0,
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "900",
  },

  freeSpotsBlock: {
    marginTop: 12,
    gap: 8,
  },

  freeSpotsTitle: {
    color: "#14532d",
    fontSize: 14,
    fontWeight: "900",
  },

  freeSpotRow: {
    gap: 4,
  },

  freeSpotMeta: {
    marginLeft: 4,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
  },

  freeSpotsEmpty: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  freeSpotsEmptyText: {
    flex: 1,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },
});

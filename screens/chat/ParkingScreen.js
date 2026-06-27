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
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import moment from "moment";
import "moment/locale/es";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const DEFAULT_CITY = "gijon";
const DEFAULT_ZONE = "centro";
const DEFAULT_USER_ID = "anonymous";

const CITY_OPTIONS = [
  { id: "gijon", label: "Gijón" },
  { id: "oviedo", label: "Oviedo" },
  { id: "aviles", label: "Avilés" },
];

const ZONE_OPTIONS_BY_CITY = {
  gijon: [
    {
      id: "centro",
      label: "Centro",
      latitude: 43.5453,
      longitude: -5.6615,
    },
    {
      id: "la-calzada",
      label: "La Calzada",
      latitude: 43.5359,
      longitude: -5.7007,
    },
    {
      id: "el-llano",
      label: "El Llano",
      latitude: 43.5358,
      longitude: -5.6566,
    },
    {
      id: "viesques",
      label: "Viesques",
      latitude: 43.5248,
      longitude: -5.6327,
    },
    {
      id: "la-arena",
      label: "La Arena",
      latitude: 43.5407,
      longitude: -5.6471,
    },
  ],

  oviedo: [
    {
      id: "centro",
      label: "Centro",
      latitude: 43.3619,
      longitude: -5.8494,
    },
    {
      id: "masip",
      label: "Masip",
      latitude: 43.3611,
      longitude: -5.8638,
    },
    {
      id: "teatinos",
      label: "Teatinos",
      latitude: 43.3771,
      longitude: -5.8264,
    },
    {
      id: "salesas",
      label: "Salesas",
      latitude: 43.3656,
      longitude: -5.8457,
    },
  ],

  aviles: [
    {
      id: "centro",
      label: "Centro",
      latitude: 43.5569,
      longitude: -5.9247,
    },
    {
      id: "sabugo",
      label: "Sabugo",
      latitude: 43.5578,
      longitude: -5.9281,
    },
    {
      id: "la-luz",
      label: "La Luz",
      latitude: 43.5418,
      longitude: -5.9026,
    },
  ],
};

const PARKING_STATUS_OPTIONS = [
  {
    key: "looking",
    icon: "search-outline",
    label: "Buscando plaza",
    message: "Estoy buscando plaza para aparcar.",
  },
  {
    key: "parked",
    icon: "car-sport-outline",
    label: "Ya aparqué",
    message: "Ya he aparcado.",
  },
  {
    key: "leaving",
    icon: "exit-outline",
    label: "Voy a salir",
    message: "Voy a salir y dejo una plaza libre.",
  },
];

const MAX_POST_LENGTH = 280;
const LOW_CHARS_WARNING = 30;
const PARKING_MESSAGES_LIMIT = 80;

moment.locale("es");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function LeafletMapView({ html }) {
  if (Platform.OS === "web") {
    return React.createElement("iframe", {
      title: "Parking map",
      srcDoc: html,
      style: {
        width: "100%",
        height: "100%",
        border: "0",
        display: "block",
      },
    });
  }

  return (
    <WebView originWhitelist={["*"]} source={{ html }} style={styles.webview} />
  );
}

export default function ParkingScreen({ userId = DEFAULT_USER_ID }) {
  const [activeCity, setActiveCity] = useState(DEFAULT_CITY);
  const [activeZone, setActiveZone] = useState(DEFAULT_ZONE);
  const [activeUserId, setActiveUserId] = useState(userId || DEFAULT_USER_ID);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState("");

  const flatListRef = useRef(null);

  const zoneOptions = ZONE_OPTIONS_BY_CITY[activeCity] || [];

  const activeCityLabel = useMemo(() => {
    return (
      CITY_OPTIONS.find((city) => city.id === activeCity)?.label || activeCity
    );
  }, [activeCity]);

  const activeZoneData = useMemo(() => {
    return zoneOptions.find((zone) => zone.id === activeZone) || zoneOptions[0];
  }, [activeZone, zoneOptions]);

  const activeZoneLabel = activeZoneData?.label || activeZone;

  const activeMapCenter = useMemo(() => {
    return {
      latitude: activeZoneData?.latitude || 43.5453,
      longitude: activeZoneData?.longitude || -5.6615,
    };
  }, [activeZoneData]);

  const messages = useQuery(api.parking.listParkingMessages, {
    city: activeCity,
    zone: activeZone,
    limit: PARKING_MESSAGES_LIMIT,
  });

  const sendParkingMessage = useMutation(api.parking.sendParkingMessage);

  const data = useMemo(() => {
    return Array.isArray(messages) ? messages : [];
  }, [messages]);

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
    if (data.length > 0) {
      scrollToBottom(true);
    }
  }, [data.length]);

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

  async function postMessage(messageText, statusKey = "") {
    const cleanText = String(messageText || "").trim();
    const cleanUserId = activeUserId.trim() || DEFAULT_USER_ID;

    if (!cleanText || sending) {
      return;
    }

    if (cleanText.length > MAX_POST_LENGTH) {
      setErrorMessage(
        `El mensaje supera el límite de ${MAX_POST_LENGTH} caracteres.`,
      );
      return;
    }

    setSending(true);
    setErrorMessage("");

    try {
      await sendParkingMessage({
        city: activeCity,
        zone: activeZone,
        userId: cleanUserId,
        text: cleanText,
        status: statusKey || undefined,
        lat: activeMapCenter.latitude,
        lng: activeMapCenter.longitude,
      });

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

  function handleSelectCity(nextCity) {
    if (!nextCity || nextCity === activeCity) {
      return;
    }

    const nextZones = ZONE_OPTIONS_BY_CITY[nextCity] || [];
    const firstZone = nextZones[0]?.id || DEFAULT_ZONE;

    setActiveCity(nextCity);
    setActiveZone(firstZone);
    setSelectedStatus("");
    setErrorMessage("");
  }

  function handleSelectZone(nextZone) {
    if (!nextZone || nextZone === activeZone) {
      return;
    }

    setActiveZone(nextZone);
    setSelectedStatus("");
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

  function renderCityButton(city) {
    const selected = city.id === activeCity;

    return (
      <Pressable
        key={city.id}
        onPress={() => handleSelectCity(city.id)}
        style={({ pressed }) => [
          styles.selectorButton,
          selected && styles.selectorButtonSelected,
          pressed && styles.selectorButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.selectorButtonText,
            selected && styles.selectorButtonTextSelected,
          ]}
        >
          {city.label}
        </Text>
      </Pressable>
    );
  }

  function renderZoneButton(zone) {
    const selected = zone.id === activeZone;

    return (
      <Pressable
        key={zone.id}
        onPress={() => handleSelectZone(zone.id)}
        style={({ pressed }) => [
          styles.selectorButton,
          selected && styles.selectorButtonSelected,
          pressed && styles.selectorButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.selectorButtonText,
            selected && styles.selectorButtonTextSelected,
          ]}
        >
          {zone.label}
        </Text>
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

  function buildParkingMapHtml() {
    const centerLat = activeMapCenter.latitude;
    const centerLng = activeMapCenter.longitude;

    const safeCity = escapeHtml(activeCityLabel);
    const safeZone = escapeHtml(activeZoneLabel);

    const parkingMessages = data
      .filter(
        (message) =>
          Number.isFinite(message.lat) && Number.isFinite(message.lng),
      )
      .map((message) => ({
        lat: message.lat,
        lng: message.lng,
        userId: escapeHtml(message.userId || DEFAULT_USER_ID),
        text: escapeHtml(message.text || ""),
        status: escapeHtml(message.status || ""),
      }));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html,
    body,
    #map {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    .popup-title {
      font-weight: 700;
      margin-bottom: 4px;
    }

    .popup-status {
      font-size: 12px;
      color: #15803d;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .popup-text {
      font-size: 13px;
      color: #111827;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const map = L.map("map").setView([${centerLat}, ${centerLng}], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    L.circle([${centerLat}, ${centerLng}], {
      radius: 350,
      color: "#15803d",
      weight: 2,
      fillColor: "#22c55e",
      fillOpacity: 0.12
    }).addTo(map);

    L.marker([${centerLat}, ${centerLng}])
      .addTo(map)
      .bindPopup("<b>${safeCity}</b><br/>${safeZone}");

    const messages = ${JSON.stringify(parkingMessages)};

    messages.forEach((message) => {
      L.marker([message.lat, message.lng])
        .addTo(map)
        .bindPopup(
          "<div class='popup-title'>" + message.userId + "</div>" +
          (message.status
            ? "<div class='popup-status'>" + message.status + "</div>"
            : "") +
          "<div class='popup-text'>" + message.text + "</div>"
        );
    });
  </script>
</body>
</html>
`;
  }

  function renderMap() {
    const html = buildParkingMapHtml();

    return (
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.mapTitle}>Mapa de zona</Text>

            <Text style={styles.mapSubtitle}>
              {activeCityLabel} · {activeZoneLabel}
            </Text>
          </View>

          <View style={styles.mapBadge}>
            <Ionicons name="map-outline" size={16} color="#14532d" />
            <Text style={styles.mapBadgeText}>OpenStreetMap</Text>
          </View>
        </View>

        <View style={styles.mapWrapper}>
          <LeafletMapView html={html} />
        </View>

        <Text style={styles.mapHint}>
          Los avisos con coordenadas se muestran como marcadores en el mapa.
        </Text>
      </View>
    );
  }

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
                Chat rápido para avisar de plazas libres, coordinar dónde
                aparcar o indicar que vas a salir.
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
                <Text style={styles.fieldLabel}>Ciudad</Text>

                <View style={styles.selectorRow}>
                  {CITY_OPTIONS.map(renderCityButton)}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Zona</Text>

                <View style={styles.selectorRow}>
                  {zoneOptions.map(renderZoneButton)}
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
                Canal: parking · {activeCity} · {activeZone}
              </Text>
            </View>
          ) : null}

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View>
                <Text style={styles.cardTitle}>Estado actual</Text>

                <Text style={styles.cardSubtitle}>
                  {activeCityLabel} · {activeZoneLabel}
                </Text>
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

        {renderMap()}

        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>Chat de parking</Text>

          <Text style={styles.chatSubtitle}>
            {activeCityLabel} · {activeZoneLabel} ·{" "}
            {activeUserId.trim() || DEFAULT_USER_ID}
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

        {typeof item.lat === "number" && typeof item.lng === "number" ? (
          <Text style={styles.messageLocation}>
            {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
          </Text>
        ) : null}
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
                ListHeaderComponent={renderHeader}
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
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => scrollToBottom(true)}
                onLayout={() => scrollToBottom(false)}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={30}
                      color="#9ca3af"
                    />

                    <Text style={styles.emptyText}>
                      Todavía no hay mensajes de parking en esta zona.
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
                    Se permiten enlaces http:// y https://
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

  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  selectorButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  selectorButtonSelected: {
    borderColor: "#15803d",
    backgroundColor: "#14532d",
  },

  selectorButtonPressed: {
    opacity: 0.75,
  },

  selectorButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "900",
  },

  selectorButtonTextSelected: {
    color: "#ffffff",
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
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    color: "#14532d",
    fontSize: 17,
    fontWeight: "900",
  },

  cardSubtitle: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
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

  mapCard: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 18,
  },

  mapHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  mapTitle: {
    color: "#14532d",
    fontSize: 17,
    fontWeight: "900",
  },

  mapSubtitle: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  mapBadge: {
    minHeight: 32,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },

  mapBadgeText: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "900",
  },

  mapWrapper: {
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },

  webview: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  mapHint: {
    marginTop: 8,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
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

  messageLocation: {
    marginTop: 7,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
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
    outlineStyle: "none",
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
});

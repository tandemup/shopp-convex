// screens/ChatScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
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
import { safeAlert } from "@/components/ui/alert/safeAlert";
import {
  buildUrlSafetyRecords,
  canOpenUrlByStatus,
  extractUrlsFromText,
  getInitialUrlStatus,
  getUrlBlockedReason,
  getUrlStatusFromMessage,
  getUrlStatusLabel,
  getUrlStatusTone,
  normalizeUrl,
  URL_STATUS,
} from "@/services/urlSafety";

const MAX_MESSAGE_LENGTH = 280;
const DEFAULT_ROOM = "general";
const DEFAULT_USERNAME = "anonymous";
const SELF_DELETE_MS = 24 * 60 * 60 * 1000;

const ROOM_OPTIONS = [
  {
    id: "general",
    label: "General",
    icon: "chatbubbles-outline",
  },
  {
    id: "ofertas",
    label: "Ofertas",
    icon: "pricetag-outline",
  },
  {
    id: "tiendas",
    label: "Tiendas",
    icon: "storefront-outline",
  },
  {
    id: "parking",
    label: "Parking",
    icon: "car-outline",
  },
  {
    id: "avisos",
    label: "Avisos",
    icon: "megaphone-outline",
  },
];

function now() {
  return Date.now();
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  const diff = Math.max(0, now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "ahora";
  if (minutes === 1) return "hace 1 min";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;
  if (days === 1) return "hace 1 día";

  return `hace ${days} días`;
}

function formatTimeLeft(createdAt) {
  if (!createdAt) return "";

  const deleteAt = createdAt + SELF_DELETE_MS;
  const remaining = deleteAt - now();

  if (remaining <= 0) {
    return "Se borrará pronto";
  }

  const totalMinutes = Math.floor(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `Se borra en ${minutes} min`;
  }

  return `Se borra en ${hours} h ${minutes} min`;
}

function isImageUrl(url) {
  if (!url) return false;

  const clean = url.toLowerCase().split("?")[0];

  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp")
  );
}

function splitTextWithUrls(text) {
  if (!text) return [];

  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;

    if (start > lastIndex) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex, start),
      });
    }

    parts.push({
      type: "url",
      value: url,
    });

    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return parts;
}

function UrlBadge({ status }) {
  const tone = getUrlStatusTone(status);
  const label = getUrlStatusLabel(status);

  return (
    <View
      style={[
        styles.urlBadge,
        tone === "safe" && styles.urlBadgeSafe,
        tone === "pending" && styles.urlBadgePending,
        tone === "suspicious" && styles.urlBadgeSuspicious,
        tone === "malicious" && styles.urlBadgeMalicious,
      ]}
    >
      <Text
        style={[
          styles.urlBadgeText,
          tone === "safe" && styles.urlBadgeTextSafe,
          tone === "pending" && styles.urlBadgeTextPending,
          tone === "suspicious" && styles.urlBadgeTextSuspicious,
          tone === "malicious" && styles.urlBadgeTextMalicious,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function MessageText({ message, onOpenUrl }) {
  const text = message?.text || "";
  const parts = splitTextWithUrls(text);

  return (
    <Text style={styles.messageText}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <Text key={`text-${index}`} style={styles.messageText}>
              {part.value}
            </Text>
          );
        }

        const normalizedUrl = normalizeUrl(part.value);
        const status = getUrlStatusFromMessage(message, normalizedUrl);
        const canOpen = canOpenUrlByStatus(status);

        return (
          <Text
            key={`url-${index}`}
            style={[styles.messageLink, !canOpen && styles.messageLinkDisabled]}
            onPress={() => onOpenUrl(normalizedUrl, status)}
          >
            {part.value}
          </Text>
        );
      })}
    </Text>
  );
}

function MessageCard({ item, onOpenUrl }) {
  const urls = useMemo(() => {
    return extractUrlsFromText(item?.text || "");
  }, [item?.text]);

  return (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageUser}>
          {item.username || DEFAULT_USERNAME}
        </Text>

        <View style={styles.messageMeta}>
          <Text style={styles.messageAge}>
            {formatRelativeTime(item.createdAt)}
          </Text>

          <Text style={styles.messageClock}>{item.displayTime || ""}</Text>
        </View>
      </View>

      <MessageText message={item} onOpenUrl={onOpenUrl} />

      {urls.length > 0 && (
        <View style={styles.urlBadgesBlock}>
          {urls.map((url) => {
            const normalizedUrl = normalizeUrl(url);
            const status = getUrlStatusFromMessage(item, normalizedUrl);

            return (
              <UrlBadge
                key={`${item.id || item._id}-${normalizedUrl}`}
                status={status}
              />
            );
          })}
        </View>
      )}

      <Text style={styles.selfDeleteText}>
        {formatTimeLeft(item.createdAt)}
      </Text>
    </View>
  );
}

export default function ChatScreen({ navigation }) {
  const listRef = useRef(null);

  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "demo-1",
      room: DEFAULT_ROOM,
      username: "sam",
      text: "https://es.wikipedia.org/wiki/Guglielmo_Marconi",
      createdAt: Date.now() - 13 * 60 * 60 * 1000,
      displayTime: "20:44",
      urlSafety: [
        {
          url: "https://es.wikipedia.org/wiki/Guglielmo_Marconi",
          status: URL_STATUS.TRUSTED,
          checkedAt: Date.now() - 13 * 60 * 60 * 1000,
        },
      ],
    },
    {
      id: "demo-2",
      room: DEFAULT_ROOM,
      username: "sam",
      text: "https://www.google.com/finance/beta?hl=es",
      createdAt: Date.now() - 13 * 60 * 60 * 1000,
      displayTime: "20:46",
      urlSafety: [
        {
          url: "https://www.google.com/finance/beta?hl=es",
          status: URL_STATUS.PENDING,
          checkedAt: null,
        },
      ],
    },
  ]);

  const filteredMessages = useMemo(() => {
    const activeRoom = room.trim() || DEFAULT_ROOM;

    return messages
      .filter((message) => {
        return (message.room || DEFAULT_ROOM) === activeRoom;
      })
      .filter((message) => {
        if (!message.createdAt) return true;

        return now() - message.createdAt < SELF_DELETE_MS;
      })
      .sort((a, b) => {
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
  }, [messages, room]);

  const remainingChars = MAX_MESSAGE_LENGTH - input.length;
  const canPost = input.trim().length > 0 && remainingChars >= 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => {
        return prev.filter((message) => {
          if (!message.createdAt) return true;

          return now() - message.createdAt < SELF_DELETE_MS;
        });
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 100);

    return () => clearTimeout(timeout);
  }, [filteredMessages.length]);

  const handleOpenUrl = useCallback(async (url, status) => {
    const safeStatus = status || getInitialUrlStatus(url);

    if (!canOpenUrlByStatus(safeStatus)) {
      const reason = getUrlBlockedReason(safeStatus);

      safeAlert("Enlace no disponible", reason);
      return;
    }

    try {
      const normalizedUrl = normalizeUrl(url);

      if (!normalizedUrl) {
        safeAlert("URL no válida", "La URL no es válida.");
        return;
      }

      const supported = await Linking.canOpenURL(normalizedUrl);

      if (!supported) {
        safeAlert("No se puede abrir", "No se puede abrir este enlace.");
        return;
      }

      await Linking.openURL(normalizedUrl);
    } catch {
      safeAlert("Error", "Ha ocurrido un error al abrir el enlace.");
    }
  }, []);

  const handlePost = useCallback(() => {
    const cleanText = input.trim();

    if (!cleanText) return;

    if (cleanText.length > MAX_MESSAGE_LENGTH) {
      safeAlert(
        "Mensaje demasiado largo",
        `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
      return;
    }

    const createdAt = Date.now();
    const urlSafety = buildUrlSafetyRecords(cleanText);

    const newMessage = {
      id: `local-${createdAt}`,
      room: room.trim() || DEFAULT_ROOM,
      username: username.trim() || DEFAULT_USERNAME,
      text: cleanText,
      createdAt,
      displayTime: new Date(createdAt).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      urlSafety,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
  }, [input, room, username]);

  const renderItem = useCallback(
    ({ item }) => {
      return <MessageCard item={item} onOpenUrl={handleOpenUrl} />;
    },
    [handleOpenUrl],
  );

  const renderRoomOption = useCallback(
    (option) => {
      const selected = room === option.id;

      return (
        <Pressable
          key={option.id}
          onPress={() => setRoom(option.id)}
          style={({ pressed }) => [
            styles.roomOption,
            selected && styles.roomOptionSelected,
            pressed && styles.roomOptionPressed,
          ]}
        >
          <Ionicons
            name={option.icon}
            size={18}
            color={selected ? "#ffffff" : "#111827"}
          />

          <Text
            style={[
              styles.roomOptionText,
              selected && styles.roomOptionTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    },
    [room],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/*
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (navigation?.goBack) {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={26} color="#111827" />
          </Pressable>

          <Text style={styles.topTitle}>Chat</Text>

          <View style={styles.topRightSpace} />
        </View>
 */}
        <View style={styles.page}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.title}>Chat</Text>
                <Text style={styles.subtitle}>
                  Room: {room || DEFAULT_ROOM} · Usuario:{" "}
                  {username || DEFAULT_USERNAME}
                </Text>
              </View>

              <Pressable
                style={styles.settingsButton}
                onPress={() => setShowSettings((prev) => !prev)}
              >
                <Text style={styles.settingsButtonText}>
                  {showSettings ? "Ocultar" : "Ajustes"}
                </Text>
              </Pressable>
            </View>

            {showSettings && (
              <View style={styles.settingsPanel}>
                <Text style={styles.settingsLabel}>Room</Text>

                <View style={styles.roomPicker}>
                  {ROOM_OPTIONS.map(renderRoomOption)}
                </View>
                <Text style={styles.settingsLabel}>Usuario</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="anonymous"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.settingsInput}
                />
              </View>
            )}

            <FlatList
              ref={listRef}
              data={filteredMessages}
              keyExtractor={(item) => String(item.id || item._id)}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              ListEmptyComponent={
                <View style={styles.emptyBlock}>
                  <Text style={styles.emptyTitle}>Todavía no hay mensajes</Text>
                  <Text style={styles.emptyText}>
                    Publica un mensaje para iniciar el chat.
                  </Text>
                </View>
              }
            />

            <View style={styles.inputBlock}>
              <TextInput
                value={input}
                onChangeText={(text) => {
                  if (text.length <= MAX_MESSAGE_LENGTH) {
                    setInput(text);
                  } else {
                    setInput(text.slice(0, MAX_MESSAGE_LENGTH));
                  }
                }}
                placeholder="¿Qué está pasando en la compra?"
                placeholderTextColor="#8a8a8a"
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
                style={styles.input}
              />

              <View style={styles.inputFooter}>
                <Text style={styles.inputHint}>
                  Se permiten enlaces e imágenes por URL http:// o https://
                </Text>

                <Text
                  style={[
                    styles.counter,
                    remainingChars < 20 && styles.counterWarning,
                  ]}
                >
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.postButton,
                  !canPost && styles.postButtonDisabled,
                ]}
                disabled={!canPost}
                onPress={handlePost}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  topBar: {
    height: 72,
    backgroundColor: "#fff1d6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  topRightSpace: {
    width: 42,
  },

  page: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
  },

  card: {
    width: "100%",
    maxWidth: 540,
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 6,
  },

  listContent: {
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },

  inputBlock: {
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 14,
    position: "relative",
    paddingRight: 96,
    minHeight: 104,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  cardTitleBlock: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#555",
  },

  settingsButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },

  settingsButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  settingsPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  settingsLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 6,
  },

  settingsInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },

  list: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  emptyBlock: {
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  messageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },

  messageUser: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  messageMeta: {
    alignItems: "flex-end",
  },

  messageAge: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4b5563",
  },

  messageClock: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },

  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#111827",
    fontWeight: "500",
  },

  messageLink: {
    color: "#0066cc",
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  messageLinkDisabled: {
    color: "#8a6d00",
    textDecorationLine: "none",
  },

  urlBadgesBlock: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  urlBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },

  urlBadgeSafe: {
    backgroundColor: "#ecfdf3",
    borderColor: "#b7ebc6",
  },

  urlBadgePending: {
    backgroundColor: "#fff8db",
    borderColor: "#f0d264",
  },

  urlBadgeSuspicious: {
    backgroundColor: "#fff1e5",
    borderColor: "#f5b66d",
  },

  urlBadgeMalicious: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },

  urlBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  urlBadgeTextSafe: {
    color: "#147a32",
  },

  urlBadgeTextPending: {
    color: "#7a5a00",
  },

  urlBadgeTextSuspicious: {
    color: "#9a4b00",
  },

  urlBadgeTextMalicious: {
    color: "#991b1b",
  },

  selfDeleteText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#9a6600",
    textAlign: "right",
  },

  input: {
    minHeight: 56,
    maxHeight: 120,
    fontSize: 16,
    color: "#111827",
    textAlignVertical: "top",
    padding: 0,
    outlineStyle: Platform.OS === "web" ? "none" : undefined,
  },

  inputFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },

  inputHint: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },

  counter: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6b7280",
  },

  counterWarning: {
    color: "#b45309",
  },

  postButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 68,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  postButtonDisabled: {
    backgroundColor: "#9ca3af",
  },

  postButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  roomPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  roomOption: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  roomOptionSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  roomOptionPressed: {
    opacity: 0.75,
  },

  roomOptionText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },

  roomOptionTextSelected: {
    color: "#ffffff",
  },
});

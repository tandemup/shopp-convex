// screens/ChatScreen.js

import React, { useCallback, useMemo, useRef, useState } from "react";

import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Ionicons } from "@expo/vector-icons";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import WebPreviewCard from "@/src/components/chat/WebPreviewCard";

import {
  canOpenUrlByStatus,
  extractUrlsFromText,
  getInitialUrlStatus,
  getUrlBlockedReason,
  getUrlStatusFromMessage,
  getUrlStatusLabel,
  getUrlStatusTone,
  normalizeUrl,
  URL_STATUS,
} from "@/src/services/urlSafety";

const MAX_MESSAGE_LENGTH = 280;
const DEFAULT_ROOM = "general";
const DEFAULT_USERNAME = "anonymous";
const SELF_DELETE_MS = 24 * 60 * 60 * 1000;

const LINK_PREVIEW_ENDPOINT = "http://localhost:3000/api/link-preview";

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

function isEmailLike(value) {
  const text = String(value || "").trim();

  if (!text) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function getSafeChatAlias(value) {
  const alias = String(value || "").trim();

  if (!alias) return DEFAULT_USERNAME;

  if (isEmailLike(alias)) {
    return DEFAULT_USERNAME;
  }

  return alias;
}

function getVisibleUsername(value) {
  return getSafeChatAlias(value);
}

function getNormalizedUrlsFromText(text) {
  return extractUrlsFromText(text || "")
    .map((url) => normalizeUrl(url))
    .filter(Boolean);
}

function getUniqueValues(values) {
  return Array.from(new Set(values));
}

function getMessageFingerprint(room, text) {
  return `${room || DEFAULT_ROOM}::${String(text || "").trim()}`;
}

function messageHasUrl(message, normalizedUrl) {
  const urls = getNormalizedUrlsFromText(message?.text || "");

  return urls.includes(normalizedUrl);
}

function requestNextFrame(callback) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }

  setTimeout(callback, 0);
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

function formatClockTime(timestamp) {
  if (!timestamp) return "";

  try {
    return new Date(timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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

function getYouTubeVideoId(url) {
  if (!url) return null;

  try {
    const normalizedUrl = normalizeUrl(url);
    const parsedUrl = new URL(normalizedUrl);

    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = parsedUrl.searchParams.get("v");

      if (videoId) {
        return videoId;
      }

      const shortsMatch = parsedUrl.pathname.match(/^\/shorts\/([^/?#]+)/);

      if (shortsMatch?.[1]) {
        return shortsMatch[1];
      }

      const embedMatch = parsedUrl.pathname.match(/^\/embed\/([^/?#]+)/);

      if (embedMatch?.[1]) {
        return embedMatch[1];
      }
    }

    if (hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.replace("/", "").split(/[?#]/)[0];

      if (videoId) {
        return videoId;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnailUrl(url) {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) return null;

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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

function MessageText({ message, onOpenUrl, hiddenUrls = [] }) {
  const text = message?.text || "";
  const parts = splitTextWithUrls(text);

  const normalizedHiddenUrls = hiddenUrls
    .map((url) => normalizeUrl(url))
    .filter(Boolean);

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

        if (normalizedHiddenUrls.includes(normalizedUrl)) {
          return null;
        }

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

function LayoutPanel({
  rooms,
  room,
  setRoom,
  username,
  setUsername,
  compact = false,
}) {
  return (
    <View style={[styles.layoutPanel, compact && styles.layoutPanelCompact]}>
      <Text style={styles.panelTitle}>Room</Text>

      <View style={[styles.roomGrid, compact && styles.roomGridCompact]}>
        {rooms.map((item) => {
          const active = item.id === room;

          return (
            <Pressable
              key={item.id}
              onPress={() => setRoom(item.id)}
              style={[styles.roomButton, active && styles.roomButtonActive]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={active ? "#ffffff" : "#111827"}
              />

              <Text
                style={[
                  styles.roomButtonText,
                  active && styles.roomButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.userBlock}>
        <Text style={styles.panelTitle}>Usuario</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="anonymous"
          placeholderTextColor="#9ca3af"
          style={styles.usernameInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function YouTubeThumbnail({ url, onOpenUrl }) {
  const thumbnailUrl = getYouTubeThumbnailUrl(url);

  if (!thumbnailUrl) return null;

  return (
    <Pressable
      style={styles.youtubePreview}
      onPress={() => onOpenUrl(url, URL_STATUS.TRUSTED)}
    >
      <Image
        source={{ uri: thumbnailUrl }}
        style={styles.youtubeThumbnail}
        resizeMode="cover"
      />

      <View style={styles.youtubePlayBadge}>
        <Ionicons name="play" size={18} color="#ffffff" />
      </View>
    </Pressable>
  );
}

function MessageCard({
  item,
  onOpenUrl,
  compact = false,
  forcedUsername = null,
}) {
  const urls = useMemo(() => {
    return getUniqueValues(getNormalizedUrlsFromText(item?.text || ""));
  }, [item?.text]);

  const firstUrl = urls[0] || null;
  const createdAt = item.createdAt || item._creationTime;

  const visibleUsername = getVisibleUsername(forcedUsername || item?.username);
  const avatarLetter = visibleUsername.slice(0, 1).toUpperCase();

  return (
    <View style={[styles.messageCard, compact && styles.messageCardCompact]}>
      <View style={styles.messageHeader}>
        <View style={styles.messageUserBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>

          <View style={styles.messageUserTextBox}>
            <Text style={styles.messageUser} numberOfLines={1}>
              {visibleUsername}
            </Text>

            <Text style={styles.messageRoom} numberOfLines={1}>
              #{item.room || DEFAULT_ROOM}
            </Text>
          </View>
        </View>

        <View style={styles.messageMeta}>
          <Text style={styles.messageAge}>{formatRelativeTime(createdAt)}</Text>

          <Text style={styles.messageClock}>
            {item.displayTime || formatClockTime(createdAt)}
          </Text>
        </View>
      </View>

      {/* <MessageText message={item} onOpenUrl={onOpenUrl} /> */}

      {firstUrl ? (
        <WebPreviewCard
          url={firstUrl}
          compact={compact}
          previewEndpoint={LINK_PREVIEW_ENDPOINT}
          onPress={(targetUrl) => onOpenUrl(targetUrl, URL_STATUS.TRUSTED)}
        />
      ) : null}

      {firstUrl && getYouTubeThumbnailUrl(firstUrl) ? (
        <View style={styles.youtubePreviewBlock}>
          <YouTubeThumbnail
            url={firstUrl}
            onOpenUrl={(targetUrl) => onOpenUrl(targetUrl, URL_STATUS.TRUSTED)}
          />
        </View>
      ) : null}

      {urls.length > 0 ? (
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
      ) : null}

      <Text style={styles.selfDeleteText}>{formatTimeLeft(createdAt)}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const listRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const shouldScrollAfterPostRef = useRef(false);

  const { width } = useWindowDimensions();

  const isDesktop = width >= 900;
  const isTablet = width >= 700 && width < 900;
  const isSmallMobile = width < 390;

  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [localAliasByMessage, setLocalAliasByMessage] = useState({});

  const activeRoom = room.trim() || DEFAULT_ROOM;
  const visibleUsername = getSafeChatAlias(username);

  const convexMessages = useQuery(api.chat.listMessages, {
    room: activeRoom,
  });

  const sendMessage = useMutation(api.chat.sendMessage);

  const messages = useMemo(() => {
    return Array.isArray(convexMessages) ? convexMessages : [];
  }, [convexMessages]);

  const isLoadingMessages = convexMessages === undefined;

  const layoutStyles = useMemo(() => {
    return {
      page: [
        styles.page,
        isDesktop && styles.pageDesktop,
        isTablet && styles.pageTablet,
        isSmallMobile && styles.pageSmallMobile,
      ],

      card: [
        styles.card,
        isDesktop && styles.cardDesktop,
        isTablet && styles.cardTablet,
        isSmallMobile && styles.cardSmallMobile,
      ],

      cardHeader: [styles.cardHeader, !isDesktop && styles.cardHeaderMobile],

      title: [
        styles.title,
        isDesktop && styles.titleDesktop,
        isSmallMobile && styles.titleSmallMobile,
      ],

      subtitle: [styles.subtitle, isSmallMobile && styles.subtitleSmallMobile],

      inputBlock: [
        styles.inputBlock,
        isDesktop && styles.inputBlockDesktop,
        isSmallMobile && styles.inputBlockSmallMobile,
      ],

      listContent: [
        styles.listContent,
        isDesktop && styles.listContentDesktop,
        isSmallMobile && styles.listContentSmallMobile,
      ],
    };
  }, [isDesktop, isTablet, isSmallMobile]);

  const filteredMessages = useMemo(() => {
    return messages
      .filter((message) => {
        return (message.room || DEFAULT_ROOM) === activeRoom;
      })
      .filter((message) => {
        const createdAt = message.createdAt || message._creationTime;

        if (!createdAt) return true;

        return now() - createdAt < SELF_DELETE_MS;
      })
      .sort((a, b) => {
        const createdAtA = a.createdAt || a._creationTime || 0;
        const createdAtB = b.createdAt || b._creationTime || 0;

        return createdAtA - createdAtB;
      });
  }, [messages, activeRoom]);

  const remainingChars = MAX_MESSAGE_LENGTH - input.length;
  const canPost = input.trim().length > 0 && remainingChars >= 0 && !sending;

  const handleListContentSizeChange = useCallback(() => {
    if (!filteredMessages.length) return;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;

      requestNextFrame(() => {
        listRef.current?.scrollToEnd?.({ animated: false });
      });

      return;
    }

    if (shouldScrollAfterPostRef.current) {
      shouldScrollAfterPostRef.current = false;

      requestNextFrame(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      });
    }
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

  const handlePost = useCallback(async () => {
    const cleanText = input.trim();

    if (!cleanText || sending) return;

    if (cleanText.length > MAX_MESSAGE_LENGTH) {
      safeAlert(
        "Mensaje demasiado largo",
        `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
      return;
    }

    const cleanRoom = room.trim() || DEFAULT_ROOM;
    const cleanUsername = getSafeChatAlias(username);

    const urlsInPost = getNormalizedUrlsFromText(cleanText);
    const uniqueUrlsInPost = getUniqueValues(urlsInPost);

    if (urlsInPost.length > 1) {
      safeAlert(
        "Demasiados enlaces",
        "Solo se permite publicar un enlace por mensaje.",
      );
      return;
    }

    if (urlsInPost.length !== uniqueUrlsInPost.length) {
      safeAlert(
        "URL duplicada",
        "El mensaje contiene la misma URL más de una vez.",
      );
      return;
    }

    const duplicatedUrl = uniqueUrlsInPost.find((url) => {
      return filteredMessages.some((message) => {
        const messageRoom = message.room || DEFAULT_ROOM;
        const createdAt = message.createdAt || message._creationTime;

        if (messageRoom !== cleanRoom) return false;

        if (createdAt && now() - createdAt >= SELF_DELETE_MS) {
          return false;
        }

        return messageHasUrl(message, url);
      });
    });

    if (duplicatedUrl) {
      safeAlert(
        "URL ya publicada",
        "Ese enlace ya existe en este chat. No se publicará otra vez.",
      );
      return;
    }

    const messageFingerprint = getMessageFingerprint(cleanRoom, cleanText);

    setSending(true);

    try {
      setLocalAliasByMessage((prev) => ({
        ...prev,
        [messageFingerprint]: cleanUsername,
      }));

      shouldScrollAfterPostRef.current = true;

      await sendMessage({
        room: cleanRoom,
        username: cleanUsername,
        text: cleanText,
      });

      setInput("");
    } catch (error) {
      console.error("Error guardando mensaje en Convex:", error);

      shouldScrollAfterPostRef.current = false;

      setLocalAliasByMessage((prev) => {
        const next = { ...prev };
        delete next[messageFingerprint];
        return next;
      });

      safeAlert(
        "Error",
        error?.message || "No se pudo guardar el mensaje en la base de datos.",
      );
    } finally {
      setSending(false);
    }
  }, [input, room, username, sending, sendMessage, filteredMessages]);

  const renderItem = useCallback(
    ({ item }) => {
      const messageFingerprint = getMessageFingerprint(
        item?.room || DEFAULT_ROOM,
        item?.text || "",
      );

      const currentVisibleUsername = getVisibleUsername(item?.username);
      const localAlias = localAliasByMessage[messageFingerprint];

      const forcedUsername =
        currentVisibleUsername === DEFAULT_USERNAME ? localAlias : null;

      return (
        <MessageCard
          item={item}
          onOpenUrl={handleOpenUrl}
          compact={isSmallMobile}
          forcedUsername={forcedUsername}
        />
      );
    },
    [handleOpenUrl, isSmallMobile, localAliasByMessage],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={layoutStyles.page}>
          <View style={layoutStyles.card}>
            <View style={layoutStyles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <View style={styles.titleRow}>
                  <View style={styles.titleIconBox}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={22}
                      color="#2563eb"
                    />
                  </View>

                  <Text style={layoutStyles.title}>Chat</Text>
                </View>

                <Text style={layoutStyles.subtitle} numberOfLines={2}>
                  Room: {room || DEFAULT_ROOM} · Usuario: {visibleUsername}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.settingsButton,
                  showSettings && styles.settingsButtonActive,
                  pressed && styles.settingsButtonPressed,
                ]}
                onPress={() => setShowSettings((prev) => !prev)}
              >
                <Ionicons
                  name={showSettings ? "close-outline" : "settings-outline"}
                  size={18}
                  color={showSettings ? "#ffffff" : "#111827"}
                />

                <Text
                  style={[
                    styles.settingsButtonText,
                    showSettings && styles.settingsButtonTextActive,
                  ]}
                >
                  {showSettings ? "Ocultar" : "Ajustes"}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.contentLayout,
                !isDesktop && styles.contentLayoutMobile,
              ]}
            >
              {showSettings ? (
                <LayoutPanel
                  rooms={ROOM_OPTIONS}
                  room={room}
                  setRoom={setRoom}
                  username={username}
                  setUsername={setUsername}
                  compact={!isDesktop}
                />
              ) : null}

              <View style={styles.chatContent}>
                <FlatList
                  ref={listRef}
                  data={filteredMessages}
                  keyExtractor={(item) => String(item.id || item._id)}
                  renderItem={renderItem}
                  style={styles.list}
                  contentContainerStyle={[
                    layoutStyles.listContent,
                    filteredMessages.length === 0 && styles.listContentEmpty,
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={isDesktop}
                  onContentSizeChange={handleListContentSizeChange}
                  ListEmptyComponent={
                    <View style={styles.emptyBlock}>
                      <View style={styles.emptyIconBox}>
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={34}
                          color="#94a3b8"
                        />
                      </View>

                      <Text style={styles.emptyTitle}>
                        {isLoadingMessages
                          ? "Cargando mensajes"
                          : "Todavía no hay mensajes"}
                      </Text>

                      <Text style={styles.emptyText}>
                        {isLoadingMessages
                          ? "Sincronizando con Convex..."
                          : "Publica un mensaje para iniciar el chat."}
                      </Text>
                    </View>
                  }
                />

                <View style={layoutStyles.inputBlock}>
                  <View style={styles.inputMainRow}>
                    <View style={styles.inputTextColumn}>
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

                      <Text style={styles.inputHint} numberOfLines={1}>
                        Se permite 1 enlace por mensaje: http:// o https://
                      </Text>
                    </View>

                    <View style={styles.inputActionsColumn}>
                      <Text
                        style={[
                          styles.counter,
                          remainingChars < 20 && styles.counterWarning,
                        ]}
                      >
                        {input.length}/{MAX_MESSAGE_LENGTH}
                      </Text>

                      <Pressable
                        style={[
                          styles.postButton,
                          !canPost && styles.postButtonDisabled,
                        ]}
                        disabled={!canPost}
                        onPress={handlePost}
                      >
                        <Text style={styles.postButtonText}>
                          {sending ? "..." : "Post"}
                        </Text>

                        <Ionicons
                          name="send-outline"
                          size={16}
                          color="#ffffff"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
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

  page: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },

  pageTablet: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },

  pageDesktop: {
    paddingHorizontal: 36,
    paddingTop: 30,
    paddingBottom: 28,
    backgroundColor: "#e2e8f0",
  },

  pageSmallMobile: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },

  card: {
    width: "100%",
    maxWidth: 560,
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 6,
  },

  cardTablet: {
    maxWidth: 680,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
  },

  cardDesktop: {
    maxWidth: 1120,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderRadius: 30,
  },

  cardSmallMobile: {
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 12,
  },

  cardHeaderMobile: {
    alignItems: "center",
  },

  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  titleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#111827",
  },

  titleDesktop: {
    fontSize: 32,
    lineHeight: 38,
  },

  titleSmallMobile: {
    fontSize: 24,
    lineHeight: 30,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
    fontWeight: "600",
  },

  subtitleSmallMobile: {
    fontSize: 12,
    lineHeight: 17,
  },

  settingsButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  settingsButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  settingsButtonPressed: {
    opacity: 0.75,
  },

  settingsButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  settingsButtonTextActive: {
    color: "#ffffff",
  },

  contentLayout: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
    minHeight: 0,
  },

  contentLayoutMobile: {
    flexDirection: "column",
    gap: 12,
  },

  layoutPanel: {
    width: 260,
    flexShrink: 0,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignSelf: "stretch",
  },

  layoutPanelCompact: {
    width: "100%",
    alignSelf: "auto",
    padding: 14,
  },

  panelTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#374151",
    marginBottom: 8,
  },

  roomGrid: {
    gap: 8,
  },

  roomGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  roomButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  roomButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  roomButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  roomButtonTextActive: {
    color: "#ffffff",
  },

  userBlock: {
    marginTop: 16,
  },

  usernameInput: {
    minHeight: 44,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    outlineStyle: Platform.OS === "web" ? "none" : undefined,
  },

  chatContent: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },

  list: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  listContent: {
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },

  listContentDesktop: {
    paddingHorizontal: 8,
    paddingTop: 18,
    paddingBottom: 22,
  },

  listContentSmallMobile: {
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },

  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyBlock: {
    padding: 24,
    alignItems: "center",
  },

  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
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

  messageCardCompact: {
    padding: 13,
    borderRadius: 16,
  },

  messageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },

  messageUserBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#2563eb",
  },

  messageUserTextBox: {
    flex: 1,
    minWidth: 0,
  },

  messageUser: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  messageRoom: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
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
    lineHeight: 23,
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

  inputBlock: {
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 58,
  },

  inputBlockDesktop: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  inputBlockSmallMobile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },

  inputMainRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  inputTextColumn: {
    flex: 1,
    minWidth: 0,
  },

  inputActionsColumn: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
  },

  input: {
    minHeight: 22,
    maxHeight: 38,
    fontSize: 15,
    lineHeight: 20,
    color: "#111827",
    textAlignVertical: "top",
    padding: 0,
    outlineStyle: Platform.OS === "web" ? "none" : undefined,
  },

  inputHint: {
    marginTop: 3,
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 14,
  },

  counter: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
  },

  counterWarning: {
    color: "#b45309",
  },

  postButton: {
    minHeight: 34,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 17,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  postButtonDisabled: {
    backgroundColor: "#9ca3af",
  },

  postButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  youtubePreviewBlock: {
    marginTop: 12,
    gap: 10,
  },

  youtubePreview: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    position: "relative",
  },

  youtubeThumbnail: {
    width: "100%",
    height: "100%",
  },

  youtubePlayBadge: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 46,
    height: 46,
    marginLeft: -23,
    marginTop: -23,
    borderRadius: 23,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
});

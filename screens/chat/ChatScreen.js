import React, { useEffect, useRef, useMemo, useState } from "react";
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
import { Audio } from "expo-av";
import moment from "moment";
import "moment/locale/es";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const DEFAULT_ROOM = "general";
const DEFAULT_USERNAME = "anonymous";

const ROOM_OPTIONS = ["general", "familia", "trabajo", "compras"];

const MAX_POST_LENGTH = 280;
const LOW_CHARS_WARNING = 30;

moment.locale("es");

export default function ChatScreen({
  room = DEFAULT_ROOM,
  username = DEFAULT_USERNAME,
}) {
  const [activeRoom, setActiveRoom] = useState(room || DEFAULT_ROOM);
  const [activeUsername, setActiveUsername] = useState(
    username || DEFAULT_USERNAME,
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState("");
  const flatListRef = useRef(null);

  const messages = useQuery(api.chat.listMessages, {
    room: activeRoom,
  });

  const sendMessage = useMutation(api.chat.sendMessage);

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
      console.error("Error reproduciendo message-tone.mp3:", error);
    }
  }

  async function handleSend() {
    const cleanText = text.trim();
    const cleanUsername = activeUsername.trim() || DEFAULT_USERNAME;
    const cleanRoom = activeRoom.trim() || DEFAULT_ROOM;

    if (!cleanText || sending) {
      return;
    }

    if (cleanText.length > MAX_POST_LENGTH) {
      setErrorMessage(
        `El mensaje supera el límite de ${MAX_POST_LENGTH} caracteres.`,
      );
      return;
    }

    setText("");
    setSending(true);
    setErrorMessage("");

    try {
      await sendMessage({
        room: cleanRoom,
        username: cleanUsername,
        text: cleanText,
      });

      playMessageTone();
      setNow(Date.now());
      scrollToBottom(true);
    } catch (error) {
      console.error("Error enviando mensaje con Convex:", error);
      setText(cleanText);
      setErrorMessage(error?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  function handleSelectRoom(nextRoom) {
    if (!nextRoom || nextRoom === activeRoom) {
      return;
    }

    setActiveRoom(nextRoom);
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

  function renderRoomButton(roomName) {
    const selected = roomName === activeRoom;

    return (
      <Pressable
        key={roomName}
        onPress={() => handleSelectRoom(roomName)}
        style={({ pressed }) => [
          styles.roomButton,
          selected && styles.roomButtonSelected,
          pressed && styles.roomButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.roomButtonText,
            selected && styles.roomButtonTextSelected,
          ]}
        >
          {roomName}
        </Text>
      </Pressable>
    );
  }

  function renderMessage({ item }) {
    const createdAt = item.createdAt ?? item._creationTime;

    const date = createdAt ? moment(createdAt).format("HH:mm") : "";
    const elapsedTime = formatElapsedTime(createdAt);

    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <Text style={styles.username}>
            {item.username || DEFAULT_USERNAME}
          </Text>

          <View style={styles.messageTimeBlock}>
            <Text style={styles.elapsedTime}>{elapsedTime}</Text>
            <Text style={styles.time}>{date}</Text>
          </View>
        </View>

        {renderMessageText(item.text)}
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
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>Chat</Text>

                  <Text style={styles.subtitle}>
                    Room: {activeRoom} · Usuario:{" "}
                    {activeUsername.trim() || DEFAULT_USERNAME}
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
                    <Text style={styles.fieldLabel}>Rooms</Text>

                    <View style={styles.roomsRow}>
                      {ROOM_OPTIONS.map(renderRoomButton)}
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Username</Text>

                    <TextInput
                      value={activeUsername}
                      onChangeText={setActiveUsername}
                      placeholder="anonymous"
                      placeholderTextColor="#888"
                      style={styles.usernameInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={32}
                    />
                  </View>
                </View>
              ) : null}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Cargando mensajes...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={data}
                keyExtractor={(item) => item._id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => scrollToBottom(true)}
                onLayout={() => scrollToBottom(false)}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Todavía no hay mensajes en esta room.
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
                  placeholder="¿Qué está pasando en la compra?"
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
    backgroundColor: Platform.OS === "web" ? "#e9e9e9" : "#f6f6f6",
  },

  phoneFrame: {
    flex: 1,
    width: Platform.OS === "web" ? "100%" : undefined,
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    maxHeight: Platform.OS === "web" ? 860 : undefined,
    borderRadius: Platform.OS === "web" ? 26 : 0,
    overflow: "hidden",
    backgroundColor: "#f6f6f6",
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
    backgroundColor: "#f6f6f6",
  },

  header: {
    marginBottom: 12,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  titleBlock: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },

  settingsToggleButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsToggleButtonPressed: {
    opacity: 0.75,
  },

  settingsToggleButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
  },

  settingsPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    gap: 12,
  },

  fieldBlock: {
    gap: 6,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  roomsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  roomButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
  },

  roomButtonSelected: {
    borderColor: "#222",
    backgroundColor: "#222",
  },

  roomButtonPressed: {
    opacity: 0.75,
  },

  roomButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },

  roomButtonTextSelected: {
    color: "white",
  },

  usernameInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 8,
    color: "#666",
  },

  messagesList: {
    paddingBottom: 12,
  },

  emptyContainer: {
    paddingTop: 32,
    alignItems: "center",
  },

  emptyText: {
    color: "#777",
    fontSize: 14,
  },

  messageCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },

  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },

  username: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
  },

  messageTimeBlock: {
    alignItems: "flex-end",
    gap: 2,
  },

  elapsedTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },

  time: {
    fontSize: 12,
    color: "#888",
  },

  messageText: {
    fontSize: 15,
    color: "#111",
    lineHeight: 21,
  },

  messageLink: {
    fontSize: 15,
    color: "#1465d8",
    lineHeight: 21,
    fontWeight: "700",
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
    fontSize: 13,
    fontWeight: "600",
    color: "#9f1d1d",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },

  composerBox: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 7,
    backgroundColor: "white",
  },

  composerBoxError: {
    borderColor: "#d93025",
    backgroundColor: "#fffafa",
  },

  input: {
    minHeight: 44,
    maxHeight: 120,
    padding: 0,
    backgroundColor: "white",
    fontSize: 15,
    lineHeight: 20,
    color: "#111",
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
    fontSize: 11,
    color: "#777",
  },

  charCounter: {
    fontSize: 12,
    fontWeight: "800",
    color: "#777",
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
    backgroundColor: "#222",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendButtonPressed: {
    opacity: 0.8,
  },

  sendButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
});

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const DEFAULT_ROOM = "general";
const DEFAULT_USERNAME = "anonymous";

const ROOM_OPTIONS = ["general", "familia", "trabajo", "compras"];

export default function ChatScreenConvex({
  room = DEFAULT_ROOM,
  username = DEFAULT_USERNAME,
}) {
  const [activeRoom, setActiveRoom] = useState(room || DEFAULT_ROOM);
  const [activeUsername, setActiveUsername] = useState(
    username || DEFAULT_USERNAME,
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const messages = useQuery(api.chat.listMessages, {
    room: activeRoom,
  });

  const sendMessage = useMutation(api.chat.sendMessage);

  const data = useMemo(() => {
    return Array.isArray(messages) ? messages : [];
  }, [messages]);

  const isLoading = messages === undefined;

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

    setText("");
    setSending(true);

    try {
      await sendMessage({
        room: cleanRoom,
        username: cleanUsername,
        text: cleanText,
      });
      playMessageTone();
    } catch (error) {
      console.error("Error enviando mensaje con Convex:", error);
      setText(cleanText);
    } finally {
      setSending(false);
    }
  }

  function handleSelectRoom(nextRoom) {
    if (!nextRoom || nextRoom === activeRoom) {
      return;
    }

    setActiveRoom(nextRoom);
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
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <Text style={styles.username}>{item.username || "anonymous"}</Text>
          <Text style={styles.time}>{date}</Text>
        </View>

        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Chat</Text>

            <Text style={styles.subtitle}>
              Room: {activeRoom} · Usuario:{" "}
              {activeUsername.trim() || DEFAULT_USERNAME}
            </Text>

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
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Cargando mensajes...</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => item._id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Todavía no hay mensajes en esta room.
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje"
              placeholderTextColor="#888"
              style={styles.input}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
            />

            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [
                styles.sendButton,
                (!text.trim() || sending) && styles.sendButtonDisabled,
                pressed && !sending && styles.sendButtonPressed,
              ]}
            >
              <Text style={styles.sendButtonText}>
                {sending ? "..." : "Enviar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  header: {
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },

  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 12,
  },

  username: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
  },

  time: {
    fontSize: 12,
    color: "#888",
  },

  messageText: {
    fontSize: 15,
    color: "#111",
    lineHeight: 20,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "white",
    fontSize: 15,
    color: "#111",
  },

  sendButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
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
    fontWeight: "700",
  },
});

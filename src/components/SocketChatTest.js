import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";

import chatSocket from "@/services/chatSocket";

export default function SocketChatTest() {
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleSystemMessage(message) {
      setMessages((current) => [...current, message]);
    }

    function handleChatMessage(message) {
      setMessages((current) => [...current, message]);
    }

    function handleChatError(error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          user: "Sistema",
          text: error?.message || "Error de chat",
        },
      ]);
    }

    chatSocket.on("connect", handleConnect);
    chatSocket.on("disconnect", handleDisconnect);
    chatSocket.on("chat:system", handleSystemMessage);
    chatSocket.on("chat:message", handleChatMessage);
    chatSocket.on("chat:error", handleChatError);

    chatSocket.connect();

    return () => {
      chatSocket.off("connect", handleConnect);
      chatSocket.off("disconnect", handleDisconnect);
      chatSocket.off("chat:system", handleSystemMessage);
      chatSocket.off("chat:message", handleChatMessage);
      chatSocket.off("chat:error", handleChatError);
      chatSocket.disconnect();
    };
  }, []);

  function handleSend() {
    const cleanText = text.trim();

    if (!cleanText || !connected) {
      return;
    }

    chatSocket.emit("chat:message", {
      user: "usuario-prueba",
      text: cleanText,
    });

    setText("");
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Estado: {connected ? "conectado" : "desconectado"}</Text>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={({ item }) => (
          <Text style={{ paddingVertical: 6 }}>
            {item.user || "Sistema"}: {item.text}
          </Text>
        )}
      />

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Escribe un mensaje"
        onSubmitEditing={handleSend}
        returnKeyType="send"
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
        }}
      />

      <Pressable
        onPress={handleSend}
        disabled={!connected || !text.trim()}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          opacity: connected && text.trim() ? 1 : 0.5,
        }}
      >
        <Text>Enviar</Text>
      </Pressable>
    </View>
  );
}

import { io } from "socket.io-client";

import { SOCKET_SERVER_URL } from "@/config/env";

let socket = null;

export function getChatSocket() {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect_error", (error) => {
      console.warn("Error conectando al socket:", {
        message: error?.message,
        serverUrl: SOCKET_SERVER_URL,
      });
    });
  }

  return socket;
}

export function connectChatSocket() {
  const currentSocket = getChatSocket();

  if (!currentSocket.connected) {
    currentSocket.connect();
  }

  return currentSocket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
  }
}

export default {
  getChatSocket,
  connectChatSocket,
  disconnectChatSocket,
};

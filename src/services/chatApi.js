import { SOCKET_SERVER_URL } from "@/config/env";

const SERVER_URL = SOCKET_SERVER_URL;

export async function getChatMessages(room = "general") {
  const response = await fetch(
    `${SERVER_URL}/api/messages?room=${encodeURIComponent(room)}`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar los mensajes");
  }

  return Array.isArray(data) ? data : [];
}

export async function createChatMessage({
  room = "general",
  username = "anonymous",
  text,
}) {
  const response = await fetch(`${SERVER_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      room,
      username,
      text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear el mensaje");
  }

  return data;
}

import { Platform } from "react-native";
import { getOfflineTrack } from "@/src/services/musicIndexedDb";

function usable(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function driveFileId(value) {
  const text = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
  const match = text.match(/(?:\/file\/d\/|[?&]id=|\/d\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function normalizeAudioUrl(value) {
  const text = String(value || "").trim();
  const id = driveFileId(text);
  return id
    ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
    : text;
}

function objectUrlFromRecord(record) {
  if (!record?.blob || typeof URL === "undefined" || !URL.createObjectURL) {
    return null;
  }
  return URL.createObjectURL(record.blob);
}

// Devuelve siempre una URI; en web no hacemos fetch de Google Drive porque
// su redirección/descarga suele estar bloqueada por CORS.
export async function getPlayableSharedTrackUri(track, index = 0) {
  if (Platform.OS === "web") {
    try {
      const record = await getOfflineTrack(track, index);
      const localUri = objectUrlFromRecord(record);
      if (localUri) return localUri;
    } catch {
      // Se continúa con la URL pública.
    }
  }

  const uri = normalizeAudioUrl(
    track?.audioUrl || track?.audio?.audioUrl || track?.audioId || track?.url,
  );
  if (!usable(uri)) {
    throw new Error("La pista no contiene una URL de audio válida.");
  }
  return uri.trim();
}

export async function getPlayableTrackUri(trackId, remoteUri) {
  if (Platform.OS === "web") {
    try {
      const record = await getOfflineTrack(
        { _id: trackId, trackId, audioUrl: remoteUri },
        0,
      );
      const localUri = objectUrlFromRecord(record);
      if (localUri) return localUri;
    } catch {
      // Se continúa con la URL remota.
    }
  }

  if (!usable(remoteUri)) {
    throw new Error("La pista no contiene una URL de audio válida.");
  }
  return normalizeAudioUrl(remoteUri);
}

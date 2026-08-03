import { getCachedMusicUri } from "./musicPlatformStorage";

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

export async function getPlayableSharedTrackUri(track, index = 0) {
  try {
    const localUri = await getCachedMusicUri(track, index);
    if (localUri) return localUri;
  } catch {}

  const uri = normalizeAudioUrl(
    track?.audioUrl || track?.audio?.audioUrl || track?.audioId || track?.url,
  );
  if (!usable(uri)) {
    throw new Error("La pista no contiene una URL de audio válida.");
  }
  return uri.trim();
}

export async function getPlayableTrackUri(trackId, remoteUri) {
  try {
    const localUri = await getCachedMusicUri(
      { _id: trackId, trackId, audioUrl: remoteUri },
      0,
    );
    if (localUri) return localUri;
  } catch {}

  if (!usable(remoteUri)) {
    throw new Error("La pista no contiene una URL de audio válida.");
  }
  return normalizeAudioUrl(remoteUri);
}

import { getCachedMusicUri } from "./musicPlatformStorage";
import { normalizeDriveAudioUrl } from "./driveAudioUrl";

function usable(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function getPlayableSharedTrackUri(track, index = 0) {
  try {
    const localUri = await getCachedMusicUri(track, index);
    if (localUri) return localUri;
  } catch {}

  const uri = normalizeDriveAudioUrl(
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
  return normalizeDriveAudioUrl(remoteUri);
}

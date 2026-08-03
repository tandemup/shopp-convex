import { Platform } from "react-native";
import {
  deleteOfflineAlbum as deleteWebAlbum,
  getOfflineTrack,
  isMusicIndexedDbAvailable,
  saveOfflineTrack as saveWebTrack,
} from "./musicIndexedDb";

function nativeFileSystem() {
  // expo-file-system is loaded only on iOS/Android. This keeps IndexedDB and
  // browser-only code out of the native execution path.
  // eslint-disable-next-line global-require
  return require("expo-file-system/legacy");
}

function keyFor(track, index = 0) {
  return String(
    track?._id || track?.trackId || track?.audioId || track?.audioUrl || `track-${index}`,
  ).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function objectUrl(record) {
  if (!record?.blob || typeof URL === "undefined" || !URL.createObjectURL) return null;
  return URL.createObjectURL(record.blob);
}

export function musicStoragePlatform() {
  return Platform.OS === "web" ? "web" : "native";
}

export function canStoreMusicOffline() {
  return Platform.OS === "web"
    ? isMusicIndexedDbAvailable()
    : Boolean(nativeFileSystem().cacheDirectory);
}

export async function getCachedMusicUri(track, index = 0) {
  if (Platform.OS === "web") {
    return objectUrl(await getOfflineTrack(track, index));
  }

  const FileSystem = nativeFileSystem();
  const uri = `${FileSystem.cacheDirectory}shopp-music-${keyFor(track, index)}.mp3`;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? uri : null;
  } catch {
    return null;
  }
}

export async function saveMusicForOffline(track, remoteUri, index = 0) {
  if (!remoteUri) throw new Error("La pista no contiene una URL de audio válida.");

  if (Platform.OS === "web") {
    if (!isMusicIndexedDbAvailable()) {
      throw new Error("IndexedDB no está disponible en este navegador.");
    }
    const response = await fetch(remoteUri);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("El archivo descargado está vacío.");
    await saveWebTrack({ ...track, audioUrl: remoteUri }, blob, index);
    return { uri: objectUrl({ blob }), size: blob.size, offline: true };
  }

  const FileSystem = nativeFileSystem();
  const uri = `${FileSystem.cacheDirectory}shopp-music-${keyFor(track, index)}.mp3`;
  const result = await FileSystem.downloadAsync(remoteUri, uri);
  return { uri: result.uri, size: result.headers?.["Content-Length"] || null, offline: true };
}

export async function deleteMusicAlbumOffline(album) {
  if (Platform.OS === "web") return deleteWebAlbum(album);
  const FileSystem = nativeFileSystem();
  await Promise.all(
    (album?.tracks || []).map(async (track, index) => {
      const uri = `${FileSystem.cacheDirectory}shopp-music-${keyFor(track, index)}.mp3`;
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Cache cleanup is best effort.
      }
    }),
  );
}

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INDEX_KEY = "shopp_music_cache_index_v1";
const CACHE_DIRECTORY = `${FileSystem.cacheDirectory || ""}music/`;

async function readIndex() {
  try {
    const value = await AsyncStorage.getItem(INDEX_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

async function writeIndex(index) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function getPlayableTrackUri(trackId, remoteUri) {
  if (!remoteUri || Platform.OS === "web") return remoteUri;

  if (!FileSystem.cacheDirectory) return remoteUri;

  const directoryInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, {
      intermediates: true,
    });
  }

  const safeTrackId = encodeURIComponent(String(trackId));
  const localUri = `${CACHE_DIRECTORY}${safeTrackId}.mp3`;
  const fileInfo = await FileSystem.getInfoAsync(localUri);

  if (fileInfo.exists && Number(fileInfo.size) > 0) {
    const index = await readIndex();
    index[String(trackId)] = {
      localUri,
      lastAccessedAt: Date.now(),
    };
    await writeIndex(index);
    return localUri;
  }

  const download = await FileSystem.downloadAsync(remoteUri, localUri);
  if (!download?.uri) throw new Error("No se pudo guardar la pista en caché.");

  const index = await readIndex();
  index[String(trackId)] = {
    localUri: download.uri,
    lastAccessedAt: Date.now(),
  };
  await writeIndex(index);

  return download.uri;
}

export async function clearMusicCache() {
  if (Platform.OS === "web" || !FileSystem.cacheDirectory) return;

  const info = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (info.exists) {
    await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
  }

  await AsyncStorage.removeItem(INDEX_KEY);
}

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

const META_KEY = "shopp_shared_music_albums_v1";
const CACHE_NAME = "shopp-shared-music-v1";
const NATIVE_DIR = `${FileSystem.documentDirectory || ""}shared-music/`;

const readMeta = async () => {
  try {
    const raw =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(META_KEY)
        : await AsyncStorage.getItem(META_KEY);
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};

const writeMeta = async (value) => {
  try {
    if (Platform.OS === "web")
      globalThis.localStorage?.setItem(META_KEY, JSON.stringify(value));
    else await AsyncStorage.setItem(META_KEY, JSON.stringify(value));
  } catch {}
};

export function normalizeDriveDownloadUrl(url) {
  const value = String(url || "").trim();
  const match = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (match)
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  return value;
}

function isDriveFolderUrl(url) {
  return /drive\.google\.com\/drive\/folders\//i.test(String(url || ""));
}

function resolveUrl(baseUrl, filename) {
  const value = String(filename || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/drive\.google\.com\/uc\?/i.test(baseUrl)) {
    throw new Error(
      "En Google Drive, album.json debe incluir audioUrl y coverUrl directas para cada archivo.",
    );
  }
  return new URL(value, baseUrl).toString();
}

export async function readSharedAlbum(albumJsonUrl) {
  if (isDriveFolderUrl(albumJsonUrl)) {
    throw new Error(
      "Has pegado un enlace de carpeta de Google Drive. Pega el enlace directo al archivo album.json; por ejemplo: drive.google.com/file/d/ID/view.",
    );
  }
  const jsonUrl = normalizeDriveDownloadUrl(albumJsonUrl);
  if (!jsonUrl) throw new Error("Introduce el enlace de album.json.");
  let response;
  try {
    response = await fetch(jsonUrl);
  } catch {
    throw new Error(
      "No se pudo acceder a album.json. Comprueba que el archivo sea público y que el enlace sea directo al archivo, no a la carpeta.",
    );
  }
  if (!response.ok)
    throw new Error(`No se pudo leer album.json (${response.status}).`);
  let source;
  try {
    source = await response.json();
  } catch {
    throw new Error(
      "El enlace no devuelve un JSON válido. En Google Drive, comparte album.json como «Cualquier persona con el enlace» y pega el enlace del archivo.",
    );
  }
  if (
    !source?.title ||
    !Array.isArray(source.tracks) ||
    !source.tracks.length
  ) {
    throw new Error("album.json debe incluir title y una lista tracks.");
  }
  const baseUrl = jsonUrl.slice(0, jsonUrl.lastIndexOf("/") + 1);
  const id = `shared-${encodeURIComponent(jsonUrl)}`;
  return {
    _id: id,
    source: "google-drive",
    sourceUrl: jsonUrl,
    title: source.title,
    artist: source.artist || source.composer || "",
    coverUrl:
      source.coverUrl ||
      (source.cover ? resolveUrl(baseUrl, source.cover) : null),
    tracks: source.tracks.map((track, index) => ({
      _id: `${id}-track-${index + 1}`,
      trackNumber: Number(track.trackNumber) || index + 1,
      trackTitle: track.trackTitle || track.title || track.audioFilename,
      title: track.title || "",
      audioUrl: resolveUrl(baseUrl, track.audioUrl || track.audioFilename),
    })),
  };
}

async function getWebUri(url) {
  if (!globalThis.caches) return url;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) return URL.createObjectURL(await cached.blob());
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("No se pudo descargar un archivo de música.");
  await cache.put(url, response.clone());
  return URL.createObjectURL(await response.blob());
}

async function getNativeUri(track) {
  if (!FileSystem.documentDirectory) return track.audioUrl;
  const directoryInfo = await FileSystem.getInfoAsync(NATIVE_DIR);
  if (!directoryInfo.exists)
    await FileSystem.makeDirectoryAsync(NATIVE_DIR, { intermediates: true });
  const localUri = `${NATIVE_DIR}${encodeURIComponent(track._id)}.mp3`;
  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists || !info.size)
    await FileSystem.downloadAsync(track.audioUrl, localUri);
  return localUri;
}

export async function downloadSharedAlbum(album, onProgress) {
  const tracks = [];
  for (let index = 0; index < album.tracks.length; index += 1) {
    const track = album.tracks[index];
    const audioUrl =
      Platform.OS === "web"
        ? await getWebUri(track.audioUrl)
        : await getNativeUri(track);
    tracks.push({ ...track, audioUrl });
    onProgress?.(index + 1, album.tracks.length);
  }
  const coverUrl = album.coverUrl
    ? Platform.OS === "web"
      ? await getWebUri(album.coverUrl)
      : album.coverUrl
    : null;
  const saved = { ...album, coverUrl, tracks, downloadedAt: Date.now() };
  const all = await readMeta();
  all[album._id] = saved;
  await writeMeta(all);
  return saved;
}

export async function listSharedAlbums() {
  return Object.values(await readMeta()).sort(
    (a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0),
  );
}

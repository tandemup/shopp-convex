import {
  deleteMusicAlbumOffline,
  saveMusicForOffline,
  musicStoragePlatform,
} from "./musicPlatformStorage";
const SHARED_ALBUMS_KEY = "shopp.sharedMusic.albums.v2";

function driveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function normalizePublicUrl(value, kind = "file") {
  const text = String(value || "").trim();
  const id = driveFileId(text);
  if (id) {
    // Este endpoint evita, en la mayoría de los casos, la página HTML de
    // confirmación que Drive puede devolver a `uc?export=download`. Esa
    // página provoca "no supported source" en HTMLMediaElement/Expo Web.
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
  }
  return text;
}

// Convierte un identificador de Google Drive o un enlace compartido en
// una URL utilizable por la aplicación. Se exporta para la importación JSON.
export function driveDownloadUrl(value) {
  return normalizePublicUrl(value);
}

// Google Drive sirve `uc?export=download` como descarga (attachment). Para
// <Image> necesitamos una respuesta de imagen que el navegador pueda pintar.
export function driveImageUrl(value) {
  const id = driveFileId(value);
  return id
    ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200`
    : String(value || "").trim();
}

function validateAlbum(album) {
  if (!album || typeof album !== "object") {
    throw new Error("El enlace no contiene un objeto JSON válido.");
  }
  // Acepta tanto el formato plano como el formato organizado por secciones:
  // { album: {...}, cover: {...}, tracks: [...] }.
  const metadata =
    album.album && typeof album.album === "object" ? album.album : album;
  const cover =
    album.cover && typeof album.cover === "object" ? album.cover : album;
  const tracks = Array.isArray(album.tracks) ? album.tracks : metadata.tracks;

  if (!metadata.title || !Array.isArray(tracks)) {
    throw new Error("El JSON debe contener title y un array tracks.");
  }
  return {
    ...album,
    ...metadata,
    artist: metadata.artist || "Artista desconocido",
    coverUrl:
      driveImageUrl(
        // Admite cover.coverId como formato preferente.
        cover.coverId || cover.coverUrl || cover.url,
      ) || null,
    tracks: tracks.map((track, index) => ({
      ...track,
      // Algunos manifiestos agrupan los datos en track.audio.
      ...(track.audio && typeof track.audio === "object" ? track.audio : {}),
      title: track.title || `Pista ${index + 1}`,
      trackNumber: track.trackNumber || index + 1,
      audioUrl: normalizePublicUrl(
        track.audioId ||
          track.audioUrl ||
          track.audio?.audioId ||
          track.audio?.audioUrl ||
          track.url,
      ),
    })),
  };
}

export async function readSharedAlbum(input) {
  const sourceUrl = normalizePublicUrl(input, "json");
  if (!sourceUrl) throw new Error("Introduce el enlace de album.json.");
  if (/\/folders?\//i.test(sourceUrl)) {
    throw new Error(
      "Has introducido una carpeta. Necesitas el enlace del archivo album.json.",
    );
  }
  const response = await fetch(sourceUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `No se pudo leer album.json (HTTP ${response.status}). Comprueba que sea público.`,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (contentType.includes("text/html") || /^\s*</.test(text)) {
    throw new Error(
      "El enlace devuelve una página web, no el JSON. Usa el enlace directo al archivo.",
    );
  }
  let album;
  try {
    album = JSON.parse(text);
  } catch {
    throw new Error("album.json no contiene JSON válido.");
  }
  return { ...validateAlbum(album), sourceUrl };
}

export async function listSharedAlbums() {
  try {
    const raw = globalThis.localStorage?.getItem(SHARED_ALBUMS_KEY);
    const albums = raw ? JSON.parse(raw) : [];
    const seen = new Set();
    return albums.filter((album) => {
      const identity =
        album.sourceUrl ||
        String(album.title || "") +
          "|" +
          String(album.artist || "").toLowerCase();
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  } catch {
    return [];
  }
}

async function saveAlbums(albums) {
  globalThis.localStorage?.setItem(SHARED_ALBUMS_KEY, JSON.stringify(albums));
}

export async function downloadSharedAlbum(album, onProgress) {
  // Google Drive no permite que una página web lea sus respuestas mediante
  // fetch() (CORS), aunque el archivo sea público. En web conservamos la URL
  // remota para que el elemento <audio> la reproduzca directamente. La copia
  // offline requiere un proxy propio (Netlify/Cloudflare) o un servidor que
  // añada los encabezados CORS.
  const platform = musicStoragePlatform();
  const tracks = [];
  for (let index = 0; index < album.tracks.length; index += 1) {
    const track = album.tracks[index];
    if (!track.audioUrl)
      throw new Error(`La pista “${track.title}” no tiene audioUrl.`);
    try {
      const saved = await saveMusicForOffline(track, track.audioUrl, index);
      tracks.push({ ...track, offline: true, size: saved.size, platform });
    } catch (error) {
      if (platform === "web") {
        throw new Error(
          `No se pudo guardar “${track.title}” en IndexedDB. Comprueba CORS y que la URL devuelva audio. ${error?.message || ""}`.trim(),
        );
      }
      throw new Error(
        `No se pudo descargar “${track.title}”. Comprueba que el archivo sea público. ${error?.message || ""}`.trim(),
      );
    }
    onProgress?.(index + 1, album.tracks.length);
  }
  const saved = {
    ...album,
    tracks,
    _id: album._id || `shared-${Date.now()}`,
    downloadedAt: Date.now(),
  };
  const current = await listSharedAlbums();
  await saveAlbums([
    saved,
    ...current.filter(
      (item) => item._id !== saved._id && item.sourceUrl !== saved.sourceUrl,
    ),
  ]);
  return saved;
}

export async function deleteSharedAlbum(album) {
  if (!album) return;
  await deleteMusicAlbumOffline(album);
  const current = await listSharedAlbums();
  await saveAlbums(
    current.filter(
      (item) => item._id !== album._id && item.sourceUrl !== album.sourceUrl,
    ),
  );
}

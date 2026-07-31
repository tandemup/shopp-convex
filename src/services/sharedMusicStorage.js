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
  if (id && /drive\.google\.com/i.test(text)) {
    return kind === "json"
      ? `https://drive.google.com/uc?export=download&id=${id}`
      : `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return text;
}

function validateAlbum(album) {
  if (!album || typeof album !== "object") {
    throw new Error("El enlace no contiene un objeto JSON válido.");
  }
  if (!album.title || !Array.isArray(album.tracks)) {
    throw new Error("El JSON debe contener title y un array tracks.");
  }
  return {
    ...album,
    artist: album.artist || "Artista desconocido",
    tracks: album.tracks.map((track, index) => ({
      ...track,
      title: track.title || `Pista ${index + 1}`,
      trackNumber: track.trackNumber || index + 1,
      audioUrl: normalizePublicUrl(track.audioUrl || track.url),
    })),
    coverUrl: album.coverUrl ? normalizePublicUrl(album.coverUrl) : null,
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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveAlbums(albums) {
  globalThis.localStorage?.setItem(SHARED_ALBUMS_KEY, JSON.stringify(albums));
}

export async function downloadSharedAlbum(album, onProgress) {
  const tracks = [];
  for (let index = 0; index < album.tracks.length; index += 1) {
    const track = album.tracks[index];
    if (!track.audioUrl)
      throw new Error(`La pista “${track.title}” no tiene audioUrl.`);
    tracks.push(track);
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

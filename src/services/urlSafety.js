/**
 * Helpers para validar y normalizar enlaces de YouTube.
 *
 * Acepta, entre otros, estos formatos:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID?si=...
 * - https://youtu.be/VIDEO_ID
 */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION_REGEX = /[.,!?;:]+$/;

function toUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const rawValue = value.trim();
  const valueWithProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue}`;

  try {
    return new URL(valueWithProtocol);
  } catch {
    return null;
  }
}

/** Extrae URLs HTTP(S) de un texto y elimina la puntuación final. */
export function extractUrlsFromText(text) {
  if (typeof text !== "string" || !text.trim()) return [];

  return (
    text
      .match(URL_REGEX)
      ?.map((value) => value.replace(TRAILING_URL_PUNCTUATION_REGEX, ""))
      .filter(Boolean) || []
  );
}

/** Normaliza una URL segura HTTP(S); devuelve null si no es válida. */
export function normalizeUrl(value) {
  const url = toUrl(value);

  if (!url || !/^https?:$/.test(url.protocol) || !url.hostname) {
    return null;
  }

  return url.toString();
}

/** Devuelve el ID del vídeo si la URL es un enlace YouTube válido. */
export function getYouTubeVideoId(value) {
  const url = toUrl(value);
  if (!url || !/^https?:$/.test(url.protocol)) return null;

  const hostname = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(hostname)) return null;

  let videoId = null;

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0];
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else if (/^\/live\//i.test(url.pathname)) {
    videoId = url.pathname.split("/").filter(Boolean)[1];
  } else if (/^\/shorts\//i.test(url.pathname)) {
    videoId = url.pathname.split("/").filter(Boolean)[1];
  } else if (/^\/embed\//i.test(url.pathname)) {
    videoId = url.pathname.split("/").filter(Boolean)[1];
  }

  return videoId && VIDEO_ID_REGEX.test(videoId) ? videoId : null;
}

/** Indica si el valor es un enlace YouTube permitido por Shopp. */
export function isSafeYouTubeUrl(value) {
  return Boolean(getYouTubeVideoId(value));
}

/** Convierte cualquier formato aceptado a una URL reproducible estándar. */
export function normalizeYouTubeUrl(value) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

/**
 * Devuelve los datos necesarios para validación y reproducción.
 * Es útil para no extraer el ID dos veces en el componente.
 */
export function parseYouTubeUrl(value) {
  const videoId = getYouTubeVideoId(value);

  if (!videoId) {
    return { isValid: false, videoId: null, playableUrl: null };
  }

  return {
    isValid: true,
    videoId,
    playableUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export default {
  extractUrlsFromText,
  normalizeUrl,
  getYouTubeVideoId,
  isSafeYouTubeUrl,
  normalizeYouTubeUrl,
  parseYouTubeUrl,
};

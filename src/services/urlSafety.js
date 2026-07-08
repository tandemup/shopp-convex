// utils/urlSafety.js

export const URL_STATUS = {
  TRUSTED: "trusted",
  SAFE: "safe",
  VERIFIED: "verified",
  PENDING: "pending",
  UNKNOWN: "unknown",
  SUSPICIOUS: "suspicious",
  MALICIOUS: "malicious",
};

export const TRUSTED_DOMAINS = [
  "wikipedia.org",
  "google.com",
  "youtube.com",
  "youtu.be",
  "amazon.com",
  "amazon.es",
  "foxnews.com",
  "esdiario.com",
  "eldiario.es",
];

export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmed = rawUrl.trim();

  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    return `https://${trimmed}`;
  } catch {
    return null;
  }
}

export function extractUrlsFromText(text) {
  if (!text || typeof text !== "string") return [];

  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const matches = text.match(regex) || [];

  return matches.map((url) => normalizeUrl(url)).filter(Boolean);
}

export function getHostnameFromUrl(rawUrl) {
  try {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized) return null;

    const parsed = new URL(normalized);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isTrustedDomain(rawUrl) {
  const hostname = getHostnameFromUrl(rawUrl);

  if (!hostname) return false;

  return TRUSTED_DOMAINS.some((domain) => {
    const cleanDomain = domain.toLowerCase();

    return hostname === cleanDomain || hostname.endsWith(`.${cleanDomain}`);
  });
}

export function getInitialUrlStatus(rawUrl) {
  if (!rawUrl) return URL_STATUS.UNKNOWN;

  if (isTrustedDomain(rawUrl)) {
    return URL_STATUS.TRUSTED;
  }

  return URL_STATUS.PENDING;
}

export function canOpenUrlByStatus(status) {
  return (
    status === URL_STATUS.TRUSTED ||
    status === URL_STATUS.SAFE ||
    status === URL_STATUS.VERIFIED
  );
}

export function getUrlBlockedReason(status) {
  if (status === URL_STATUS.PENDING) {
    return "Este enlace todavía está pendiente de comprobar. No se puede abrir hasta que sea verificado.";
  }

  if (status === URL_STATUS.SUSPICIOUS) {
    return "Este enlace ha sido marcado como sospechoso y no se puede abrir.";
  }

  if (status === URL_STATUS.MALICIOUS) {
    return "Este enlace ha sido bloqueado por seguridad.";
  }

  if (status === URL_STATUS.UNKNOWN) {
    return "Este enlace todavía no tiene un estado de seguridad conocido.";
  }

  return "Este enlace no se puede abrir porque no ha sido verificado.";
}

export function getUrlStatusLabel(status) {
  if (status === URL_STATUS.TRUSTED) return "Dominio de confianza";
  if (status === URL_STATUS.SAFE) return "Enlace seguro";
  if (status === URL_STATUS.VERIFIED) return "Enlace verificado";
  if (status === URL_STATUS.PENDING) return "Enlace pendiente de comprobar";
  if (status === URL_STATUS.SUSPICIOUS) return "Enlace sospechoso";
  if (status === URL_STATUS.MALICIOUS) return "Enlace bloqueado";
  return "Enlace no verificado";
}

export function getUrlStatusTone(status) {
  if (
    status === URL_STATUS.TRUSTED ||
    status === URL_STATUS.SAFE ||
    status === URL_STATUS.VERIFIED
  ) {
    return "safe";
  }

  if (status === URL_STATUS.PENDING || status === URL_STATUS.UNKNOWN) {
    return "pending";
  }

  if (status === URL_STATUS.SUSPICIOUS) {
    return "suspicious";
  }

  if (status === URL_STATUS.MALICIOUS) {
    return "malicious";
  }

  return "pending";
}

export function buildUrlSafetyRecords(text) {
  const urls = extractUrlsFromText(text);

  return urls.map((url) => ({
    url,
    status: getInitialUrlStatus(url),
    checkedAt: null,
  }));
}

export function getUrlStatusFromMessage(message, url) {
  if (!message || !url) return URL_STATUS.UNKNOWN;

  const records = message.urlSafety || message.urls || message.links || [];

  const found = records.find((item) => {
    return item?.url === url;
  });

  if (!found) {
    return getInitialUrlStatus(url);
  }

  return found.status || URL_STATUS.UNKNOWN;
}

export function containsOnlySafeOpenableUrls(message) {
  const text = message?.text || message?.body || "";
  const urls = extractUrlsFromText(text);

  if (urls.length === 0) return true;

  return urls.every((url) => {
    const status = getUrlStatusFromMessage(message, url);
    return canOpenUrlByStatus(status);
  });
}

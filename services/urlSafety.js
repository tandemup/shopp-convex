export const URL_STATUS = {
  PENDING: "pending",
  SAFE: "safe",
  SUSPICIOUS: "suspicious",
  MALICIOUS: "malicious",
};

export const MESSAGE_STATUS = {
  CLEAN: "clean",
  BLOCKED: "blocked",
  WARNING: "warning",
  PENDING_URL_CHECK: "pending_url_check",
};

const TRUSTED_DOMAINS = [
  "example.com",
  "wikipedia.org",
  "www.wikipedia.org",
  "thebeatles.com",
  "https://es.wikipedia.org",
];

const BLOCKED_DOMAINS = [
  "grabify.link",
  "iplogger.org",
  "2no.co",
  "blasze.com",
];

const SUSPICIOUS_SHORTENERS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
];

const TRAILING_URL_CHARS_REGEX = /[.,!?;:)\]}]+$/;

export function extractUrlsFromText(text = "") {
  const regex = /https?:\/\/[^\s<>"']+/gi;
  const matches = String(text).match(regex) || [];

  return [...new Set(matches.map(cleanUrlCandidate).filter(Boolean))];
}

function cleanUrlCandidate(value = "") {
  return String(value).trim().replace(TRAILING_URL_CHARS_REGEX, "");
}

function isIpAddress(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isValidIpv4(hostname) {
  if (!isIpAddress(hostname)) return false;

  return hostname.split(".").every((part) => {
    const number = Number(part);
    return Number.isInteger(number) && number >= 0 && number <= 255;
  });
}

function isPrivateOrLocalHost(hostname) {
  const h = String(hostname || "").toLowerCase();

  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1"
  ) {
    return true;
  }

  if (!isValidIpv4(h)) return false;

  const parts = h.split(".").map(Number);
  const [a, b] = parts;

  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function domainMatches(hostname, domainList) {
  const h = String(hostname || "").toLowerCase();

  return domainList.some((domain) => h === domain || h.endsWith(`.${domain}`));
}

function getUrlRiskScore(url) {
  let score = 0;
  const hostname = url.hostname.toLowerCase();

  if (url.protocol !== "https:") score += 2;

  if (isValidIpv4(hostname)) score += 3;

  if (hostname.includes("xn--")) {
    // Posible dominio punycode / homógrafo.
    score += 2;
  }

  if (domainMatches(hostname, SUSPICIOUS_SHORTENERS)) {
    score += 2;
  }

  if (url.pathname.length > 120) score += 1;

  if (url.search.length > 150) score += 1;

  if (url.href.includes("@")) score += 2;

  if ((hostname.match(/-/g) || []).length > 4) score += 1;

  if (hostname.split(".").length > 4) score += 1;

  return score;
}

export function analyzeUrl(rawUrl) {
  const originalUrl = cleanUrlCandidate(rawUrl);

  try {
    const parsed = new URL(originalUrl);

    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (!["http:", "https:"].includes(protocol)) {
      return {
        originalUrl,
        normalizedUrl: null,
        hostname: null,
        status: URL_STATUS.MALICIOUS,
        riskScore: 10,
        reason: "Protocolo no permitido",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    if (!hostname) {
      return {
        originalUrl,
        normalizedUrl: null,
        hostname: null,
        status: URL_STATUS.MALICIOUS,
        riskScore: 10,
        reason: "Hostname inválido",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    if (isIpAddress(hostname) && !isValidIpv4(hostname)) {
      return {
        originalUrl,
        normalizedUrl: parsed.toString(),
        hostname,
        status: URL_STATUS.MALICIOUS,
        riskScore: 10,
        reason: "Dirección IP inválida",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    if (isPrivateOrLocalHost(hostname)) {
      return {
        originalUrl,
        normalizedUrl: parsed.toString(),
        hostname,
        status: URL_STATUS.MALICIOUS,
        riskScore: 10,
        reason: "Destino local o privado no permitido",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    if (domainMatches(hostname, BLOCKED_DOMAINS)) {
      return {
        originalUrl,
        normalizedUrl: parsed.toString(),
        hostname,
        status: URL_STATUS.MALICIOUS,
        riskScore: 10,
        reason: "Dominio bloqueado",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    if (domainMatches(hostname, TRUSTED_DOMAINS)) {
      return {
        originalUrl,
        normalizedUrl: parsed.toString(),
        hostname,
        status: URL_STATUS.SAFE,
        riskScore: 0,
        reason: "Dominio de confianza",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    const riskScore = getUrlRiskScore(parsed);

    if (riskScore >= 5) {
      return {
        originalUrl,
        normalizedUrl: parsed.toString(),
        hostname,
        status: URL_STATUS.SUSPICIOUS,
        riskScore,
        reason: "URL sospechosa por heurística local",
        provider: "local",
        checkedAt: Date.now(),
      };
    }

    return {
      originalUrl,
      normalizedUrl: parsed.toString(),
      hostname,
      status: URL_STATUS.PENDING,
      riskScore,
      reason: "Pendiente de comprobación externa",
      provider: "local",
      checkedAt: Date.now(),
    };
  } catch {
    return {
      originalUrl,
      normalizedUrl: null,
      hostname: null,
      status: URL_STATUS.MALICIOUS,
      riskScore: 10,
      reason: "URL inválida",
      provider: "local",
      checkedAt: Date.now(),
    };
  }
}

export function analyzeMessageInput(text = "") {
  const cleanText = String(text || "").trim();
  const urls = extractUrlsFromText(cleanText);
  const analyzedUrls = urls.map(analyzeUrl);

  const hasMaliciousUrl = analyzedUrls.some(
    (item) => item.status === URL_STATUS.MALICIOUS,
  );

  const hasSuspiciousUrl = analyzedUrls.some(
    (item) => item.status === URL_STATUS.SUSPICIOUS,
  );

  let messageStatus = MESSAGE_STATUS.CLEAN;

  if (hasMaliciousUrl) {
    messageStatus = MESSAGE_STATUS.BLOCKED;
  } else if (hasSuspiciousUrl) {
    messageStatus = MESSAGE_STATUS.WARNING;
  } else if (analyzedUrls.length > 0) {
    messageStatus = MESSAGE_STATUS.PENDING_URL_CHECK;
  }

  return {
    text: cleanText,
    urls: analyzedUrls,
    messageStatus,
    canPost: !hasMaliciousUrl,
    checkedLocallyAt: Date.now(),
  };
}

export function getUrlStatusLabel(status) {
  switch (status) {
    case URL_STATUS.SAFE:
      return "Enlace verificado";

    case URL_STATUS.PENDING:
      return "Enlace pendiente de comprobar";

    case URL_STATUS.SUSPICIOUS:
      return "Enlace sospechoso";

    case URL_STATUS.MALICIOUS:
      return "Enlace bloqueado";

    default:
      return "Enlace";
  }
}

export function getUrlStatusFromMessage(url, messageUrls = []) {
  const normalizedCandidate = cleanUrlCandidate(url);

  const found = messageUrls.find((item) => {
    return (
      item.originalUrl === normalizedCandidate ||
      item.normalizedUrl === normalizedCandidate
    );
  });

  return found || null;
}

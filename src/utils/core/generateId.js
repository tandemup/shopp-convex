// utils/generateId.js

// INTENTO 1 → nanoid/non-secure (ideal para RN/Expo)
let nanoidFunc = null;
try {
  const { nanoid } = require("nanoid/non-secure");
  nanoidFunc = nanoid;
} catch (e) {
  // no pasa nada, seguimos probando
}

// INTENTO 2 → uuid (si está instalado y funcionando)
let uuidFunc = null;
try {
  const { v4: uuidv4 } = require("uuid");
  uuidFunc = uuidv4;
} catch (e) {
  // tampoco pasa nada
}

// INTENTO 3 → Web Crypto API (Expo SDK 48+)
const cryptoUUID =
  typeof global.crypto?.randomUUID === "function"
    ? () => global.crypto.randomUUID()
    : null;

// INTENTO 4 → fallback manual (siempre funciona)
const fallback = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

/**
 * generateId()
 * Genera un ID compatible con:
 * - iPhone / Expo Go (sin crypto)
 * - Android
 * - Web
 * - React Native puro
 * Nunca devuelve undefined.
 */
export function generateId() {
  try {
    if (nanoidFunc) return nanoidFunc();
  } catch (_) {}

  try {
    if (uuidFunc) {
      const id = uuidFunc();
      if (typeof id === "string" && id.length > 0) return id;
    }
  } catch (_) {}

  try {
    if (cryptoUUID) return cryptoUUID();
  } catch (_) {}

  // Fallback garantizado
  return fallback();
}

export function generateIdAlt(length = 8) {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 2 + length)
  ).slice(0, length);
}

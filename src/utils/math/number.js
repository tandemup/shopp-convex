// utils/number.js
/**
 * Normaliza texto numérico: convierte "," en ".", elimina caracteres no válidos
 * y evita múltiples puntos decimales.
 */
export const normalizeReal = (text = "") => {
  if (typeof text !== "string") text = String(text ?? "");
  let t = text.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parts = t.split(".");
  if (parts.length > 2) t = parts[0] + "." + parts.slice(1).join("");
  return t;
};

/**
 * Convierte texto normalizado a número flotante seguro.
 */
export const parseReal = (text, fallback = 0) => {
  const n = parseFloat(normalizeReal(text));
  return isNaN(n) ? fallback : n;
};

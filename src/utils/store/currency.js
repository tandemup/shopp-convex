// utils/store/currency.js
import { DEFAULT_CURRENCY } from "@/src/constants/currency";

/**
 * Normaliza símbolos comunes a código ISO
 */
export function normalizeCurrency(currency) {
  if (!currency) return DEFAULT_CURRENCY.code;

  if (currency === "€") return "EUR";
  if (currency === "$") return "USD";
  if (currency === "£") return "GBP";

  return currency;
}

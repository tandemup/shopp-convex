import { normalizePromotion, validatePromotion } from "./PricingEngine";

function toNumber(value) {
  return Number(String(value).replace(",", "."));
}

function hasDecimals(value) {
  const n = toNumber(value);
  return !Number.isInteger(n);
}

export function validatePricing({ qty, unit, unitPrice, promo }) {
  const errors = [];

  const q = Number(String(qty).replace(",", "."));
  const price = Number(String(unitPrice).replace(",", "."));

  const unitPromoValidation = validatePromotionUnit(promo, unit);

  if (!unitPromoValidation.valid) {
    errors.push(unitPromoValidation.message);
  }

  // 1. Cantidad válida
  if (!q || q <= 0) {
    errors.push("Cantidad debe ser mayor que 0");
  }

  // 2. Enteros para unidades
  if (unit === "u" && !Number.isInteger(q)) {
    errors.push("Solo enteros para unidades (u)");
  }

  // 3. Precio válido
  if (!price || price <= 0) {
    errors.push("Precio unitario inválido");
  }

  // 4. Promoción
  const promoValidation = validatePromotion(promo, q, price);

  if (!promoValidation.valid) {
    errors.push(promoValidation.message || "Oferta no válida");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePromotionUnit(promo, unit) {
  if (!promo || promo.type === "none") {
    return { valid: true };
  }

  if (promo.type === "multi" && unit !== "u") {
    return {
      valid: false,
      message: "Ofertas tipo 2x1 / 3x2 solo válidas para unidades (u)",
    };
  }

  return { valid: true };
}

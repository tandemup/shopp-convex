// utils/core/defaultItem.js

export const defaultPriceInfo = () => ({
  currency: "EUR",
  promo: "none",
  promoLabel: "",
  qty: 1,
  savings: 0,
  subtotal: 0,
  summary: "",
  total: 0,
  unit: "u",
  unitPrice: 0,
  warning: null,
  valid: true,
});

export const defaultItem = {
  id: "",
  name: "",
  brand: "",
  barcode: "",
  image: null,
  checked: true,

  categoryId: null,
  categoryName: null,
  subcategoryId: null,
  subcategoryName: null,

  priceInfo: defaultPriceInfo(),
};

const normalizePromoText = (value) => {
  if (typeof value !== "string") return "none";
  const v = value.trim().toLowerCase();
  if (!v || v === "none") return "none";
  return value;
};

export const normalizePriceInfo = (priceInfo) => {
  const base = defaultPriceInfo();

  if (!priceInfo || typeof priceInfo !== "object") {
    return base;
  }

  return {
    ...base,
    ...priceInfo,

    currency:
      typeof priceInfo.currency === "string" && priceInfo.currency.trim()
        ? priceInfo.currency
        : base.currency,

    qty: Number(priceInfo.qty ?? base.qty),
    unit: priceInfo.unit ?? base.unit,
    unitPrice: Number(priceInfo.unitPrice ?? base.unitPrice),
    subtotal: Number(priceInfo.subtotal ?? base.subtotal),
    total: Number(priceInfo.total ?? base.total),
    savings: Number(priceInfo.savings ?? base.savings),

    promo: normalizePromoText(priceInfo.promo),
    promoLabel:
      typeof priceInfo.promoLabel === "string"
        ? priceInfo.promoLabel
        : base.promoLabel,

    summary:
      typeof priceInfo.summary === "string" ? priceInfo.summary : base.summary,

    warning: priceInfo.warning ?? base.warning,
    valid: typeof priceInfo.valid === "boolean" ? priceInfo.valid : base.valid,
  };
};

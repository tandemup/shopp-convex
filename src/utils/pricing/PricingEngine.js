// utils/pricing/PricingEngine.js

export const NO_PROMO = "none";

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toSafeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const PROMOTIONS = {
  [NO_PROMO]: {
    id: "none",
    label: "Sin oferta",
    type: "none",
    hint: "sin promoción",
  },

  "2x1": {
    id: "2x1",
    label: "2x1",
    type: "multi",
    buy: 2,
    pay: 1,
    hint: "Lleve 2, pague 1",
  },

  "3x2": {
    id: "3x2",
    label: "3x2",
    type: "multi",
    buy: 3,
    pay: 2,
    hint: "Lleve 3, pague 2",
  },

  discount5: {
    id: "discount5",
    label: "-5€",
    type: "discount",
    value: 5,
    hint: "Descuento directo de 5€",
  },

  percent10: {
    id: "percent10",
    label: "-10%",
    type: "percent",
    value: 10,
    hint: "Descuento 10%",
  },

  percent50: {
    id: "percent50",
    label: "-50%",
    type: "percent",
    value: 50,
    hint: "Descuento 50%",
  },
  percent75: {
    id: "percent75",
    label: "-75%",
    type: "percent",
    value: 75,
    hint: "Descuento 75%",
  },
};

export function toPromotion(promoKey) {
  const entry = PROMOTIONS[promoKey];

  if (!entry) return { type: "none" };

  switch (entry.type) {
    case "multi":
      return {
        type: "multi",
        buy: Number(entry.buy ?? 0),
        pay: Number(entry.pay ?? 0),
      };

    case "percent":
      return {
        type: "percent",
        value: Number(entry.value ?? 0),
      };

    case "discount":
      return {
        type: "discount",
        value: Number(entry.value ?? 0),
      };

    case "none":
    default:
      return { type: "none" };
  }
}

export function fromPromotion(promo) {
  if (!promo || promo.type === "none") return "none";

  switch (promo.type) {
    case "multi":
      return `${promo.buy}x${promo.pay}`;
    case "percent":
      return `percent${promo.value}`;
    case "discount":
      return `discount${promo.value}`;
    default:
      return "none";
  }
}

export function getPromotionLabel(promo) {
  if (!promo || promo.type === "none") return "";

  switch (promo.type) {
    case "multi":
      return `${promo.buy}x${promo.pay}`;
    case "percent":
      return `-${promo.value}%`;
    case "discount":
      return `-${promo.value}€`;
    default:
      return "";
  }
}

export function normalizePromotion(promo) {
  if (!promo) return { type: "none" };

  switch (promo.type) {
    case "2x1":
      return { type: "multi", buy: 2, pay: 1 };

    case "3x2":
      return { type: "multi", buy: 3, pay: 2 };

    case "multi":
      return {
        type: "multi",
        buy: Number(promo.buy ?? 0),
        pay: Number(promo.pay ?? 0),
      };

    case "percent":
      return {
        type: "percent",
        value: Number(promo.value ?? 0),
      };

    case "discount":
      return {
        type: "discount",
        value: Number(promo.value ?? 0),
      };

    case "none":
    default:
      return { type: "none" };
  }
}

export function hasPromotion(promoKey) {
  return !!promoKey && promoKey !== "none";
}

export function validatePromotion(promo, quantity, unitPrice) {
  const p = normalizePromotion(promo);
  const qty = Math.max(0, toSafeNumber(quantity));
  const price = Math.max(0, toSafeNumber(unitPrice));

  switch (p.type) {
    case "none":
      return { valid: true };

    case "multi":
      if (p.buy <= 0 || p.pay <= 0 || p.pay > p.buy) {
        return { valid: false, message: "Oferta inválida" };
      }

      return qty >= p.buy
        ? { valid: true }
        : { valid: false, message: `Mínimo ${p.buy} unidades` };

    case "percent":
      if (p.value <= 0 || p.value > 100) {
        return { valid: false, message: "Descuento inválido" };
      }

      return price > 0
        ? { valid: true }
        : { valid: false, message: "Precio inválido" };

    case "discount": {
      const baseTotal = qty * price;

      if (p.value <= 0) {
        return { valid: false, message: "Descuento inválido" };
      }

      if (p.value > baseTotal) {
        return {
          valid: false,
          message: "El descuento supera el subtotal",
        };
      }

      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

function applyPromotion(promo, quantity, unitPrice) {
  const base = quantity * unitPrice;

  switch (promo.type) {
    case "multi": {
      const groups = Math.floor(quantity / promo.buy);
      const remainder = quantity % promo.buy;
      const payableUnits = groups * promo.pay + remainder;
      return payableUnits * unitPrice;
    }

    case "percent":
      return base * (1 - promo.value / 100);

    case "discount":
      return Math.max(0, base - promo.value);

    case "none":
    default:
      return base;
  }
}

function buildSummary({ qty, unit, unitPrice, currency, total }) {
  return `${qty} ${unit} × ${unitPrice.toFixed(2)} ${currency} → ${total.toFixed(
    2,
  )} ${currency}`;
}

export class PricingEngine {
  static calculate({
    qty = 1,
    unit = "u",
    unitPrice = 0,
    currency = "EUR",
    promo = "none",
  }) {
    const quantity = Math.max(0, toSafeNumber(qty, 1));
    const price = Math.max(0, toSafeNumber(unitPrice, 0));
    const normalizedPromo = normalizePromotion(toPromotion(promo));

    const subtotal = round2(quantity * price);
    const validation = validatePromotion(normalizedPromo, quantity, price);

    if (!validation.valid) {
      return {
        qty: quantity,
        unit,
        unitPrice: price,
        currency,

        promo,
        promoLabel: getPromotionLabel(normalizedPromo),

        subtotal,
        total: subtotal,
        savings: 0,

        summary: buildSummary({
          qty: quantity,
          unit,
          unitPrice: price,
          currency,
          total: subtotal,
        }),
        warning: validation.message,
        valid: false,
      };
    }

    const total = round2(applyPromotion(normalizedPromo, quantity, price));
    const savings = round2(subtotal - total);

    return {
      qty: quantity,
      unit,
      unitPrice: price,
      currency,

      promo,
      promoLabel: getPromotionLabel(normalizedPromo),

      subtotal,
      total,
      savings,

      summary: buildSummary({
        qty: quantity,
        unit,
        unitPrice: price,
        currency,
        total,
      }),
      warning: null,
      valid: true,
    };
  }
}

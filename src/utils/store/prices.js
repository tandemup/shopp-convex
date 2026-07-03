import { CURRENCIES, DEFAULT_CURRENCY } from "@/src/constants/currency";
import { normalizeCurrency } from "./currency";

import { joinText } from "./text";

export function formatCurrency(
  value,
  currency = DEFAULT_CURRENCY.code,
  locale,
) {
  const amount = Number(value) || 0;

  const currencyConfig = CURRENCIES[currency] ?? DEFAULT_CURRENCY;
  const resolvedLocale = locale ?? currencyConfig.locale;

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function priceText(value, unitFallback) {
  if (!value) return "";

  // priceInfo moderno
  if (typeof value === "object") {
    const { unitPrice, total, qty, unit, currency } = value;

    let price =
      typeof unitPrice === "number"
        ? unitPrice
        : typeof total === "number" && qty > 0
          ? total / qty
          : typeof total === "number"
            ? total
            : null;

    if (price == null) return "";

    return joinText(
      formatCurrency(price, currency),
      (unit ?? unitFallback) && ` / ${unit ?? unitFallback}`,
    );
  }

  // legacy
  return joinText(formatCurrency(value), unitFallback && ` / ${unitFallback}`);
}

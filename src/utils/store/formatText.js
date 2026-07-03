import { joinText } from "./text";

export function qtyText(qty, unit) {
  return joinText(qty, " ", unit);
}

export function unitPriceText(price, unit) {
  if (price == null) return "";
  return joinText(price.toFixed(2), " € / ", unit);
}

export function totalText(value) {
  return joinText(value.toFixed(2), " €");
}

export function headerMetaText(date, store) {
  return store ? joinText(date, " • ", store) : date ?? "";
}

export function dateStoreText(date, store) {
  const d = new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return store ? joinText(d, " · ", store) : d;
}
export function purchaseMetaText(frequency, timestamp) {
  if (!frequency && !timestamp) return "";

  const parts = [];

  if (frequency > 0) {
    parts.push(frequency === 1 ? "1 compra" : `${frequency} compras`);
  }

  if (timestamp) {
    const date = new Date(timestamp);
    parts.push(date.toLocaleDateString("es-ES"));
  }

  return parts.join(" · ");
}

export function normalizeBarcode(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isSupportedRetailBarcode(value) {
  const barcode = normalizeBarcode(value);
  return barcode.length >= 8 && barcode.length <= 14;
}

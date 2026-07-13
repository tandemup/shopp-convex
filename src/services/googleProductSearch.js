import * as Linking from "expo-linking";

function normalizeBarcode(value) {
  return String(value || "").trim();
}

export function getGoogleProductSearchUrl(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);

  const query = [`"${normalizedBarcode}"`, "producto", "EAN", "marca"].join(
    " ",
  );

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function getGoogleShoppingSearchUrl(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);

  const query = `"${normalizedBarcode}"`;

  return (
    "https://www.google.com/search" + `?tbm=shop&q=${encodeURIComponent(query)}`
  );
}

export async function openGoogleProductSearch(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) {
    throw new Error("No hay código de barras para buscar.");
  }

  const url = getGoogleProductSearchUrl(normalizedBarcode);
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    throw new Error("No se puede abrir Google en este dispositivo.");
  }

  await Linking.openURL(url);
}

export async function openGoogleShoppingSearch(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) {
    throw new Error("No hay código de barras para buscar.");
  }

  const url = getGoogleShoppingSearchUrl(normalizedBarcode);
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    throw new Error("No se puede abrir Google Shopping.");
  }

  await Linking.openURL(url);
}

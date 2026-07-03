// utils/scannerZoomStorage.js

import AsyncStorage from "@react-native-async-storage/async-storage";

const SCANNER_ZOOM_STORAGE_KEY = "@shopp/scanner-camera-zoom";

export const DEFAULT_SCANNER_ZOOM = 0.15;
export const MIN_SCANNER_ZOOM = 0;
export const MAX_SCANNER_ZOOM = 0.6;
export const SCANNER_ZOOM_STEP = 0.05;

export function normalizeScannerZoom(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SCANNER_ZOOM;
  }

  return Math.min(MAX_SCANNER_ZOOM, Math.max(MIN_SCANNER_ZOOM, numericValue));
}

export async function loadScannerZoom() {
  try {
    const storedValue = await AsyncStorage.getItem(SCANNER_ZOOM_STORAGE_KEY);

    if (storedValue === null) {
      return DEFAULT_SCANNER_ZOOM;
    }

    return normalizeScannerZoom(storedValue);
  } catch (error) {
    console.warn("No se pudo recuperar el zoom del escáner:", error);

    return DEFAULT_SCANNER_ZOOM;
  }
}

export async function saveScannerZoom(value) {
  const normalizedValue = normalizeScannerZoom(value);

  try {
    await AsyncStorage.setItem(
      SCANNER_ZOOM_STORAGE_KEY,
      String(normalizedValue),
    );
  } catch (error) {
    console.warn("No se pudo guardar el zoom del escáner:", error);
  }

  return normalizedValue;
}

export async function resetScannerZoom() {
  return saveScannerZoom(DEFAULT_SCANNER_ZOOM);
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const SCANNER_ZOOM_STORAGE_KEY = "@shopp/scanner-camera-zoom";

export const SCANNER_ZOOM_VALUES = [0, 0.15, 0.3, 0.45];
export const SCANNER_ZOOM_LABELS = ["1x", "1.2x", "1.5x", "2x"];

export const DEFAULT_SCANNER_ZOOM = 0.15;
export const MIN_SCANNER_ZOOM = SCANNER_ZOOM_VALUES[0];
export const MAX_SCANNER_ZOOM =
  SCANNER_ZOOM_VALUES[SCANNER_ZOOM_VALUES.length - 1];

export function normalizeScannerZoom(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SCANNER_ZOOM;
  }

  return SCANNER_ZOOM_VALUES.reduce((closest, candidate) => {
    return Math.abs(candidate - numericValue) < Math.abs(closest - numericValue)
      ? candidate
      : closest;
  }, DEFAULT_SCANNER_ZOOM);
}

export function getScannerZoomIndex(value) {
  const normalized = normalizeScannerZoom(value);
  const index = SCANNER_ZOOM_VALUES.indexOf(normalized);
  return index >= 0 ? index : 1;
}

export function getScannerZoomLabel(value) {
  return SCANNER_ZOOM_LABELS[getScannerZoomIndex(value)];
}

export function getNextScannerZoom(value) {
  const currentIndex = getScannerZoomIndex(value);
  const nextIndex = (currentIndex + 1) % SCANNER_ZOOM_VALUES.length;
  return SCANNER_ZOOM_VALUES[nextIndex];
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

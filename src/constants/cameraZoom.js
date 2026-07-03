/**
 * Configuración de zoom para cámara (expo-camera)
 * Valores normalizados: 0 → 1
 */

/* 🔍 Scanner general (ScannerTab) */
export const SCANNER_ZOOM = {
  levels: [0, 0.25, 0.5],
  labels: ["1x", "1.5x", "2x"],
};

/* 🧾 Escaneo puntual (Item / EAN) */
export const EAN_ZOOM = {
  levels1: [0, 0.4, 0.7],
  labels1: ["1x", "2x", "3x"],
  levels: [0, 0.25, 0.5],
  labels: ["1x", "1.5x", "2x"],
};

/* 🔧 Helper seguro */
export function getZoomValue(zoomConfig, index) {
  return zoomConfig.levels[index] ?? zoomConfig.levels[0];
}

// components/features/scanner/ScannerOverlay.web.js

/*
 * En web queremos reutilizar exactamente el mismo overlay visual
 * que se usa en Expo-Go / iOS / Android.
 *
 * Importante:
 * - Este archivo existe porque React Native Web resuelve primero
 *   ScannerOverlay.web.js cuando alguien importa "./ScannerOverlay".
 * - Si aquí duplicamos estilos, volvemos a tener dos overlays distintos.
 * - Por eso delegamos directamente en ScannerOverlay.js.
 */

export { default } from "./ScannerOverlay.js";

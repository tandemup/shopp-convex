// components/features/scanner/BarcodeScannerView.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import UnifiedBarcodeScanner from "./UnifiedBarcodeScanner";
import { DEFAULT_BARCODE_SETTINGS } from "@/constants/barcodeFormats";
import { getBarcodeSettings } from "@/src/storage/barcodeSettingsStorage";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function normalizeBarcode(code) {
  const clean = String(code || "").trim();

  /*
   * No eliminamos caracteres arbitrarios.
   *
   * Un texto como PRODUCT-1234567890123 no debe
   * convertirse silenciosamente en 1234567890123.
   */
  if (!/^\d+$/.test(clean)) {
    return null;
  }

  /*
   * EAN-8, UPC-A y EAN-13.
   */
  if (clean.length === 8 || clean.length === 12 || clean.length === 13) {
    return clean;
  }

  return null;
}

/* -------------------------------------------------
   Component
-------------------------------------------------- */

export default function BarcodeScannerView({
  onDetected,
  onClose,

  continuous = true,
  duplicateCooldownMs = 1500,

  showControls = true,

  barcodeTypes = null,
}) {
  const isFocused = useIsFocused();

  const handledRef = useRef(false);
  const lastCodeRef = useRef(null);
  const lastTimeRef = useRef(0);

  /*
   * Conserva siempre el callback más reciente.
   *
   * No incluimos onDetected en las dependencias de
   * handleDetected para evitar reiniciar
   * innecesariamente la cámara web cuando el
   * componente padre vuelve a renderizarse.
   */
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const [barcodeSettings, setBarcodeSettingsState] = useState(
    DEFAULT_BARCODE_SETTINGS,
  );

  /*
   * Evita arrancar inicialmente el lector con la
   * configuración por defecto y reiniciarlo unos
   * milisegundos después con la configuración guardada.
   */
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  /* -------------------------------------------------
     Load settings
  -------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setSettingsLoaded(false);

      try {
        const data = await getBarcodeSettings();

        if (!mounted) {
          return;
        }

        setBarcodeSettingsState(data || DEFAULT_BARCODE_SETTINGS);

        setSettingsLoaded(true);
      } catch (error) {
        console.log("Error loading barcode settings in scanner:", error);

        if (!mounted) {
          return;
        }

        setBarcodeSettingsState(DEFAULT_BARCODE_SETTINGS);

        setSettingsLoaded(true);
      }
    }

    if (isFocused) {
      loadSettings();
    }

    return () => {
      mounted = false;
    };
  }, [isFocused]);

  /* -------------------------------------------------
     Enabled formats
  -------------------------------------------------- */

  const enabledBarcodeTypes = useMemo(() => {
    const formats =
      barcodeSettings?.formats ?? DEFAULT_BARCODE_SETTINGS.formats;

    const enabled = Object.entries(formats)
      .filter(([, enabledValue]) => {
        return Boolean(enabledValue);
      })
      .map(([formatId]) => {
        return formatId;
      });

    if (enabled.length > 0) {
      return enabled;
    }

    return Object.entries(DEFAULT_BARCODE_SETTINGS.formats)
      .filter(([, enabledValue]) => {
        return Boolean(enabledValue);
      })
      .map(([formatId]) => {
        return formatId;
      });
  }, [barcodeSettings]);

  const effectiveBarcodeTypes = useMemo(() => {
    if (Array.isArray(barcodeTypes) && barcodeTypes.length > 0) {
      return barcodeTypes;
    }

    return enabledBarcodeTypes;
  }, [barcodeTypes, enabledBarcodeTypes]);

  /* -------------------------------------------------
     Duplicate protection
  -------------------------------------------------- */

  const isDuplicateTooSoon = useCallback(
    (code) => {
      const now = Date.now();

      const sameCode = lastCodeRef.current === code;

      const tooSoon = now - lastTimeRef.current < duplicateCooldownMs;

      if (sameCode && tooSoon) {
        return true;
      }

      lastCodeRef.current = code;
      lastTimeRef.current = now;

      return false;
    },
    [duplicateCooldownMs],
  );

  /* -------------------------------------------------
     Detection
  -------------------------------------------------- */

  const handleDetected = useCallback(
    ({ data }) => {
      if (!data) {
        return;
      }

      const normalized = normalizeBarcode(data);

      if (!normalized) {
        return;
      }

      if (!continuous && handledRef.current) {
        return;
      }

      if (continuous && isDuplicateTooSoon(normalized)) {
        return;
      }

      handledRef.current = true;

      onDetectedRef.current?.(normalized);
    },
    [continuous, isDuplicateTooSoon],
  );

  /* -------------------------------------------------
     Reset when screen receives focus
  -------------------------------------------------- */

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    handledRef.current = false;
    lastCodeRef.current = null;
    lastTimeRef.current = 0;
  }, [isFocused]);

  /* -------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <View style={styles.container}>
      {settingsLoaded ? (
        <UnifiedBarcodeScanner
          mode="auto"
          active={true}
          barcodeTypes={effectiveBarcodeTypes}
          showControls={showControls}
          showHint={true}
          hintText="Apunta al código"
          onDetected={handleDetected}
          onCancel={onClose}
          continuous={continuous}
          scanCooldownMs={duplicateCooldownMs}
        />
      ) : null}
    </View>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#000000",
  },
});

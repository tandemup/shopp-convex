import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { BrowserMultiFormatReader } from "@zxing/browser";

import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";

import ScannerOverlay from "./ScannerOverlay.js";

import { DEFAULT_BARCODE_SETTINGS } from "@/src/constants/barcodeFormats";

import { getBarcodeSettings } from "@/src/storage/barcodeSettingsStorage";

const ZOOM_LEVELS = [1, 1.2, 1.5, 2];

const DEFAULT_ZOOM_INDEX = 1;

const DUPLICATE_LOCK_MS = 1500;

const CAMERA_GRANTED_STORAGE_KEY = "shopp:web-camera-access-granted";

const ZXING_FORMAT_BY_SHOPP_ID = {
  ean13: BarcodeFormat.EAN_13,
  ean8: BarcodeFormat.EAN_8,
  upc_a: BarcodeFormat.UPC_A,
  upc_e: BarcodeFormat.UPC_E,
  qr: BarcodeFormat.QR_CODE,
  code128: BarcodeFormat.CODE_128,
};

const SHOPP_ID_BY_ZXING_FORMAT = {
  [BarcodeFormat.EAN_13]: "ean13",
  [BarcodeFormat.EAN_8]: "ean8",
  [BarcodeFormat.UPC_A]: "upc_a",
  [BarcodeFormat.UPC_E]: "upc_e",
  [BarcodeFormat.QR_CODE]: "qr",
  [BarcodeFormat.CODE_128]: "code128",
};

function rememberCameraAccess() {
  try {
    window.localStorage.setItem(CAMERA_GRANTED_STORAGE_KEY, "true");
  } catch {}
}

function forgetRememberedCameraAccess() {
  try {
    window.localStorage.removeItem(CAMERA_GRANTED_STORAGE_KEY);
  } catch {}
}

function normalizeNumericBarcode(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeDecodedValue(value) {
  return String(value ?? "").trim();
}

function isValidEan13(value) {
  const barcode = normalizeNumericBarcode(value);

  if (!/^\d{13}$/.test(barcode)) return false;

  const digits = barcode.split("").map(Number);
  const expectedCheckDigit = digits[12];

  const weightedSum = digits.slice(0, 12).reduce((total, digit, index) => {
    return total + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  const calculatedCheckDigit = (10 - (weightedSum % 10)) % 10;

  return calculatedCheckDigit === expectedCheckDigit;
}

function isProbablyValidBarcode(value, format) {
  const text = normalizeDecodedValue(value);
  const numeric = normalizeNumericBarcode(value);

  if (!text) return false;

  switch (format) {
    case BarcodeFormat.EAN_13:
      return isValidEan13(numeric);

    case BarcodeFormat.EAN_8:
      return /^\d{8}$/.test(numeric);

    case BarcodeFormat.UPC_A:
      return /^\d{12}$/.test(numeric);

    case BarcodeFormat.UPC_E:
      return /^\d{6,8}$/.test(numeric);

    case BarcodeFormat.QR_CODE:
      return text.length > 0;

    case BarcodeFormat.CODE_128:
      return text.length > 0;

    default:
      return text.length > 0;
  }
}

function getNormalizedValueForFormat(value, format) {
  if (
    format === BarcodeFormat.EAN_13 ||
    format === BarcodeFormat.EAN_8 ||
    format === BarcodeFormat.UPC_A ||
    format === BarcodeFormat.UPC_E
  ) {
    return normalizeNumericBarcode(value);
  }

  return normalizeDecodedValue(value);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getReadableCameraError(error) {
  const message = String(error?.message ?? error ?? "");

  if (error?.name === "NotFoundError") {
    return "No se ha encontrado ninguna cámara compatible.";
  }

  if (error?.name === "NotAllowedError") {
    return "El navegador ha bloqueado la cámara. Activa el permiso desde los ajustes del sitio.";
  }

  if (error?.name === "NotReadableError") {
    return "La cámara está siendo utilizada por otra aplicación o pestaña.";
  }

  if (error?.name === "OverconstrainedError") {
    return "La cámara no admite la configuración solicitada.";
  }

  if (error?.name === "SecurityError") {
    return "El navegador no permite usar la cámara. Comprueba que estás usando HTTPS.";
  }

  return message || "No ha sido posible iniciar la cámara.";
}

async function getEnabledZxingFormats() {
  let settings = DEFAULT_BARCODE_SETTINGS;

  try {
    const storedSettings = await getBarcodeSettings();

    settings = {
      ...DEFAULT_BARCODE_SETTINGS,
      ...(storedSettings ?? {}),
      formats: {
        ...(DEFAULT_BARCODE_SETTINGS?.formats ?? {}),
        ...(storedSettings?.formats ?? {}),
      },
    };
  } catch (error) {
    console.warn("No se pudo leer la configuración de códigos:", error);
  }

  const enabledFormats = Object.entries(settings?.formats ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([formatId]) => ZXING_FORMAT_BY_SHOPP_ID[formatId])
    .filter(Boolean);

  return enabledFormats.length > 0 ? enabledFormats : [BarcodeFormat.EAN_13];
}

function createZxingReader(enabledFormats) {
  const hints = new Map();

  hints.set(DecodeHintType.POSSIBLE_FORMATS, enabledFormats);
  hints.set(DecodeHintType.TRY_HARDER, true);

  return new BrowserMultiFormatReader(hints, 250);
}

function getVideoTrack(stream) {
  return stream?.getVideoTracks?.()?.[0] ?? null;
}

function buildCameraConstraints() {
  return {
    audio: false,
    video: {
      facingMode: {
        ideal: "environment",
      },
      width: {
        ideal: 1280,
      },
      height: {
        ideal: 720,
      },
    },
  };
}

function getZxingFormatFromResult(result) {
  if (!result) return undefined;

  if (typeof result.getBarcodeFormat === "function") {
    return result.getBarcodeFormat();
  }

  return result?.barcodeFormat;
}

export default function QuickEan13ScannerWeb({
  onDetected,
  onBarcodeScanned,
  onCancel,

  initialZoomIndex = DEFAULT_ZOOM_INDEX,
  initialTorchEnabled = false,

  showControls = true,
}) {
  const isFocused = useIsFocused();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);

  const mountedRef = useRef(false);
  const focusedRef = useRef(false);
  const runningRef = useRef(false);
  const startingRef = useRef(false);
  const detectionLockedRef = useRef(false);

  const currentZoomRef = useRef(
    ZOOM_LEVELS[clamp(initialZoomIndex, 0, ZOOM_LEVELS.length - 1)] ?? 1.2,
  );

  const lastDetectedRef = useRef({
    barcode: "",
    timestamp: 0,
  });

  const [cameraStarting, setCameraStarting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [zoomIndex, setZoomIndex] = useState(
    clamp(initialZoomIndex, 0, ZOOM_LEVELS.length - 1),
  );

  const [zoomSupported, setZoomSupported] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(
    initialTorchEnabled === true,
  );

  const currentZoom = ZOOM_LEVELS[zoomIndex] ?? 1.2;

  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  const getTrackCapabilities = useCallback(() => {
    const track = getVideoTrack(streamRef.current);

    if (!track || typeof track.getCapabilities !== "function") {
      return {};
    }

    try {
      return track.getCapabilities() || {};
    } catch {
      return {};
    }
  }, []);

  const applyVideoConstraints = useCallback(async (constraints) => {
    const track = getVideoTrack(streamRef.current);

    if (!track || typeof track.applyConstraints !== "function") {
      return false;
    }

    await track.applyConstraints(constraints);

    return true;
  }, []);

  const stopCamera = useCallback(async () => {
    startingRef.current = false;
    runningRef.current = false;
    detectionLockedRef.current = false;

    const controls = controlsRef.current;

    controlsRef.current = null;

    try {
      controls?.stop?.();
    } catch (error) {
      console.warn("No se pudo detener el lector ZXing:", error);
    }

    const stream = streamRef.current;

    streamRef.current = null;

    try {
      stream?.getTracks?.()?.forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    } catch {}

    const video = videoRef.current;

    if (video) {
      try {
        video.pause();
      } catch {}

      try {
        video.srcObject = null;
      } catch {}
    }

    readerRef.current = null;

    if (mountedRef.current) {
      setTorchEnabled(false);
      setTorchSupported(false);
      setZoomSupported(false);
    }
  }, []);

  const notifyDetectedBarcode = useCallback(
    async (decodedText, decodedFormat) => {
      if (!isProbablyValidBarcode(decodedText, decodedFormat)) return;

      const barcode = getNormalizedValueForFormat(decodedText, decodedFormat);

      const now = Date.now();
      const previousDetection = lastDetectedRef.current;

      if (
        previousDetection.barcode === barcode &&
        now - previousDetection.timestamp < DUPLICATE_LOCK_MS
      ) {
        return;
      }

      lastDetectedRef.current = {
        barcode,
        timestamp: now,
      };

      detectionLockedRef.current = true;

      await stopCamera();

      if (!mountedRef.current || !focusedRef.current) return;

      const formatId = SHOPP_ID_BY_ZXING_FORMAT[decodedFormat] ?? "unknown";

      const result = {
        type: formatId,
        data: barcode,
        rawValue: barcode,
        format: formatId,
      };

      if (typeof onDetected === "function") {
        onDetected(barcode);
        return;
      }

      onBarcodeScanned?.(result);
    },
    [onBarcodeScanned, onDetected, stopCamera],
  );

  const configureCameraCapabilities = useCallback(async () => {
    const capabilities = getTrackCapabilities();

    const supportsZoom =
      capabilities?.zoom &&
      Number.isFinite(capabilities.zoom.min) &&
      Number.isFinite(capabilities.zoom.max);

    const supportsTorch = Boolean(capabilities?.torch);

    if (!mountedRef.current || !focusedRef.current) return;

    setZoomSupported(Boolean(supportsZoom));
    setTorchSupported(supportsTorch);

    if (supportsZoom) {
      const desiredZoom = clamp(
        currentZoomRef.current,
        capabilities.zoom.min,
        capabilities.zoom.max,
      );

      try {
        await applyVideoConstraints({
          advanced: [{ zoom: desiredZoom }],
        });
      } catch (error) {
        console.warn("No se pudo aplicar el zoom inicial:", error);
        setZoomSupported(false);
      }
    }

    if (supportsTorch && initialTorchEnabled) {
      try {
        await applyVideoConstraints({
          advanced: [{ torch: true }],
        });

        setTorchEnabled(true);
      } catch (error) {
        console.warn("No se pudo activar la linterna inicialmente:", error);
        setTorchSupported(false);
        setTorchEnabled(false);
      }
    }
  }, [applyVideoConstraints, getTrackCapabilities, initialTorchEnabled]);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current || !focusedRef.current) return;
    if (startingRef.current || runningRef.current) return;

    if (
      typeof navigator === "undefined" ||
      !navigator?.mediaDevices?.getUserMedia
    ) {
      setErrorMessage(
        "Este navegador no permite utilizar la cámara. Abre Shopp mediante HTTPS con un navegador compatible.",
      );
      setScannerVisible(false);
      return;
    }

    const video = videoRef.current;

    if (!video) {
      setErrorMessage("No se ha podido inicializar el visor de cámara.");
      setScannerVisible(false);
      return;
    }

    startingRef.current = true;
    detectionLockedRef.current = false;

    setCameraStarting(true);
    setScannerVisible(true);
    setErrorMessage("");

    try {
      const enabledFormats = await getEnabledZxingFormats();

      const stream = await navigator.mediaDevices.getUserMedia(
        buildCameraConstraints(),
      );

      if (!mountedRef.current || !focusedRef.current) {
        try {
          stream?.getTracks?.()?.forEach((track) => track.stop());
        } catch {}

        return;
      }

      streamRef.current = stream;

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;

      try {
        await video.play();
      } catch (error) {
        console.warn("El navegador ha retrasado el inicio del vídeo:", error);
      }

      const reader = createZxingReader(enabledFormats);

      readerRef.current = reader;

      const controls = await reader.decodeFromStream(
        stream,
        video,
        (result, error) => {
          if (!mountedRef.current || !focusedRef.current) return;
          if (detectionLockedRef.current) return;

          if (result?.getText) {
            const decodedText = result.getText();
            const decodedFormat = getZxingFormatFromResult(result);

            notifyDetectedBarcode(decodedText, decodedFormat);
            return;
          }

          if (
            error &&
            !(error instanceof NotFoundException) &&
            error?.name !== "NotFoundException"
          ) {
            const message = String(error?.message ?? "");

            if (message) {
              console.warn("Error leyendo código con ZXing:", message);
            }
          }
        },
      );

      controlsRef.current = controls;

      if (!mountedRef.current || !focusedRef.current) {
        await stopCamera();
        return;
      }

      runningRef.current = true;
      rememberCameraAccess();

      await configureCameraCapabilities();
    } catch (error) {
      console.warn("No se pudo iniciar el lector web ZXing:", error);

      runningRef.current = false;

      await stopCamera();

      if (error?.name === "NotAllowedError") {
        forgetRememberedCameraAccess();
      }

      if (mountedRef.current) {
        setScannerVisible(false);
        setErrorMessage(getReadableCameraError(error));
      }
    } finally {
      startingRef.current = false;

      if (mountedRef.current) {
        setCameraStarting(false);
      }
    }
  }, [configureCameraCapabilities, notifyDetectedBarcode, stopCamera]);

  const applyZoomIndex = useCallback(
    async (nextZoomIndex) => {
      const normalizedIndex = clamp(nextZoomIndex, 0, ZOOM_LEVELS.length - 1);
      const selectedZoom = ZOOM_LEVELS[normalizedIndex] ?? 1.2;

      setZoomIndex(normalizedIndex);
      currentZoomRef.current = selectedZoom;

      if (!zoomSupported) return;

      const capabilities = getTrackCapabilities();

      const zoomMinimum = capabilities?.zoom?.min ?? 1;
      const zoomMaximum = capabilities?.zoom?.max ?? selectedZoom;

      const constrainedZoom = clamp(selectedZoom, zoomMinimum, zoomMaximum);

      try {
        await applyVideoConstraints({
          advanced: [{ zoom: constrainedZoom }],
        });
      } catch (error) {
        console.warn("No se pudo modificar el zoom:", error);
        setZoomSupported(false);
      }
    },
    [applyVideoConstraints, getTrackCapabilities, zoomSupported],
  );

  const cycleZoom = useCallback(() => {
    const nextZoomIndex =
      zoomIndex >= ZOOM_LEVELS.length - 1 ? 0 : zoomIndex + 1;

    applyZoomIndex(nextZoomIndex);
  }, [applyZoomIndex, zoomIndex]);

  const toggleTorch = useCallback(async () => {
    if (!torchSupported) return;

    const nextTorchEnabled = !torchEnabled;

    try {
      await applyVideoConstraints({
        advanced: [{ torch: nextTorchEnabled }],
      });

      setTorchEnabled(nextTorchEnabled);
    } catch (error) {
      console.warn("No se pudo modificar la linterna:", error);
      setTorchSupported(false);
      setTorchEnabled(false);
    }
  }, [applyVideoConstraints, torchEnabled, torchSupported]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    focusedRef.current = isFocused;

    if (!isFocused) {
      stopCamera();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (
        mountedRef.current &&
        focusedRef.current &&
        !startingRef.current &&
        !runningRef.current
      ) {
        startCamera();
      }
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isFocused, startCamera, stopCamera]);

  if (!scannerVisible && errorMessage) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionIcon}>⚠️</Text>

        <Text style={styles.centeredTitle}>No se pudo abrir la cámara</Text>

        <Text style={styles.centeredText}>{errorMessage}</Text>

        <Pressable
          disabled={cameraStarting}
          onPress={startCamera}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            cameraStarting && styles.buttonDisabled,
          ]}
        >
          {cameraStarting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />

      <ScannerOverlay
        onCancel={onCancel}
        onChangeZoom={cycleZoom}
        onToggleTorch={toggleTorch}
        zoomLabel={`${currentZoom.toFixed(1)}x`}
        torchEnabled={torchEnabled}
        zoomAvailable={zoomSupported}
        torchAvailable={torchSupported}
        showControls={showControls}
        hint="Apunta al código de barras"
        title="Leer código de barras"
        subtitle="Mantén el código dentro del marco. El número se copiará automáticamente cuando sea detectado."
        starting={cameraStarting}
        errorMessage={errorMessage}
        onRetry={startCamera}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000000",
  },

  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    backgroundColor: "#000000",
  },

  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    backgroundColor: "#07111f",
  },

  permissionIcon: {
    fontSize: 46,
    marginBottom: 6,
  },

  centeredTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 16,
  },

  centeredText: {
    maxWidth: 440,
    color: "#c6d3df",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },

  primaryButton: {
    minWidth: 210,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: "#1f8f57",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    minWidth: 210,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.72,
  },

  buttonDisabled: {
    opacity: 0.56,
  },
});

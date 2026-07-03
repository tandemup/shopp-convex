// components/features/scanner/UnifiedBarcodeScanner.web.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

/* -------------------------------------------------
   Default configuration
-------------------------------------------------- */

const DEFAULT_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"];

const FORMAT_MAP = {
  aztec: Html5QrcodeSupportedFormats.AZTEC,

  codabar: Html5QrcodeSupportedFormats.CODABAR,

  code39: Html5QrcodeSupportedFormats.CODE_39,

  code93: Html5QrcodeSupportedFormats.CODE_93,

  code128: Html5QrcodeSupportedFormats.CODE_128,

  datamatrix: Html5QrcodeSupportedFormats.DATA_MATRIX,

  ean8: Html5QrcodeSupportedFormats.EAN_8,

  ean13: Html5QrcodeSupportedFormats.EAN_13,

  itf14: Html5QrcodeSupportedFormats.ITF,

  pdf417: Html5QrcodeSupportedFormats.PDF_417,

  qr: Html5QrcodeSupportedFormats.QR_CODE,

  upc_a: Html5QrcodeSupportedFormats.UPC_A,

  upc_e: Html5QrcodeSupportedFormats.UPC_E,
};

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function getFormatsToSupport(barcodeTypes) {
  const source =
    Array.isArray(barcodeTypes) && barcodeTypes.length > 0
      ? barcodeTypes
      : DEFAULT_BARCODE_TYPES;

  const formats = source
    .map((type) => {
      return FORMAT_MAP[type];
    })
    .filter((format) => {
      return format !== undefined;
    });

  if (formats.length > 0) {
    return formats;
  }

  return DEFAULT_BARCODE_TYPES.map((type) => {
    return FORMAT_MAP[type];
  }).filter((format) => {
    return format !== undefined;
  });
}

/*
 * Ventana horizontal adecuada para códigos EAN y UPC.
 */
function getScanBox(viewfinderWidth, viewfinderHeight) {
  const safeWidth = Math.max(1, viewfinderWidth);

  const safeHeight = Math.max(1, viewfinderHeight);

  const width = Math.max(
    1,
    Math.min(Math.floor(safeWidth * 0.9), safeWidth - 4),
  );

  const height = Math.max(
    1,
    Math.min(Math.max(84, Math.floor(safeHeight * 0.28)), safeHeight - 4),
  );

  return {
    width,
    height,
  };
}

function getErrorMessage(error) {
  const text = String(error?.message || error || "");

  if (text.includes("NotAllowedError")) {
    return "No se ha permitido el acceso a la cámara. Revisa los permisos del navegador.";
  }

  if (text.includes("NotFoundError")) {
    return "No se ha encontrado una cámara disponible.";
  }

  if (text.includes("NotReadableError")) {
    return "La cámara está siendo utilizada por otra aplicación o pestaña.";
  }

  if (text.includes("OverconstrainedError")) {
    return "El navegador no ha podido seleccionar la cámara solicitada.";
  }

  return "No se pudo iniciar el lector. Comprueba los permisos e inténtalo de nuevo.";
}

function findPreferredCamera(cameras) {
  if (!Array.isArray(cameras) || cameras.length === 0) {
    return null;
  }

  const rearCamera = cameras.find((camera) => {
    const label = String(camera?.label || "");

    return /back|rear|environment|trasera|posterior/i.test(label);
  });

  return rearCamera || cameras[cameras.length - 1] || cameras[0];
}

/* -------------------------------------------------
   Component
-------------------------------------------------- */

export default function UnifiedBarcodeScanner({
  onDetected,
  onCancel,
  onStartScanning,
  onStopScanning,

  active = true,
  mode = "manual",

  barcodeTypes = DEFAULT_BARCODE_TYPES,

  showControls = true,
  showHint = true,

  hintText = "Apunta al código de barras",

  statusMessage = "",
  statusColor = "#2563EB",

  continuous = false,
  scanCooldownMs = 1200,
}) {
  const isFocused = useIsFocused();

  const readerIdRef = useRef(
    `shopp-barcode-reader-${Math.random().toString(36).slice(2)}`,
  );

  const scannerRef = useRef(null);

  /*
   * Invalida operaciones de arranque pendientes.
   */
  const operationIdRef = useRef(0);

  const lockRef = useRef(false);
  const unlockTimerRef = useRef(null);

  /*
   * Evita reiniciar la cámara cuando cambia el
   * callback del componente padre.
   */
  const onDetectedRef = useRef(onDetected);

  const [scanningEnabled, setScanningEnabled] = useState(mode === "auto");

  const [starting, setStarting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [restartToken, setRestartToken] = useState(0);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const [zoomCapability, setZoomCapability] = useState(null);
  const [zoomValue, setZoomValue] = useState(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const formatsToSupport = useMemo(() => {
    return getFormatsToSupport(barcodeTypes);
  }, [barcodeTypes]);

  const formatsKey = useMemo(() => {
    return formatsToSupport.join(",");
  }, [formatsToSupport]);

  const cameraShouldRun = active && isFocused && scanningEnabled;

  /* -------------------------------------------------
     Lock helpers
  -------------------------------------------------- */

  const clearUnlockTimer = useCallback(() => {
    if (!unlockTimerRef.current) {
      return;
    }

    clearTimeout(unlockTimerRef.current);

    unlockTimerRef.current = null;
  }, []);

  const unlockScanner = useCallback(() => {
    clearUnlockTimer();

    lockRef.current = false;
  }, [clearUnlockTimer]);

  const scheduleUnlock = useCallback(() => {
    if (!continuous || mode !== "auto") {
      return;
    }

    clearUnlockTimer();

    unlockTimerRef.current = setTimeout(() => {
      lockRef.current = false;

      unlockTimerRef.current = null;
    }, scanCooldownMs);
  }, [clearUnlockTimer, continuous, mode, scanCooldownMs]);

  /* -------------------------------------------------
     Camera cleanup
  -------------------------------------------------- */

  const stopScannerInstance = useCallback(async (scanner) => {
    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch (error) {
      /*
       * Puede ocurrir si el lector todavía estaba
       * arrancando o ya se había detenido.
       */
    }

    try {
      scanner.clear();
    } catch (error) {
      /*
       * Limpieza defensiva.
       */
    }
  }, []);

  const resetCapabilities = useCallback(() => {
    setTorchSupported(false);

    setTorchEnabled(false);

    setZoomCapability(null);

    setZoomValue(null);
  }, []);

  const stopCurrentScanner = useCallback(async () => {
    clearUnlockTimer();

    /*
     * Invalida cualquier arranque todavía pendiente.
     */
    operationIdRef.current += 1;

    const scanner = scannerRef.current;

    scannerRef.current = null;

    setStarting(false);

    resetCapabilities();

    await stopScannerInstance(scanner);
  }, [clearUnlockTimer, resetCapabilities, stopScannerInstance]);

  /* -------------------------------------------------
     Camera capabilities
  -------------------------------------------------- */

  const inspectCameraCapabilities = useCallback(
    (scanner) => {
      try {
        const capabilities = scanner.getRunningTrackCapabilities();

        const settings = scanner.getRunningTrackSettings?.() || {};

        setTorchSupported(capabilities?.torch === true);

        const zoom = capabilities?.zoom;

        if (
          zoom &&
          typeof zoom.min === "number" &&
          typeof zoom.max === "number"
        ) {
          setZoomCapability({
            min: zoom.min,

            max: zoom.max,

            step:
              typeof zoom.step === "number" && zoom.step > 0 ? zoom.step : 0.1,
          });

          setZoomValue(
            typeof settings.zoom === "number" ? settings.zoom : zoom.min,
          );

          return;
        }

        setZoomCapability(null);

        setZoomValue(null);
      } catch (error) {
        /*
         * Safari puede mostrar la cámara sin ofrecer
         * zoom o linterna.
         *
         * No es un error bloqueante.
         */
        resetCapabilities();
      }
    },
    [resetCapabilities],
  );

  /* -------------------------------------------------
     Successful read
  -------------------------------------------------- */

  const handleSuccessfulRead = useCallback(
    (decodedText, decodedResult) => {
      if (!decodedText) {
        return;
      }

      if (lockRef.current) {
        return;
      }

      lockRef.current = true;

      const type =
        decodedResult?.result?.format?.formatName ||
        decodedResult?.result?.format ||
        "unknown";

      onDetectedRef.current?.({
        data: String(decodedText),
        type: String(type),
      });

      scheduleUnlock();
    },
    [scheduleUnlock],
  );

  /* -------------------------------------------------
     Start camera
  -------------------------------------------------- */

  useEffect(() => {
    let disposed = false;

    if (!cameraShouldRun) {
      stopCurrentScanner();

      return () => {
        disposed = true;
      };
    }

    const operationId = operationIdRef.current + 1;

    operationIdRef.current = operationId;

    let ownedScanner = null;

    async function createScannerAndStart(cameraConfig) {
      const scanner = new Html5Qrcode(readerIdRef.current, {
        formatsToSupport,

        /*
         * En Safari interesa mantener el
         * decodificador JavaScript para códigos EAN.
         */
        useBarCodeDetectorIfSupported: false,

        verbose: false,
      });

      ownedScanner = scanner;

      scannerRef.current = scanner;

      try {
        await scanner.start(
          cameraConfig,
          {
            fps: 12,

            /*
             * No forzamos aspectRatio.
             *
             * El navegador selecciona una resolución
             * compatible con la cámara disponible.
             */
            qrbox: getScanBox,

            /*
             * La cámara trasera no necesita una
             * segunda pasada reflejada.
             */
            disableFlip: true,
          },
          handleSuccessfulRead,
          () => {
            /*
             * No mostramos errores por cada fotograma
             * sin coincidencias.
             */
          },
        );

        return scanner;
      } catch (error) {
        if (scannerRef.current === scanner) {
          scannerRef.current = null;
        }

        await stopScannerInstance(scanner);

        throw error;
      }
    }

    async function startScanner() {
      setStarting(true);

      setErrorMessage("");

      let scanner = null;

      try {
        /*
         * Primer intento: solicitar la cámara trasera.
         */
        try {
          scanner = await createScannerAndStart({
            facingMode: "environment",
          });
        } catch (firstError) {
          /*
           * Segundo intento: elegir una cámara
           * concreta de la lista disponible.
           */
          const cameras = await Html5Qrcode.getCameras();

          const preferredCamera = findPreferredCamera(cameras);

          if (!preferredCamera?.id) {
            throw firstError;
          }

          scanner = await createScannerAndStart(preferredCamera.id);
        }

        /*
         * Cerramos el stream si la pantalla ya no
         * está activa cuando termina el arranque.
         */
        if (disposed || operationId !== operationIdRef.current) {
          await stopScannerInstance(scanner);

          return;
        }

        scannerRef.current = scanner;

        ownedScanner = scanner;

        inspectCameraCapabilities(scanner);
      } catch (error) {
        console.log("Error starting web barcode scanner:", error);

        if (!disposed && operationId === operationIdRef.current) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!disposed && operationId === operationIdRef.current) {
          setStarting(false);
        }
      }
    }

    startScanner();

    return () => {
      disposed = true;

      operationIdRef.current += 1;

      if (scannerRef.current === ownedScanner) {
        scannerRef.current = null;
      }

      stopScannerInstance(ownedScanner);
    };
  }, [
    cameraShouldRun,
    formatsKey,
    handleSuccessfulRead,
    inspectCameraCapabilities,
    restartToken,
    stopCurrentScanner,
    stopScannerInstance,
  ]);

  /* -------------------------------------------------
     Scanner mode
  -------------------------------------------------- */

  useEffect(() => {
    if (!active || !isFocused) {
      unlockScanner();

      setScanningEnabled(mode === "auto");

      return;
    }

    if (mode === "auto") {
      unlockScanner();

      setScanningEnabled(true);

      return;
    }

    setScanningEnabled(false);
  }, [active, isFocused, mode, unlockScanner]);

  useEffect(() => {
    return () => {
      clearUnlockTimer();
    };
  }, [clearUnlockTimer]);

  /* -------------------------------------------------
     Controls
  -------------------------------------------------- */

  function startScanning() {
    unlockScanner();

    setErrorMessage("");

    setScanningEnabled(true);

    onStartScanning?.();
  }

  async function stopScanning() {
    unlockScanner();

    setScanningEnabled(false);

    await stopCurrentScanner();

    onStopScanning?.();
  }

  async function toggleTorch() {
    const scanner = scannerRef.current;

    if (!scanner || !torchSupported) {
      return;
    }

    const nextValue = !torchEnabled;

    try {
      await scanner.applyVideoConstraints({
        advanced: [
          {
            torch: nextValue,
          },
        ],
      });

      setTorchEnabled(nextValue);
    } catch (error) {
      console.log("Torch is not available in this browser:", error);

      setTorchSupported(false);

      setTorchEnabled(false);
    }
  }

  async function changeZoom() {
    const scanner = scannerRef.current;

    if (!scanner || !zoomCapability) {
      return;
    }

    const { min, max, step } = zoomCapability;

    const currentValue = typeof zoomValue === "number" ? zoomValue : min;

    const proposedValue = currentValue + step;

    const nextValue = proposedValue > max ? min : proposedValue;

    try {
      await scanner.applyVideoConstraints({
        advanced: [
          {
            zoom: nextValue,
          },
        ],
      });

      setZoomValue(nextValue);
    } catch (error) {
      console.log("Zoom is not available in this browser:", error);

      setZoomCapability(null);

      setZoomValue(null);
    }
  }

  async function handleCancel() {
    unlockScanner();

    await stopCurrentScanner();

    onCancel?.();
  }

  function retryScanner() {
    unlockScanner();

    setErrorMessage("");

    setRestartToken((previous) => {
      return previous + 1;
    });
  }

  /* -------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <View style={styles.container}>
      <View nativeID={readerIdRef.current} style={styles.reader} />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          {onCancel ? (
            <Pressable style={styles.closeButton} onPress={handleCancel}>
              <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.middle} pointerEvents="none">
          <View style={styles.scanFrame}>
            <View style={styles.scanLine} />
          </View>

          {showHint ? <Text style={styles.hintText}>{hintText}</Text> : null}
        </View>

        <View style={styles.bottomPanel}>
          {starting ? (
            <Text style={styles.message}>Iniciando cámara...</Text>
          ) : null}

          {errorMessage ? (
            <>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <Pressable style={styles.retryButton} onPress={retryScanner}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </>
          ) : null}

          {statusMessage ? (
            <Text
              style={[
                styles.statusText,
                {
                  backgroundColor: statusColor,
                },
              ]}
            >
              {statusMessage}
            </Text>
          ) : null}

          {showControls ? (
            <View style={styles.actionsRow}>
              {torchSupported ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    torchEnabled && styles.actionButtonActive,
                  ]}
                  onPress={toggleTorch}
                >
                  <MaterialCommunityIcons
                    name={torchEnabled ? "flashlight" : "flashlight-off"}
                    size={22}
                    color="#FFFFFF"
                  />

                  <Text style={styles.actionText}>
                    {torchEnabled ? "Luz ON" : "Linterna"}
                  </Text>
                </Pressable>
              ) : null}

              {zoomCapability ? (
                <Pressable style={styles.actionButton} onPress={changeZoom}>
                  <MaterialCommunityIcons
                    name="magnify-plus"
                    size={22}
                    color="#FFFFFF"
                  />

                  <Text style={styles.actionText}>
                    {typeof zoomValue === "number"
                      ? `${zoomValue.toFixed(1)}x`
                      : "Zoom"}
                  </Text>
                </Pressable>
              ) : null}

              {mode === "manual" ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    scanningEnabled && styles.actionButtonActive,
                  ]}
                  onPress={scanningEnabled ? stopScanning : startScanning}
                >
                  <MaterialCommunityIcons
                    name="barcode-scan"
                    size={22}
                    color="#FFFFFF"
                  />

                  <Text style={styles.actionText}>
                    {scanningEnabled ? "Detener" : "Escanear"}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.actionButton, styles.actionButtonActive]}>
                  <MaterialCommunityIcons
                    name="barcode-scan"
                    size={22}
                    color="#FFFFFF"
                  />

                  <Text style={styles.actionText}>Activo</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>
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
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000000",
  },

  reader: {
    flex: 1,
    width: "100%",
    minHeight: 320,
    backgroundColor: "#000000",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },

  topBar: {
    minHeight: 62,
    paddingTop: 18,
    paddingHorizontal: 18,
    alignItems: "flex-end",
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
  },

  middle: {
    alignItems: "center",
    justifyContent: "center",
  },

  scanFrame: {
    width: "88%",
    height: 132,
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: 16,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  scanLine: {
    height: 2,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  hintText: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
  },

  bottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: "rgba(0,0,0,0.72)",
  },

  message: {
    marginBottom: 10,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },

  errorText: {
    marginBottom: 10,
    color: "#FCA5A5",
    fontWeight: "700",
    textAlign: "center",
  },

  retryButton: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  statusText: {
    alignSelf: "center",
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    color: "#FFFFFF",
    fontWeight: "700",
  },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },

  actionButton: {
    minWidth: 108,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,

    backgroundColor: "rgba(255,255,255,0.18)",
  },

  actionButtonActive: {
    backgroundColor: "rgba(22,163,74,0.95)",
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

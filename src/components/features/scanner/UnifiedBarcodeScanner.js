// components/features/scanner/UnifiedBarcodeScanner.js

import React, { useEffect, useMemo, useRef, useState } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { CameraView, useCameraPermissions } from "expo-camera";

/* -------------------------------------------------
   Default configuration
-------------------------------------------------- */

const DEFAULT_ZOOM_LEVELS = [
  {
    label: "1x",
    value: 0,
  },
  {
    label: "1.1x",
    value: 0.1,
  },
  {
    label: "1.2x",
    value: 0.2,
  },
  {
    label: "1.4x",
    value: 0.35,
  },
];

const DEFAULT_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"];

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

  zoomLevels = DEFAULT_ZOOM_LEVELS,

  /*
   * Índice 2: abre inicialmente con un pequeño zoom.
   *
   * En el dispositivo probado mejora la lectura de
   * códigos EAN.
   */
  initialZoomIndex = 2,

  showControls = true,
  showHint = true,

  hintText = "Apunta al código de barras",

  statusMessage = "",
  statusColor = "#2563EB",

  continuous = false,
  scanCooldownMs = 1200,
}) {
  const isFocused = useIsFocused();

  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);

  const [zoomIndex, setZoomIndex] = useState(initialZoomIndex);

  const [scanningEnabled, setScanningEnabled] = useState(mode === "auto");

  const [mountError, setMountError] = useState("");

  const lockRef = useRef(false);
  const unlockTimerRef = useRef(null);

  const cameraActive = active && isFocused && permission?.granted;

  const zoom = useMemo(() => {
    return zoomLevels[zoomIndex]?.value ?? zoomLevels[0]?.value ?? 0;
  }, [zoomIndex, zoomLevels]);

  /* -------------------------------------------------
     Lock helpers
  -------------------------------------------------- */

  function clearUnlockTimer() {
    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);

      unlockTimerRef.current = null;
    }
  }

  function unlockScanner() {
    clearUnlockTimer();

    lockRef.current = false;
  }

  function resetScanner() {
    unlockScanner();

    setScanningEnabled(mode === "auto");

    setTorch(false);

    setZoomIndex(initialZoomIndex);

    setMountError("");
  }

  /* -------------------------------------------------
     Reset scanner when leaving screen
  -------------------------------------------------- */

  useEffect(() => {
    if (!active || !isFocused) {
      resetScanner();
    }
  }, [active, isFocused]);

  useEffect(() => {
    if (mode === "auto" && active && isFocused) {
      unlockScanner();

      setScanningEnabled(true);
    }

    if (mode === "manual") {
      setScanningEnabled(false);
    }
  }, [mode, active, isFocused]);

  useEffect(() => {
    return () => {
      clearUnlockTimer();
    };
  }, []);

  /* -------------------------------------------------
     Scanner controls
  -------------------------------------------------- */

  function startScanning() {
    unlockScanner();

    setScanningEnabled(true);

    onStartScanning?.();
  }

  function stopScanning() {
    unlockScanner();

    setScanningEnabled(false);

    onStopScanning?.();
  }

  function scheduleUnlock() {
    if (!continuous || mode !== "auto") {
      return;
    }

    clearUnlockTimer();

    unlockTimerRef.current = setTimeout(() => {
      lockRef.current = false;

      unlockTimerRef.current = null;
    }, scanCooldownMs);
  }

  /* -------------------------------------------------
     Barcode callback
  -------------------------------------------------- */

  function handleBarcodeScanned({ data, type }) {
    if (!cameraActive) {
      return;
    }

    if (!scanningEnabled) {
      return;
    }

    if (lockRef.current) {
      return;
    }

    if (!data) {
      return;
    }

    lockRef.current = true;

    if (mode === "manual") {
      setScanningEnabled(false);
    }

    try {
      onDetected?.({
        data: String(data),
        type: String(type || ""),
      });
    } finally {
      scheduleUnlock();
    }
  }

  function handleCameraMountError(event) {
    console.log("Camera mount error:", event?.message);

    setMountError(
      "No se pudo iniciar la cámara. Comprueba los permisos e inténtalo de nuevo.",
    );
  }

  function handleClose() {
    resetScanner();

    onCancel?.();
  }

  /* -------------------------------------------------
     Permission screens
  -------------------------------------------------- */

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Comprobando permisos de cámara...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Se necesita acceso a la cámara.
        </Text>

        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </Pressable>

        {onCancel ? (
          <Pressable
            style={[styles.primaryButton, styles.cancelPermissionButton]}
            onPress={handleClose}
          >
            <Text style={styles.primaryButtonText}>Cerrar</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  /* -------------------------------------------------
     Camera
  -------------------------------------------------- */

  return (
    <View style={styles.container}>
      {cameraActive ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          autofocus="on"
          zoom={zoom}
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes,
          }}
          onMountError={handleCameraMountError}
          onBarcodeScanned={scanningEnabled ? handleBarcodeScanned : undefined}
        />
      ) : (
        <View style={StyleSheet.absoluteFillObject} />
      )}

      {!showControls && onCancel ? (
        <Pressable style={styles.floatingCloseButton} onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      ) : null}

      {showHint ? (
        <View style={styles.hintContainer} pointerEvents="none">
          <Text style={styles.hintText}>{hintText}</Text>
        </View>
      ) : null}

      {statusMessage ? (
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusColor,
            },
          ]}
        >
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {mountError ? (
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>{mountError}</Text>
        </View>
      ) : null}

      {showControls ? (
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.iconButton, torch && styles.iconButtonActive]}
            onPress={() => {
              setTorch((previous) => {
                return !previous;
              });
            }}
          >
            <MaterialCommunityIcons
              name={torch ? "flashlight" : "flashlight-off"}
              size={26}
              color="#FFFFFF"
            />
          </Pressable>

          <Pressable
            style={styles.iconButton}
            onPress={() => {
              setZoomIndex((previous) => {
                return (previous + 1) % zoomLevels.length;
              });
            }}
          >
            <MaterialCommunityIcons
              name="magnify-plus"
              size={26}
              color="#FFFFFF"
            />

            <Text style={styles.iconButtonText}>
              {zoomLevels[zoomIndex]?.label ?? "Zoom"}
            </Text>
          </Pressable>

          {mode === "manual" ? (
            <Pressable
              style={[
                styles.scanButton,
                scanningEnabled && styles.scanButtonActive,
              ]}
              onPress={scanningEnabled ? stopScanning : startScanning}
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={24}
                color="#FFFFFF"
              />

              <Text style={styles.scanButtonText}>
                {scanningEnabled ? "Detener" : "Escanear"}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.scanButton, styles.scanButtonActive]}>
              <MaterialCommunityIcons
                name="barcode-scan"
                size={24}
                color="#FFFFFF"
              />

              <Text style={styles.scanButtonText}>Activo</Text>
            </View>
          )}

          {onCancel ? (
            <Pressable style={styles.iconButton} onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
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

  center: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionText: {
    marginBottom: 12,
    color: "#374151",
    fontSize: 15,
    textAlign: "center",
  },

  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },

  cancelPermissionButton: {
    marginTop: 10,
    backgroundColor: "#EF4444",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  floatingCloseButton: {
    position: "absolute",
    top: 18,
    right: 18,

    width: 44,
    height: 44,
    borderRadius: 22,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(0,0,0,0.62)",

    zIndex: 10,
  },

  hintContainer: {
    position: "absolute",
    bottom: 104,
    width: "100%",
    paddingHorizontal: 16,
    alignItems: "center",
  },

  hintText: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  statusBadge: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  errorBadge: {
    position: "absolute",
    top: 80,
    left: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(185,28,28,0.92)",
  },

  errorText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,

    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 10,

    backgroundColor: "rgba(0,0,0,0.55)",
  },

  iconButton: {
    minWidth: 56,
    minHeight: 56,
    padding: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  iconButtonActive: {
    backgroundColor: "rgba(245,158,11,0.95)",
  },

  iconButtonText: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  scanButton: {
    minWidth: 122,
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,

    backgroundColor: "#2563EB",
  },

  scanButtonActive: {
    backgroundColor: "#16A34A",
  },

  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

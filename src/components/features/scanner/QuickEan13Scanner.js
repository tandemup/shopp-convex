// components/features/scanner/QuickEan13Scanner.js

import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";

import ScannerOverlay from "./ScannerOverlay";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function normalizeEan13(value) {
  const code = String(value || "").trim();

  if (!/^\d{13}$/.test(code)) {
    return null;
  }

  return code;
}

function isValidEan13(value) {
  const code = normalizeEan13(value);

  if (!code) {
    return false;
  }

  const digits = code.split("").map(Number);

  const checksum = digits.slice(0, 12).reduce((sum, digit, index) => {
    return sum + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  const expectedCheckDigit = (10 - (checksum % 10)) % 10;

  return expectedCheckDigit === digits[12];
}

function clampZoom(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(1, number));
}

/* -------------------------------------------------
   Component
-------------------------------------------------- */

export default function QuickEan13Scanner({
  onDetected,
  onCancel,

  showControls = true,
  showStatusBadges = true,

  /*
   * expo-camera espera un valor de zoom entre 0 y 1.
   */
  zoom = 0.15,
  zoomLabel = "1.2x",
  torchEnabled = false,

  onChangeZoom,
  onToggleTorch,
}) {
  const isFocused = useIsFocused();

  const [permission, requestPermission] = useCameraPermissions();

  const lockedRef = useRef(false);

  const [mountError, setMountError] = useState("");

  const [cameraKey, setCameraKey] = useState(0);

  const normalizedZoom = clampZoom(zoom);

  /* -------------------------------------------------
     Screen lifecycle
  -------------------------------------------------- */

  useEffect(() => {
    if (isFocused) {
      lockedRef.current = false;

      setMountError("");
    }

    return () => {
      lockedRef.current = false;
    };
  }, [isFocused]);

  /* -------------------------------------------------
     Detection
  -------------------------------------------------- */

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (lockedRef.current) {
        return;
      }

      const barcode = normalizeEan13(data);

      if (!barcode || !isValidEan13(barcode)) {
        return;
      }

      lockedRef.current = true;

      onDetected?.(barcode);
    },
    [onDetected],
  );

  /* -------------------------------------------------
     Controls
  -------------------------------------------------- */

  function handleRetry() {
    lockedRef.current = false;

    setMountError("");

    setCameraKey((previous) => {
      return previous + 1;
    });
  }

  function handleClose() {
    lockedRef.current = false;

    onCancel?.();
  }

  function handleCameraMountError(event) {
    console.log("Quick EAN-13 camera mount error:", event?.message);

    setMountError(
      "No se pudo iniciar la cámara. Comprueba los permisos e inténtalo de nuevo.",
    );
  }

  /* -------------------------------------------------
     Permissions
  -------------------------------------------------- */

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />

        <Text style={styles.loadingText}>Preparando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Ionicons name="camera-outline" size={44} color="#64748B" />

        <Text style={styles.permissionTitle}>Permiso de cámara necesario</Text>

        <Text style={styles.permissionText}>
          Permite el acceso a la cámara para leer el código EAN-13 del producto.
        </Text>

        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleClose}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  /* -------------------------------------------------
     Camera
  -------------------------------------------------- */

  return (
    <View style={styles.container}>
      {isFocused ? (
        /*
         * CameraView solo muestra la vista previa.
         *
         * pointerEvents="none" evita que la cámara
         * intercepte los taps de los botones.
         */
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <CameraView
            key={cameraKey}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            autofocus="on"
            zoom={normalizedZoom}
            enableTorch={Boolean(torchEnabled)}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13"],
            }}
            onMountError={handleCameraMountError}
            onBarcodeScanned={handleBarcodeScanned}
          />
        </View>
      ) : null}

      <ScannerOverlay
        onCancel={handleClose}
        onChangeZoom={onChangeZoom}
        onToggleTorch={onToggleTorch}
        zoomLabel={zoomLabel}
        torchEnabled={torchEnabled}
        showControls={showControls}
        showStatusBadges={showStatusBadges}
        badgeLabel="Scanner"
        errorMessage={mountError}
        onRetry={handleRetry}
      />
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
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#000000",
  },

  loadingText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  permissionScreen: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
  },

  permissionTitle: {
    marginTop: 14,
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  permissionText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },

  primaryButton: {
    width: "100%",
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#2563EB",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondaryButton: {
    width: "100%",
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },

  secondaryButtonText: {
    color: "#374151",
    fontWeight: "700",
  },
});

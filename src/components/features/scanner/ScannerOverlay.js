// components/features/scanner/ScannerOverlay.js

import React from "react";

import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

/* -------------------------------------------------
   Component
-------------------------------------------------- */

export default function ScannerOverlay({
  onCancel,

  onChangeZoom,
  onToggleTorch,

  zoomLabel = "1.2x",
  torchEnabled = false,

  zoomAvailable = true,
  torchAvailable = true,

  showControls = true,

  hint = "Apunta al código de barras",

  title = "Leer código de barras",

  subtitle = "El número se procesará automáticamente cuando sea detectado.",

  processing = false,

  starting = false,

  errorMessage = "",

  onRetry,
}) {
  const zoomControlLabel = zoomAvailable ? `Zoom ${zoomLabel}` : "Sin zoom";

  const torchControlLabel = torchAvailable
    ? `Linterna ${torchEnabled ? "ON" : "OFF"}`
    : "Sin linterna";

  return (
    <SafeAreaView
      style={styles.overlay}
      edges={["top", "bottom", "left", "right"]}
      pointerEvents="box-none"
    >
      {/* Botón cerrar */}
      <Pressable
        style={styles.closeButton}
        onPress={onCancel}
        pointerEvents="auto"
      >
        <Ionicons name="close" size={44} color="#FFFFFF" />
      </Pressable>

      {/* Área central */}
      <View style={styles.centerBlock} pointerEvents="box-none">
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={styles.scanLine} />
        </View>

        <Text style={styles.hint} pointerEvents="none">
          {hint}
        </Text>

        {/* Botones grandes */}
        {showControls ? (
          <View style={styles.controlsRow} pointerEvents="box-none">
            <Pressable
              style={[
                styles.controlButton,
                !zoomAvailable && styles.controlButtonDisabled,
              ]}
              onPress={onChangeZoom}
              disabled={!zoomAvailable || !onChangeZoom}
              pointerEvents="auto"
            >
              <Ionicons name="scan-outline" size={22} color="#111827" />

              <Text style={styles.controlButtonText}>{zoomControlLabel}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.controlButton,
                torchEnabled && styles.controlButtonActive,
                !torchAvailable && styles.controlButtonDisabled,
              ]}
              onPress={onToggleTorch}
              disabled={!torchAvailable || !onToggleTorch}
              pointerEvents="auto"
            >
              <Ionicons
                name={torchEnabled ? "flashlight" : "flashlight-outline"}
                size={22}
                color="#111827"
              />

              <Text style={styles.controlButtonText}>{torchControlLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Área inferior */}
      <View style={styles.bottomPanel} pointerEvents="box-none">
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.subtitle}>{subtitle}</Text>

        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          pointerEvents="auto"
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>

        {processing ? (
          <View style={styles.messageRow} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" />

            <Text style={styles.processingText}>Procesando...</Text>
          </View>
        ) : null}

        {starting ? (
          <Text style={styles.startingText}>Iniciando cámara...</Text>
        ) : null}

        {errorMessage ? (
          <>
            <Text style={styles.errorText}>{errorMessage}</Text>

            {onRetry ? (
              <Pressable
                style={styles.retryButton}
                onPress={onRetry}
                pointerEvents="auto"
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    paddingHorizontal: 22,
    backgroundColor: "transparent",
  },

  closeButton: {
    position: "absolute",
    top: Platform.OS === "web" ? 24 : 16,
    right: 18,
    zIndex: 40,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 180,
  },

  scanFrame: {
    width: "92%",
    maxWidth: 560,
    height: 136,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  scanLine: {
    width: "88%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  hint: {
    marginTop: 24,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  controlsRow: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  controlButton: {
    minWidth: 160,
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#F3F4F6",
  },

  controlButtonActive: {
    backgroundColor: "#FDE68A",
  },

  controlButtonDisabled: {
    opacity: 0.55,
  },

  controlButtonText: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
  },

  bottomPanel: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: Platform.OS === "web" ? 34 : 24,
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 380,
    marginTop: 10,
    color: "rgba(255,255,255,0.86)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  cancelButton: {
    minWidth: 238,
    minHeight: 58,
    marginTop: 22,
    paddingHorizontal: 22,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  messageRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  processingText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  startingText: {
    marginTop: 12,
    color: "#BFDBFE",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  errorText: {
    maxWidth: 420,
    marginTop: 12,
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

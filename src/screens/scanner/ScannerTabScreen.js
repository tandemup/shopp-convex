// screens/scanner/ScannerTabScreen.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "convex/react";

import { ROUTES } from "@/src/navigation/ROUTES";
import { api } from "@/convex/_generated/api";
import { DEFAULT_BARCODE_SETTINGS } from "@/src/constants/barcodeFormats";
import { getBarcodeSettings } from "@/src/storage/barcodeSettingsStorage";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

function getEnabledBarcodeTypes(settings) {
  const formats = settings?.formats ?? DEFAULT_BARCODE_SETTINGS.formats;

  const enabled = Object.entries(formats)
    .filter(([, value]) => Boolean(value))
    .map(([formatId]) => formatId);

  if (enabled.length > 0) {
    return enabled;
  }

  return Object.entries(DEFAULT_BARCODE_SETTINGS.formats)
    .filter(([, value]) => Boolean(value))
    .map(([formatId]) => formatId);
}

export default function ScannerTabScreen({ navigation }) {
  const currentUser = useQuery(api.users.current);
  const isAdmin =
    currentUser?.isAdmin === true || currentUser?.role === "admin";

  const [barcodeSettings, setBarcodeSettings] = useState(
    DEFAULT_BARCODE_SETTINGS,
  );

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Scanner",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadBarcodeSettings = async () => {
        try {
          const data = await getBarcodeSettings();

          if (!mounted) return;

          setBarcodeSettings(data || DEFAULT_BARCODE_SETTINGS);
        } catch (error) {
          console.log(
            "❌ Error al cargar la configuración de códigos de barras:",
            error,
          );

          if (!mounted) return;

          setBarcodeSettings(DEFAULT_BARCODE_SETTINGS);
        }
      };

      loadBarcodeSettings();

      return () => {
        mounted = false;
      };
    }, []),
  );

  const enabledBarcodeTypes = getEnabledBarcodeTypes(barcodeSettings);
  const enabledFormatsLabel = enabledBarcodeTypes.join(", ");

  const goToScanner2 = () => {
    navigation.navigate(ROUTES.NEW_PRODUCT_SCANNER2, {
      saveToHistory: true,
      barcodeTypes: enabledBarcodeTypes,
    });
  };

  const goToScannedHistory = () => {
    navigation.navigate(ROUTES.SCANNED_HISTORY);
  };

  const goToAdminProductReviews = () => {
    navigation.navigate("AdminProductReviews");
  };

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.content}>
          <Text style={styles.title}>Scanner</Text>
          <Text style={styles.description}>
            Escanea nuevos productos o consulta el historial de códigos
            escaneados.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={goToScanner2}
            >
              <View style={styles.iconBox}>
                <Ionicons name="barcode-outline" size={26} color="#111827" />
              </View>

              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Escanear nuevo producto</Text>

                <Text style={styles.cardSubtitle}>
                  Abrir la cámara para leer un código de barras.
                </Text>

                <Text style={styles.cardMeta} numberOfLines={1}>
                  Formatos activos: {enabledFormatsLabel}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={goToScannedHistory}
            >
              <View style={styles.iconBox}>
                <Ionicons name="time-outline" size={26} color="#111827" />
              </View>

              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Historial de escaneos</Text>

                <Text style={styles.cardSubtitle}>
                  Ver productos y códigos escaneados anteriormente
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
            </Pressable>

            {isAdmin ? (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  styles.adminCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={goToAdminProductReviews}
              >
                <View style={[styles.iconBox, styles.adminIconBox]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={26}
                    color="#2563EB"
                  />
                </View>

                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>
                    Productos pendientes de revisión
                  </Text>

                  <Text style={styles.cardSubtitle}>
                    Corregir y aprobar productos enviados por usuarios
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={22} color="#2563EB" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const SCREEN_BACKGROUND = "#F9FAFB";
const CARD_BACKGROUND = "#FFFFFF";
const BORDER_COLOR = "#E5E7EB";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const TEXT_MUTED = "#9CA3AF";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },

  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },

  actions: {
    gap: 12,
  },

  card: {
    minHeight: 84,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  adminCard: {
    borderColor: "#BFDBFE",
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  adminIconBox: {
    backgroundColor: "#EFF6FF",
  },

  cardText: {
    flex: 1,
    paddingRight: 10,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: TEXT_SECONDARY,
  },

  cardMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 5,
  },
});

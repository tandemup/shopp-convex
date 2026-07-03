// screens/settings/BarcodeSettingsScreen.js

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Switch, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import {
  BARCODE_FORMATS,
  DEFAULT_BARCODE_SETTINGS,
} from "@/src/constants/barcodeFormats";

import {
  getBarcodeSettings,
  setBarcodeSettings,
} from "@/src/storage/barcodeSettingsStorage";

import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

export default function BarcodeSettingsScreen() {
  const navigation = useNavigation();

  const [settings, setSettings] = useState(DEFAULT_BARCODE_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Código de barras",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getBarcodeSettings();
        setSettings(data);
      } catch (error) {
        console.log("❌ Error loading barcode settings:", error);
        setSettings(DEFAULT_BARCODE_SETTINGS);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  const saveSettings = async (updated) => {
    try {
      setSettings(updated);

      if (!isReady) return;

      await setBarcodeSettings(updated);
    } catch (error) {
      console.log("❌ Error saving barcode settings:", error);
    }
  };

  const toggleFormat = (formatId) => {
    const currentValue = Boolean(settings?.formats?.[formatId]);

    const enabledCount = Object.values(settings?.formats ?? {}).filter(
      Boolean,
    ).length;

    if (currentValue && enabledCount <= 1) {
      return;
    }

    const updated = {
      ...settings,
      formats: {
        ...(settings?.formats ?? {}),
        [formatId]: !currentValue,
      },
    };

    saveSettings(updated);
  };

  const renderFormatRow = (format) => {
    const enabled = Boolean(settings?.formats?.[format.id]);

    return (
      <View style={styles.row} key={format.id}>
        <View style={styles.rowText}>
          <Text style={styles.label}>{format.label}</Text>
          <Text style={styles.description}>{format.description}</Text>
          <Text style={styles.formatId}>{format.id}</Text>
        </View>

        <Switch value={enabled} onValueChange={() => toggleFormat(format.id)} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar {...headerConfig.statusBar} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Selecciona qué formatos debe intentar leer el scanner. Para productos
          de supermercado, mantén activos EAN-13, EAN-8, UPC-A y UPC-E.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="barcode-outline" size={28} color="#111827" />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Formatos admitidos</Text>
              <Text style={styles.cardSubtitle}>
                Activa solo los formatos que realmente quieras detectar.
              </Text>
            </View>
          </View>

          <View style={styles.rowsGroup}>
            {Object.values(BARCODE_FORMATS).map(renderFormatRow)}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            Si activas demasiados formatos, algunos scanners pueden tardar más o
            detectar códigos no deseados. Para supermercado, empieza con EAN-13
            y UPC.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: "#6B7280",
  },

  rowsGroup: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  row: {
    minHeight: 72,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowText: {
    flex: 1,
    paddingRight: 12,
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },

  description: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
    marginBottom: 2,
  },

  formatId: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  infoCard: {
    marginTop: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#1E3A8A",
  },

  bottomSpacer: {
    height: 40,
  },
});

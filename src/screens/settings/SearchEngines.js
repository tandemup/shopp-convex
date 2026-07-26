// screens/settings/SearchEngines.js

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import {
  getSearchSettings,
  setSearchSettings,
  DEFAULT_SEARCH_SETTINGS,
} from "@/src/storage/settingsStorage";

import {
  SEARCH_ENGINES,
  BOOK_ENGINES,
  PRODUCT_SEARCH_ENGINE_IDS,
} from "@/src/screens/settings/SearchEngines";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

const CATEGORY_CONFIG = {
  product: {
    engines: SEARCH_ENGINES,
    selectedKey: "selectedProductEngine",
    legacyKey: "generalEngine",
    legacyMapKey: "productEngines",
  },

  book: {
    engines: BOOK_ENGINES,
    selectedKey: "selectedBookEngine",
    legacyKey: "bookEngine",
    legacyMapKey: "bookEngines",
  },
};

function buildSingleSelectionMap(engines, selectedId) {
  return Object.keys(engines).reduce((acc, id) => {
    acc[id] = id === selectedId;
    return acc;
  }, {});
}

export default function SearchEngines() {
  const navigation = useNavigation();
  const route = useRoute();

  const type = route.params?.type ?? "all";

  const [settings, setSettings] = useState(DEFAULT_SEARCH_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  const showProducts = type === "product" || type === "all";
  const showBooks = type === "book" || type === "all";

  const screenCopy = useMemo(() => {
    if (type === "product") {
      return {
        title: "Motores de productos",
        subtitle:
          "Elige el motor que se usará al buscar productos o códigos de barras.",
      };
    }

    if (type === "book") {
      return {
        title: "Motores de libros",
        subtitle: "Elige el motor que se usará al buscar libros.",
      };
    }

    return {
      title: "Motor de búsqueda",
      subtitle:
        "Elige los motores predeterminados para productos, códigos de barras y libros.",
    };
  }, [type]);

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: screenCopy.title,
        preset: "light",
      }),
    [screenCopy.title],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getSearchSettings();
        setSettings(data);
      } catch (err) {
        console.log("❌ Error loading search settings:", err);
        setSettings(DEFAULT_SEARCH_SETTINGS);
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

      await setSearchSettings(updated);
    } catch (err) {
      console.log("❌ Error saving search settings:", err);
    }
  };

  const selectEngine = (category, engineId) => {
    const config = CATEGORY_CONFIG[category];

    if (!config) return;

    const updated = {
      ...settings,

      // Modelo nuevo: selección única.
      [config.selectedKey]: engineId,

      // Compatibilidad con código antiguo.
      [config.legacyKey]: engineId,

      // Compatibilidad con mapas antiguos tipo { google: true, bing: false }.
      [config.legacyMapKey]: buildSingleSelectionMap(config.engines, engineId),
    };

    saveSettings(updated);
  };

  const renderEngineRow = ({ category, engine }) => {
    const config = CATEGORY_CONFIG[category];

    if (!config) return null;

    const selectedId =
      settings?.[config.selectedKey] ?? settings?.[config.legacyKey];

    const selected = selectedId === engine.id;

    return (
      <Pressable
        key={engine.id}
        onPress={() => selectEngine(category, engine.id)}
        style={({ pressed }) => [
          styles.row,
          selected && styles.rowSelected,
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.rowText}>
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {engine.label}
          </Text>

          <Text style={styles.engineId}>{engine.id}</Text>

          {engine.description ? (
            <Text style={styles.engineDescription}>{engine.description}</Text>
          ) : null}
        </View>

        <View
          style={[styles.radioOuter, selected && styles.radioOuterSelected]}
        >
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
      </Pressable>
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
        <Text style={styles.subtitle}>{screenCopy.subtitle}</Text>

        {showProducts ? (
          <>
            <Text style={styles.sectionTitle}>Productos</Text>

            {PRODUCT_SEARCH_ENGINE_IDS.map((engineId) => {
              const engine = SEARCH_ENGINES[engineId];

              if (!engine) return null;

              return renderEngineRow({
                category: "product",
                engine,
              });
            })}
          </>
        ) : null}

        {showBooks ? (
          <>
            <Text style={styles.sectionTitle}>Libros</Text>

            {Object.values(BOOK_ENGINES).map((engine) =>
              renderEngineRow({
                category: "book",
                engine,
              }),
            )}
          </>
        ) : null}

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

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 18,
    marginBottom: 10,
  },

  row: {
    minHeight: 68,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowSelected: {
    borderColor: "#14B8A6",
    backgroundColor: "#F0FDFA",
  },

  rowPressed: {
    opacity: 0.8,
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

  labelSelected: {
    color: "#0F766E",
  },

  engineId: {
    fontSize: 13,
    color: "#6B7280",
  },

  engineDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  radioOuterSelected: {
    borderColor: "#14B8A6",
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#14B8A6",
  },

  bottomSpacer: {
    height: 40,
  },
});

import React, { useEffect, useState } from "react";
import { View, Text, Switch, StyleSheet, ScrollView } from "react-native";

import {
  getSearchSettings,
  setSearchSettings,
} from "@/src/storage/settingsStorage";

const DEFAULT_SETTINGS = {
  bookEngines: {
    googleBooks: true,
    openLibrary: true,
    amazonBooks: false,
    goodreads: false,
  },
  productEngines: {
    googleShopping: true,
    amazon: false,
    openFoodFacts: true,
    idealo: false,
  },
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  /* ---------------------------
     Load
  ----------------------------*/
  useEffect(() => {
    const init = async () => {
      try {
        const data = await getSearchSettings();
        setSettings(data);
      } catch (err) {
        console.log("❌ Error loading settings:", err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  /* ---------------------------
     Save helper
  ----------------------------*/
  const saveSettings = async (updated) => {
    try {
      setSettings(updated);

      if (!isReady) return;
      await setSearchSettings(updated);
    } catch (err) {
      console.log("❌ Error saving settings:", err);
    }
  };

  /* ---------------------------
     Toggle
  ----------------------------*/
  const toggleEngine = (category, key) => {
    const updated = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: !settings[category][key],
      },
    };

    saveSettings(updated);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Configuración</Text>

      {/* 📚 Libros */}
      <Text style={styles.sectionTitle}>Motores de búsqueda para libros</Text>

      {Object.entries(settings.bookEngines).map(([key, value]) => (
        <View style={styles.row} key={key}>
          <Text style={styles.label}>{formatEngineName(key)}</Text>
          <Switch
            value={value}
            onValueChange={() => toggleEngine("bookEngines", key)}
          />
        </View>
      ))}

      {/* 🛒 Productos */}
      <Text style={styles.sectionTitle}>
        Motores de búsqueda para productos
      </Text>

      {Object.entries(settings.productEngines).map(([key, value]) => (
        <View style={styles.row} key={key}>
          <Text style={styles.label}>{formatEngineName(key)}</Text>
          <Switch
            value={value}
            onValueChange={() => toggleEngine("productEngines", key)}
          />
        </View>
      ))}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

/* ---------------------------
   Helpers
----------------------------*/
const formatEngineName = (key) => {
  const map = {
    googleBooks: "Google Books",
    openLibrary: "OpenLibrary",
    amazonBooks: "Amazon Books",
    goodreads: "Goodreads",
    googleShopping: "Google Shopping",
    amazon: "Amazon",
    openFoodFacts: "OpenFoodFacts",
    idealo: "Idealo",
  };
  return map[key] ?? key;
};

/* ---------------------------
   Styles
----------------------------*/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAFAFA",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    color: "#1a237e",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  label: {
    fontSize: 16,
  },
});

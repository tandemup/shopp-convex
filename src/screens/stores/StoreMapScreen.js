import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

const DEFAULT_USER_LAT = 43.5322;
const DEFAULT_USER_LNG = -5.6611;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export default function StoreMapScreen({ route }) {
  const navigation = useNavigation();

  const { stores = [], userLocation } = route.params ?? {};

  const userLat = userLocation?.lat ?? DEFAULT_USER_LAT;
  const userLng = userLocation?.lng ?? DEFAULT_USER_LNG;

  const validStores = useMemo(
    () =>
      stores
        .filter(
          (store) =>
            Number.isFinite(store.location?.lat) &&
            Number.isFinite(store.location?.lng),
        )
        .map((store) => ({
          ...store,
          name: escapeHtml(store.name),
          address: escapeHtml(store.address),
        })),
    [stores],
  );

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Mapa de tiendas",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  const hasUserLocation =
    userLocation?.lat != null && userLocation?.lng != null;

  const html = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html,
    body,
    #map {
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const map = L.map("map").setView([${userLat}, ${userLng}], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    ${
      hasUserLocation
        ? `
    L.marker([${userLat}, ${userLng}])
      .addTo(map)
      .bindPopup("Tu ubicación");
    `
        : ""
    }

    const stores = ${JSON.stringify(validStores)};

    stores.forEach((store) => {
      L.marker([store.location.lat, store.location.lng])
        .addTo(map)
        .bindPopup(
          "<b>" + store.name + "</b><br/>" +
          (store.address ?? "")
        );
    });
  </script>
</body>
</html>
`,
    [userLat, userLng, hasUserLocation, validStores],
  );

  if (validStores.length === 0) {
    return (
      <View style={styles.screen}>
        <StatusBar {...headerConfig.statusBar} />

        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="map-outline" size={34} color="#9CA3AF" />
            </View>

            <Text style={styles.emptyTitle}>No hay tiendas en el mapa</Text>

            <Text style={styles.emptyText}>
              No se encontraron tiendas con coordenadas válidas para mostrar.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.webview}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  webview: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
});

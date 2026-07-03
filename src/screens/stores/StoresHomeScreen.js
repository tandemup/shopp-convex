import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROUTES } from "@/src/navigation/ROUTES";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

/* -------------------------------------------------
   Menu Item
-------------------------------------------------- */
function MenuItem({ icon, title, subtitle, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={28} color="#111827" />
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
    </Pressable>
  );
}

/* -------------------------------------------------
   Screen
-------------------------------------------------- */
export default function StoresHomeScreen() {
  const navigation = useNavigation();

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Tiendas",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.content}>
          <Text style={styles.title}>Tiendas</Text>

          <Text style={styles.subtitle}>
            Explora tiendas, consulta tus favoritas o busca establecimientos
            cercanos.
          </Text>

          <View style={styles.actions}>
            <MenuItem
              icon="storefront-outline"
              title="Explorar tiendas"
              subtitle="Buscar tiendas cercanas o por nombre"
              onPress={() => navigation.navigate(ROUTES.STORES_BROWSE)}
            />

            <MenuItem
              icon="star-outline"
              title="Tiendas favoritas"
              subtitle="Acceso rápido a tus tiendas habituales"
              onPress={() => navigation.navigate(ROUTES.STORES_FAVORITES)}
            />

            <MenuItem
              icon="map-outline"
              title="Tiendas cercanas"
              subtitle="Ordenadas por distancia"
              onPress={() => navigation.navigate(ROUTES.STORES_NEARBY)}
            />

            <MenuItem
              icon="information-circle-outline"
              title="Información de tiendas"
              subtitle="Horarios, direcciones y estado"
              onPress={() => navigation.navigate(ROUTES.STORE_INFO)}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 24,
  },

  actions: {
    gap: 14,
  },

  card: {
    minHeight: 86,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
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

  cardText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
});

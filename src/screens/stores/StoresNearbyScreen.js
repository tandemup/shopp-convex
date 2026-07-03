// screens/StoresNearbyScreen.js
import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStores } from "@/src/context/StoresContext";
import { useStoresWithDistance } from "@/src/hooks/useStoresWithDistance";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";
import { ROUTES } from "@/src/navigation/ROUTES";

/* ---------------------------------------------
   Helpers
---------------------------------------------- */
const formatDistanceKm = (distance) => {
  if (!Number.isFinite(distance)) return null;

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};

/* ---------------------------------------------
   Screen
---------------------------------------------- */
export default function StoresNearbyScreen() {
  const navigation = useNavigation();

  const { toggleFavoriteStore, isFavoriteStore } = useStores();
  const { sortedStores, loading, hasLocation } = useStoresWithDistance();

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Tiendas cercanas",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  const handlePressStore = (store) => {
    navigation.navigate(ROUTES.STORE_DETAIL, {
      storeId: store.id,
    });
  };

  /* ---------------------------------------------
     Render fila
  ---------------------------------------------- */
  const renderStoreRow = ({ item: store }) => {
    const isFavorite = isFavoriteStore(store.id);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handlePressStore(store)}
      >
        <View style={styles.iconBox}>
          <Ionicons name="location-outline" size={26} color="#111827" />
        </View>

        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {store.name}
          </Text>

          {store.address ? (
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {store.address}
            </Text>
          ) : null}

          <Text style={styles.cardMeta} numberOfLines={1}>
            {store.city}
            {Number.isFinite(store.distance)
              ? ` · a ${formatDistanceKm(store.distance)}`
              : ""}
          </Text>
        </View>

        <Pressable
          onPress={() => toggleFavoriteStore(store.id)}
          hitSlop={10}
          style={styles.starButton}
        >
          <Ionicons
            name={isFavorite ? "star" : "star-outline"}
            size={22}
            color={isFavorite ? "#F59E0B" : "#9CA3AF"}
          />
        </Pressable>

        <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
      </Pressable>
    );
  };

  /* ---------------------------------------------
     Loading
  ---------------------------------------------- */
  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar {...headerConfig.statusBar} />

        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
          <View style={styles.content}>
            <Text style={styles.title}>Tiendas cercanas</Text>

            <Text style={styles.subtitle}>
              Busca tiendas próximas a tu ubicación actual.
            </Text>

            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="location-outline" size={34} color="#9CA3AF" />
              </View>

              <Text style={styles.emptyTitle}>Buscando tiendas cercanas…</Text>

              <Text style={styles.emptyText}>
                Estamos calculando la distancia de las tiendas disponibles.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /* ---------------------------------------------
     No location
  ---------------------------------------------- */
  if (!hasLocation) {
    return (
      <View style={styles.screen}>
        <StatusBar {...headerConfig.statusBar} />

        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
          <View style={styles.content}>
            <Text style={styles.title}>Tiendas cercanas</Text>

            <Text style={styles.subtitle}>
              Busca tiendas próximas a tu ubicación actual.
            </Text>

            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="navigate-outline" size={34} color="#9CA3AF" />
              </View>

              <Text style={styles.emptyTitle}>
                No se pudo obtener tu ubicación
              </Text>

              <Text style={styles.emptyText}>
                Revisa los permisos de ubicación para ordenar las tiendas por
                cercanía.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /* ---------------------------------------------
     Render
  ---------------------------------------------- */
  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.content}>
          <Text style={styles.title}>Tiendas cercanas</Text>

          <Text style={styles.subtitle}>
            Consulta las tiendas ordenadas por distancia desde tu ubicación.
          </Text>

          <Text style={styles.countText}>
            {sortedStores.length} tienda{sortedStores.length === 1 ? "" : "s"}
          </Text>

          <FlatList
            data={sortedStores}
            keyExtractor={(item) => item.id}
            renderItem={renderStoreRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              sortedStores.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons
                    name="storefront-outline"
                    size={34}
                    color="#9CA3AF"
                  />
                </View>

                <Text style={styles.emptyTitle}>No hay tiendas cercanas</Text>

                <Text style={styles.emptyText}>
                  No se encontraron tiendas disponibles para mostrar.
                </Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------------------------------------
   Styles
---------------------------------------------- */
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
    marginBottom: 18,
  },

  countText: {
    marginBottom: 10,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
  },

  listContent: {
    paddingTop: 4,
    paddingBottom: 32,
    gap: 14,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
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
    paddingRight: 10,
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
    marginBottom: 3,
  },

  cardMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  starButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
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

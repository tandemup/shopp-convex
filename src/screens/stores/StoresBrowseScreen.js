// screens/StoresBrowseScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStores } from "@/src/context/StoresContext";
import { useLocation } from "@/src/context/LocationContext";
import { distanceMetersBetween } from "@/src/utils/math/distance";
import { formatDistance } from "@/src/utils/math/formatDistance";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

import SearchBar from "@/src/components/features/search/SearchBar";
import { ROUTES } from "@/src/navigation/ROUTES";

/* -------------------------------------------------
   Screen
-------------------------------------------------- */
export default function StoresBrowseScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { selectForListId, mode } = route.params || {};
  const isSelectMode = mode === "select";

  const { stores, toggleFavoriteStore, isFavoriteStore } = useStores();
  const { location } = useLocation();

  const [query, setQuery] = useState("");

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: isSelectMode ? "Seleccionar tienda" : "Explorar tiendas",
        preset: "light",
      }),
    [isSelectMode],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  /* ---------------------------------------------
     Ordenar + enriquecer con distancia
  ---------------------------------------------- */
  const orderedStores = useMemo(() => {
    const enriched = stores.map((store) => {
      if (
        location?.lat != null &&
        location?.lng != null &&
        store.location?.lat != null &&
        store.location?.lng != null
      ) {
        const distance = distanceMetersBetween(
          location.lat,
          location.lng,
          store.location.lat,
          store.location.lng,
        );

        return { ...store, distance };
      }

      return { ...store, distance: null };
    });

    if (location?.lat != null && location?.lng != null) {
      return [...enriched].sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }

    return [...enriched].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [stores, location]);

  const normalize = (text = "") =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filteredStores = useMemo(() => {
    if (!query.trim()) return orderedStores;

    const q = normalize(query);

    return orderedStores.filter((store) => {
      return (
        normalize(store.name).includes(q) ||
        normalize(store.address).includes(q) ||
        normalize(store.city).includes(q)
      );
    });
  }, [orderedStores, query]);

  /* ---------------------------------------------
     Navegación
  ---------------------------------------------- */
  const handlePressStore = (store) => {
    if (isSelectMode && selectForListId) {
      navigation.navigate(ROUTES.SHOPPING_TAB, {
        screen: ROUTES.SHOPPING_LIST,
        params: {
          listId: selectForListId,
          selectedStore: store,
        },
      });
      return;
    }

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
          <Ionicons name="storefront-outline" size={26} color="#111827" />
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
            {store.distance != null
              ? ` · ${formatDistance(store.distance)}`
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

  const countLabel = query.trim()
    ? `${filteredStores.length} resultado${
        filteredStores.length === 1 ? "" : "s"
      }`
    : `${filteredStores.length} tienda${
        filteredStores.length === 1 ? "" : "s"
      }`;

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.content}>
          <Text style={styles.title}>Tiendas</Text>

          <Text style={styles.subtitle}>
            Busca tiendas, consulta las más cercanas y marca tus favoritas.
          </Text>

          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar tienda…"
            style={styles.search}
          />

          <Text style={styles.countText}>{countLabel}</Text>

          <FlatList
            data={filteredStores}
            keyExtractor={(item) => item.id}
            renderItem={renderStoreRow}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              filteredStores.length === 0 && styles.emptyListContent,
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

                <Text style={styles.emptyTitle}>No se encontraron tiendas</Text>

                <Text style={styles.emptyText}>
                  Prueba a cambiar la búsqueda o revisa el filtro aplicado.
                </Text>
              </View>
            }
          />
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
    marginBottom: 18,
  },

  search: {
    marginBottom: 12,
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

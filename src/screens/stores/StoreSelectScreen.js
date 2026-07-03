// screens/StoreSelectScreen.js
import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useStores } from "@/src/context/StoresContext";
import { useLists } from "@/src/context/ListsContext";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";
import { ROUTES } from "@/src/navigation/ROUTES";

/* --------------------------------------------------
 Helpers
-------------------------------------------------- */
const formatDistance = (d) => {
  if (d == null) return "";
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
};

export default function StoreSelectScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { selectForListId } = route.params ?? {};

  const { favoriteStores, toggleFavoriteStore, isFavoriteStore } = useStores();
  const { updateListStore } = useLists();

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Seleccionar tienda",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  /* --------------------------------------------------
   Actions
  -------------------------------------------------- */
  const handleSelectStore = (store) => {
    if (!selectForListId) return;

    updateListStore(selectForListId, store.id);
    navigation.goBack();
  };

  const handlePressStore = (store) => {
    navigation.navigate(ROUTES.STORE_DETAIL, {
      storeId: store.id,
      listId: selectForListId,
    });
  };

  const goToExploreStores = () => {
    navigation.navigate(ROUTES.STORES_TAB, {
      screen: ROUTES.STORES,
      params: { mode: "select", selectForListId },
    });
  };

  function ExplorerButton({ display }) {
    if (!display) return null;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.exploreButton,
          pressed && styles.cardPressed,
        ]}
        onPress={goToExploreStores}
      >
        <Ionicons name="search-outline" size={18} color="#FFFFFF" />
        <Text style={styles.exploreText}>Explorar tiendas</Text>
      </Pressable>
    );
  }

  const renderScreen = (children) => (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        {children}
      </SafeAreaView>
    </View>
  );

  /* --------------------------------------------------
   Empty state
  -------------------------------------------------- */
  if (!favoriteStores || favoriteStores.length === 0) {
    return renderScreen(
      <View style={styles.content}>
        <Text style={styles.title}>Seleccionar tienda</Text>

        <Text style={styles.subtitle}>
          Elige una tienda favorita para asociarla a esta lista de compra.
        </Text>

        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="storefront-outline" size={34} color="#9CA3AF" />
          </View>

          <Text style={styles.emptyTitle}>No tienes tiendas favoritas</Text>

          <Text style={styles.emptySubtitle}>
            Marca una tienda como favorita para poder seleccionarla rápidamente.
          </Text>

          <ExplorerButton display />
        </View>
      </View>,
    );
  }

  /* --------------------------------------------------
   Render
  -------------------------------------------------- */
  const renderStoreRow = ({ item: store }) => {
    const isFavorite = isFavoriteStore(store.id);
    const isSelectMode = Boolean(selectForListId);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          isSelectMode ? handleSelectStore(store) : handlePressStore(store)
        }
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

  return renderScreen(
    <View style={styles.content}>
      <Text style={styles.title}>Seleccionar tienda</Text>

      <Text style={styles.subtitle}>
        Elige una tienda favorita para asociarla a esta lista de compra.
      </Text>

      <ExplorerButton display />

      <FlatList
        data={favoriteStores}
        keyExtractor={(item) => item.id}
        renderItem={renderStoreRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>,
  );
}

/* --------------------------------------------------
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

  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
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

  exploreButton: {
    alignSelf: "center",
    minHeight: 42,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },

  exploreText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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

  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 22,
  },
});

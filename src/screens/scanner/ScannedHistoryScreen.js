// screens/scanner/ScannedHistoryScreen.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROUTES } from "@/src/navigation/ROUTES";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { safeQuestion } from "@/src/components/ui/alert/safeQuestion";

import { useScannedHistoryStorage } from "@/src/hooks/useScannedHistoryStorage";
import SearchBar from "@/src/components/features/search/SearchBar";

export default function ScannedHistoryScreen({ navigation, route }) {
  const [scannedItems, setScannedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);

  const isFocused = useIsFocused();
  const scanHistoryStorage = useScannedHistoryStorage();

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Historial de escaneos",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  const loadScannedHistory = useCallback(async () => {
    try {
      const all = await scanHistoryStorage.getScannedHistory();

      const onlyScanned = all.filter((item) => Boolean(item?.barcode));

      onlyScanned.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.scannedAt || 0).valueOf();
        const dateB = new Date(b.updatedAt || b.scannedAt || 0).valueOf();

        return dateB - dateA;
      });

      setScannedItems(onlyScanned);
      setFilteredItems(onlyScanned);
    } catch (error) {
      console.log("Error loading scanned history:", error);
      safeAlert("Error", "No se pudo cargar el historial de escaneos");
    }
  }, [scanHistoryStorage]);

  useEffect(() => {
    if (isFocused) {
      loadScannedHistory();
    }
  }, [isFocused, loadScannedHistory]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) {
      setFilteredItems(scannedItems);
      return;
    }

    const results = scannedItems.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const barcode = String(item.barcode || "").toLowerCase();
      const brand = String(item.brand || "").toLowerCase();

      return name.includes(q) || barcode.includes(q) || brand.includes(q);
    });

    setFilteredItems(results);
  }, [searchQuery, scannedItems]);

  const handleDelete = (item) => {
    safeQuestion(
      "Eliminar escaneo",
      `¿Deseas eliminar este escaneo?\n\n${item.name || item.barcode}`,
      {
        yesStyle: "destructive",
        onYes: async () => {
          try {
            await scanHistoryStorage.removeScannedItem(item.barcode);
            await loadScannedHistory();
          } catch (error) {
            console.log("Error deleting scanned item:", error);
            safeAlert("Error", "No se pudo eliminar el escaneo");
          }
        },
      },
    );
  };

  const getItemImage = (item) => {
    return item.thumbnailUri || item.imageUrl || null;
  };

  const openItem = (item) => {
    navigation.navigate(ROUTES.EDIT_SCANNED_ITEM, {
      item,
      product: item,
      barcode: item.barcode,
    });
  };

  const renderItem = ({ item }) => {
    const imageUri = getItemImage(item);

    return (
      <View style={[styles.card, item.isBook && styles.cardBook]}>
        <Pressable
          style={({ pressed }) => [
            styles.mainPressable,
            pressed && styles.cardPressed,
          ]}
          onPress={() => openItem(item)}
          onLongPress={() => handleDelete(item)}
        >
          <View style={styles.imageWrapper}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={26} color="#9CA3AF" />
              </View>
            )}
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.name} numberOfLines={2}>
              {item.isBook ? "📚 " : ""}
              {item.name || "Sin nombre"}
            </Text>

            <Text style={styles.brand} numberOfLines={1}>
              {item.brand || "N/A"}
            </Text>

            <Text style={styles.count}>
              Escaneos: {item.scanCount ?? 1}
              {item.scannedAt
                ? ` · ${new Date(item.scannedAt).toLocaleDateString("es-ES")}`
                : ""}
            </Text>
          </View>

          <View style={styles.actionsCol}>
            <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
          </View>
        </Pressable>
      </View>
    );
  };

  const emptyMessage = scannedItems.length
    ? "No se encontraron resultados"
    : "No hay escaneos guardados";

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.content}>
          <Text style={styles.title}>Historial de Escaneos</Text>

          <Text style={styles.subtitle}>
            Consulta productos y códigos de barras escaneados anteriormente.
          </Text>

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar producto, marca o código..."
            style={styles.searchBar}
          />

          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.id?.toString() || item.barcode?.toString() || `scan-${index}`
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons name="barcode-outline" size={34} color="#9CA3AF" />
                <Text style={styles.empty}>{emptyMessage}</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
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

  searchBar: {
    marginBottom: 16,
  },

  listContent: {
    paddingBottom: 80,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
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

  cardBook: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },

  mainPressable: {
    flexDirection: "row",
    alignItems: "center",
  },

  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginRight: 14,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
    justifyContent: "center",
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },

  brand: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },

  count: {
    fontSize: 13,
    color: "#6B7280",
  },

  actionsCol: {
    justifyContent: "center",
    marginLeft: 8,
  },

  emptyBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },

  empty: {
    marginTop: 10,
    fontSize: 15,
    textAlign: "center",
    color: "#6B7280",
  },
});

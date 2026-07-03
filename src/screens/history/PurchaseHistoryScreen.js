import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DatePill from "@/src/components/controls/DatePill";
import StorePill from "@/src/components/controls/StorePill";
import SearchBar from "@/src/components/features/search/SearchBar";

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";
import { ROUTES } from "@/src/navigation/ROUTES";

import StoreFilterBadges from "@/src/components/features/stores/StoreFilterBadges";

import {
  queryProducts,
  getStoresFromPurchaseHistory,
} from "@/src/utils/queries/products";

import { formatCurrency } from "@/src/utils/store/formatters";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

const toTimestamp = (value) => {
  if (!value) return 0;

  if (typeof value === "number") return value;

  const date = new Date(value);
  const time = date.getTime();

  return Number.isNaN(time) ? 0 : time;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const normalizeLabel = (value, fallback) => {
  const text = String(value ?? "").trim();

  return text || fallback;
};

const getPurchaseQuantity = (purchase) => {
  const quantity = Number(purchase?.quantity ?? purchase?.qty ?? 1);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getProductTotalSpent = (product) => {
  if (Array.isArray(product?.purchases) && product.purchases.length > 0) {
    return product.purchases.reduce((sum, purchase) => {
      return sum + toNumber(purchase?.priceInfo?.total ?? purchase?.total, 0);
    }, 0);
  }

  return toNumber(product?.totalSpent ?? product?.priceInfo?.total, 0);
};

const groupPurchasesByStore = (purchases = [], getStoreById) => {
  const map = new Map();

  purchases.forEach((purchase) => {
    const key = purchase.storeId ?? "__no_store__";

    const store = purchase.storeId ? getStoreById(purchase.storeId) : null;

    if (!map.has(key)) {
      map.set(key, {
        storeId: purchase.storeId ?? null,
        store,
        purchases: [],
        totalUnits: 0,
        totalSpent: 0,
        lastPurchasedAt: purchase.purchasedAt,
      });
    }

    const group = map.get(key);

    group.purchases.push(purchase);

    group.totalUnits += getPurchaseQuantity(purchase);

    group.totalSpent += toNumber(
      purchase?.priceInfo?.total ?? purchase?.total,
      0,
    );

    if (
      toTimestamp(purchase.purchasedAt) > toTimestamp(group.lastPurchasedAt)
    ) {
      group.lastPurchasedAt = purchase.purchasedAt;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    return toTimestamp(b.lastPurchasedAt) - toTimestamp(a.lastPurchasedAt);
  });
};

const groupProductsByClassification = (products = []) => {
  const map = new Map();

  products.forEach((product) => {
    const categoryName = normalizeLabel(product?.categoryName, "Sin categoría");

    const subcategoryName = normalizeLabel(
      product?.subcategoryName,
      "Sin subcategoría",
    );

    const categoryKey = product?.categoryId ?? categoryName;

    const subcategoryKey = product?.subcategoryId ?? subcategoryName;

    const key = `${categoryKey}::${subcategoryKey}`;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        categoryName,
        subcategoryName,
        products: [],
        purchases: [],
        totalUnits: 0,
        totalPurchases: 0,
        totalSpent: 0,
        lastPurchasedAt: product?.lastPurchasedAt,
        storeId: product?.storeId ?? null,
      });
    }

    const group = map.get(key);

    group.products.push(product);

    if (Array.isArray(product?.purchases)) {
      group.purchases.push(...product.purchases);
    }

    group.totalUnits += toNumber(product?.totalUnits, 0);

    group.totalPurchases += toNumber(product?.frequency, 0);

    group.totalSpent += getProductTotalSpent(product);

    if (
      toTimestamp(product?.lastPurchasedAt) > toTimestamp(group.lastPurchasedAt)
    ) {
      group.lastPurchasedAt = product.lastPurchasedAt;

      group.storeId = product?.storeId ?? null;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    return toTimestamp(b.lastPurchasedAt) - toTimestamp(a.lastPurchasedAt);
  });
};

/* -------------------------------------------------
   Components
-------------------------------------------------- */

const ProductCountText = ({ units, purchases }) => {
  const safeUnits = Number(units ?? 0);

  const safePurchases = Number(purchases ?? 0);

  return (
    <View style={styles.iconRow}>
      <Ionicons name="cart-outline" size={17} color="#6B7280" />

      <Text style={styles.productsText}>
        {safeUnits === 1 ? "1 producto" : `${safeUnits} productos`} ·{" "}
        {safePurchases === 1 ? "1 compra" : `${safePurchases} compras`}
      </Text>
    </View>
  );
};

const StoreSummaryRow = ({ group, onPressStore }) => {
  return (
    <View style={styles.storeSummaryRow}>
      <View style={styles.storeSummaryLeft}>
        <View style={styles.storePillWrap}>
          <StorePill store={group.store} onPressStore={onPressStore} />
        </View>

        <View style={styles.storeMetaRow}>
          <DatePill
            date={group.lastPurchasedAt}
            fallback="Sin fecha"
            icon="calendar-outline"
          />

          <Text style={styles.storeUnitsText}>
            {group.totalUnits === 1
              ? "1 producto"
              : `${group.totalUnits} productos`}
          </Text>
        </View>
      </View>

      <Text style={styles.storeTotal}>{formatCurrency(group.totalSpent)}</Text>
    </View>
  );
};

const ProductSummaryRow = ({ product, onPress }) => {
  return (
    <Pressable
      onPress={() => onPress(product)}
      style={({ pressed }) => [
        styles.productSummaryRow,
        pressed && styles.productSummaryRowPressed,
      ]}
    >
      <View style={styles.productSummaryLeft}>
        <View style={styles.productIconBox}>
          <Ionicons name="basket-outline" size={19} color="#2563EB" />
        </View>

        <View style={styles.productSummaryText}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name || "Producto sin nombre"}
          </Text>

          <Text style={styles.productMeta}>
            {toNumber(product.totalUnits, 0)} producto
            {toNumber(product.totalUnits, 0) === 1 ? "" : "s"} ·{" "}
            {toNumber(product.frequency, 0)} compra
            {toNumber(product.frequency, 0) === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <View style={styles.productSummaryRight}>
        <Text style={styles.productTotal}>
          {formatCurrency(getProductTotalSpent(product))}
        </Text>

        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </Pressable>
  );
};

const PurchaseHistoryCard = ({
  item,
  expanded,
  onToggle,
  onPressStore,
  onPressProduct,
  getStoreById,
}) => {
  const storeGroups = useMemo(() => {
    return groupPurchasesByStore(item.purchases, getStoreById);
  }, [item.purchases, getStoreById]);

  const lastStore = item.storeId ? getStoreById(item.storeId) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconBox}>
          <Ionicons name="albums-outline" size={26} color="#111827" />
        </View>

        <View style={styles.cardText}>
          <View style={styles.topRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.categoryName}
            </Text>

            <Pressable onPress={onToggle} style={styles.chevronPressable}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color="#9CA3AF"
                style={{
                  transform: [{ rotate: expanded ? "90deg" : "0deg" }],
                }}
              />
            </Pressable>
          </View>

          <View style={styles.categoryRow}>
            <View style={styles.subcategoryPill}>
              <Text style={styles.subcategoryPillText} numberOfLines={1}>
                {item.subcategoryName}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <DatePill
              date={item.lastPurchasedAt}
              fallback="Sin fecha"
              icon="calendar-outline"
            />

            <StorePill store={lastStore} onPressStore={onPressStore} />
          </View>
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.bottomRow}>
        <ProductCountText
          units={item.totalUnits}
          purchases={item.totalPurchases}
        />

        <View style={styles.priceBox}>
          <Ionicons name="pricetag-outline" size={17} color="#059669" />

          <Text style={styles.price}>{formatCurrency(item.totalSpent)}</Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.storesContainer}>
          <Text style={styles.sectionTitle}>Productos</Text>

          {item.products.map((product) => (
            <ProductSummaryRow
              key={product.id}
              product={product}
              onPress={onPressProduct}
            />
          ))}

          <View style={styles.innerSeparator} />
          <Text style={styles.sectionTitle}>Comprado en tiendas</Text>

          {storeGroups.length > 0 ? (
            storeGroups.map((group) => (
              <StoreSummaryRow
                key={group.storeId ?? "no-store"}
                group={group}
                onPressStore={onPressStore}
              />
            ))
          ) : (
            <Text style={styles.emptyStoresText}>
              No hay información de tiendas disponible.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
};

/* -------------------------------------------------
   Screen
-------------------------------------------------- */

export default function PurchaseHistoryScreen() {
  const navigation = useNavigation();

  const lists = useLists();

  const { purchaseHistory = [] } = lists;

  const { getStoreById } = useStores();

  const [search, setSearch] = useState("");

  const [selectedStore, setSelectedStore] = useState(null);

  const [expandedClassificationId, setExpandedClassificationId] =
    useState(null);

  const sourceProducts = useMemo(() => {
    return purchaseHistory;
  }, [purchaseHistory]);

  const stores = useMemo(() => {
    return getStoresFromPurchaseHistory(sourceProducts, getStoreById);
  }, [sourceProducts, getStoreById]);

  const classifications = useMemo(() => {
    const filteredProducts = queryProducts({
      purchaseHistory: sourceProducts,
      search,
      storeId: selectedStore,
    });

    return groupProductsByClassification(filteredProducts);
  }, [sourceProducts, search, selectedStore]);

  const openStoreDetail = (storeId) => {
    if (!storeId) return;

    navigation.navigate(ROUTES.STORES_TAB, {
      screen: ROUTES.STORE_DETAIL,

      params: {
        storeId,
      },
    });
  };

  const openPurchaseDetail = (product) => {
    if (!product) return;

    navigation.navigate(ROUTES.PURCHASE_DETAIL, {
      productId: product.id,
    });
  };

  const renderItem = ({ item }) => {
    const expanded = expandedClassificationId === item.id;

    return (
      <PurchaseHistoryCard
        item={item}
        expanded={expanded}
        onToggle={() => {
          setExpandedClassificationId(expanded ? null : item.id);
        }}
        onPressStore={openStoreDetail}
        onPressProduct={openPurchaseDetail}
        getStoreById={getStoreById}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Historial de compras</Text>

        <Text style={styles.subtitle}>
          Consulta los productos comprados agrupados por categoría, subcategoría
          y supermercado.
        </Text>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar categoría, producto o supermercado..."
          style={styles.searchBar}
        />

        <StoreFilterBadges
          stores={stores}
          value={selectedStore}
          onChange={setSelectedStore}
        />

        <FlatList
          data={classifications}
          keyExtractor={(item) => item.id}
          extraData={expandedClassificationId}
          renderItem={renderItem}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            classifications.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={30} color="#9CA3AF" />
              </View>

              <Text style={styles.emptyTitle}>No hay historial de compras</Text>

              <Text style={styles.emptySubtitle}>
                Cuando archives una lista de compra aparecerán aquí sus
                productos agrupados por categoría y subcategoría.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  title: {
    marginBottom: 8,
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    marginBottom: 20,
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
  },

  searchBar: {
    marginBottom: 16,
  },

  listContent: {
    paddingBottom: 60,
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  card: {
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 48,
    height: 48,
    marginRight: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  cardText: {
    flex: 1,
    minWidth: 0,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  cardTitle: {
    flex: 1,
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
  },

  chevronPressable: {
    marginLeft: 8,
    padding: 6,
  },

  categoryRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },

  subcategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },

  subcategoryPillText: {
    color: "#2563EB",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },

  infoRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  separator: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#E5E7EB",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  iconRow: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  productsText: {
    flexShrink: 1,
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },

  priceBox: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },

  price: {
    color: "#059669",
    fontSize: 15,
    fontWeight: "800",
  },

  storePillWrap: {
    alignSelf: "flex-start",
  },

  storesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },

  sectionTitle: {
    marginBottom: 2,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  storeSummaryRow: {
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  storeSummaryLeft: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },

  storeMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  storeUnitsText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  storeTotal: {
    flexShrink: 0,
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },

  emptyStoresText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },

  emptyCard: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  emptyIconBox: {
    width: 56,
    height: 56,
    marginBottom: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  emptyTitle: {
    marginBottom: 6,
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
  },

  emptySubtitle: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  productSummaryRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  productSummaryRowPressed: {
    opacity: 0.65,
  },

  productSummaryLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  productIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },

  productSummaryText: {
    flex: 1,
    minWidth: 0,
  },

  productName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },

  productMeta: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },

  productSummaryRight: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  productTotal: {
    color: "#059669",
    fontSize: 14,
    fontWeight: "800",
  },

  innerSeparator: {
    height: 1,
    marginVertical: 4,
    backgroundColor: "#E5E7EB",
  },
});

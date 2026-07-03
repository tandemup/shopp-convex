// PurchaseDetailScreen.js

import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";
import { ROUTES } from "@/src/navigation/ROUTES";
import { formatCurrency } from "@/src/utils/store/formatters";

import DatePill from "@/src/components/controls/DatePill";
import StorePill from "@/src/components/controls/StorePill";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
const normalizeText = (value) => {
  return String(value ?? "").trim();
};

const getStoreName = (store) => {
  return (
    normalizeText(store?.name) ||
    normalizeText(store?.title) ||
    "Supermercado no disponible"
  );
};

const getStoreAddress = (store) => {
  return (
    normalizeText(store?.address) ||
    normalizeText(store?.street) ||
    normalizeText(store?.location) ||
    ""
  );
};

const getStoreCity = (store) => {
  return normalizeText(store?.city);
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const getPurchaseQuantity = (purchase) => {
  const quantity = toNumber(purchase?.quantity ?? purchase?.qty, 1);

  return quantity > 0 ? quantity : 1;
};

const getPurchaseTotal = (purchase) => {
  return toNumber(purchase?.priceInfo?.total ?? purchase?.total, 0);
};

const getPurchaseUnitPrice = (purchase) => {
  const explicitUnitPrice = toNumber(
    purchase?.priceInfo?.unitPrice ?? purchase?.unitPrice,
    0,
  );

  if (explicitUnitPrice > 0) {
    return explicitUnitPrice;
  }

  const quantity = getPurchaseQuantity(purchase);

  return quantity > 0 ? getPurchaseTotal(purchase) / quantity : 0;
};

const getPurchaseUnit = (purchase, product) => {
  return (
    purchase?.priceInfo?.unit ??
    purchase?.unit ??
    product?.unit ??
    product?.priceInfo?.unit ??
    "u"
  );
};

const toTimestamp = (value) => {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

/* -------------------------------------------------
   Components
-------------------------------------------------- */

const SummaryItem = ({ label, value, highlight = false }) => {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>

      <Text
        style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}
      >
        {value}
      </Text>
    </View>
  );
};

/* -------------------------------------------------
   Screen
-------------------------------------------------- */

export default function PurchaseDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { productId, product: routeProduct } = route.params || {};

  const { purchaseHistory = [] } = useLists();
  const { getStoreById } = useStores();

  /* ---------------------------
     Producto desde historial
  ----------------------------*/

  const product = useMemo(() => {
    if (productId) {
      return purchaseHistory.find((item) => item.id === productId) ?? null;
    }

    return routeProduct ?? null;
  }, [productId, routeProduct, purchaseHistory]);

  /* ---------------------------
     Compras ordenadas
  ----------------------------*/

  const purchases = useMemo(() => {
    return [...(product?.purchases ?? [])].sort((a, b) => {
      return toTimestamp(b?.purchasedAt) - toTimestamp(a?.purchasedAt);
    });
  }, [product?.purchases]);

  /* ---------------------------
     Resumen del producto
  ----------------------------*/

  const summary = useMemo(() => {
    if (purchases.length === 0) {
      return {
        totalSpent: 0,
        totalUnits: 0,
        averageUnitPrice: 0,
        minUnitPrice: 0,
        maxUnitPrice: 0,
        lastUnitPrice: 0,
      };
    }

    const totalSpent = purchases.reduce((sum, purchase) => {
      return sum + getPurchaseTotal(purchase);
    }, 0);

    const totalUnits = purchases.reduce((sum, purchase) => {
      return sum + getPurchaseQuantity(purchase);
    }, 0);

    const unitPrices = purchases
      .map(getPurchaseUnitPrice)
      .filter((price) => price > 0);

    return {
      totalSpent,

      totalUnits,

      averageUnitPrice: totalUnits > 0 ? totalSpent / totalUnits : 0,

      minUnitPrice: unitPrices.length > 0 ? Math.min(...unitPrices) : 0,

      maxUnitPrice: unitPrices.length > 0 ? Math.max(...unitPrices) : 0,

      lastUnitPrice: getPurchaseUnitPrice(purchases[0]),
    };
  }, [purchases]);

  /* ---------------------------
     Navegar a detalle de tienda
  ----------------------------*/

  const openStoreDetail = (storeId) => {
    if (!storeId) return;

    navigation.navigate(ROUTES.STORE_DETAIL, {
      storeId,
    });
  };

  /* ---------------------------
     Repetir producto
  ----------------------------*/

  const handleRepeatProduct = () => {
    if (!product) return;

    const quantity = product.quantity ?? product.lastQuantity ?? 1;

    const unitPrice =
      product.unitPrice ??
      product.priceInfo?.unitPrice ??
      product.averagePrice ??
      summary.lastUnitPrice ??
      0;

    const newItem = {
      id: String(Date.now()),

      name: product.name ?? "",
      barcode: product.barcode ?? "",

      quantity,
      unitPrice,

      unit: product.unit ?? product.priceInfo?.unit ?? "u",

      priceInfo: product.priceInfo ?? null,

      checked: true,

      categoryId: product.categoryId ?? null,
      categoryName: product.categoryName ?? null,

      subcategoryId: product.subcategoryId ?? null,
      subcategoryName: product.subcategoryName ?? null,
    };

    navigation.navigate(ROUTES.SHOPPING_LISTS, {
      repeatedProduct: newItem,
    });
  };

  /* ---------------------------
     Protección básica
  ----------------------------*/

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={34} color="#9CA3AF" />

          <Text style={styles.emptyTitle}>Producto no disponible</Text>

          <Text style={styles.emptyText}>
            No se ha recibido información del producto seleccionado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------------------
     Render compra individual
  ----------------------------*/

  const renderItem = ({ item }) => {
    const store = item.storeId ? getStoreById(item.storeId) : null;

    const quantity = getPurchaseQuantity(item);

    const unitPrice = getPurchaseUnitPrice(item);

    const total = getPurchaseTotal(item);

    const unit = getPurchaseUnit(item, product);

    return (
      <View style={styles.purchaseCard}>
        <View style={styles.purchaseHeader}>
          <View style={styles.purchaseHeaderLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="calendar-outline" size={22} color="#111827" />
            </View>

            <View style={styles.purchaseHeaderText}>
              <View style={styles.metaRow}>
                <DatePill
                  date={item.purchasedAt}
                  fallback="Sin fecha"
                  icon="calendar-outline"
                />
              </View>
            </View>
          </View>

          <View style={styles.priceBox}>
            <Ionicons name="pricetag-outline" size={17} color="#059669" />

            <Text style={styles.price}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <View style={styles.purchaseSeparator} />

        <View style={styles.purchaseDetails}>
          <View style={styles.purchaseStoreRow}>
            <Text style={styles.purchaseDetailLabel}>Supermercado</Text>

            <View style={styles.purchaseStorePillWrap}>
              <StorePill store={store} onPressStore={openStoreDetail} />
            </View>
          </View>

          <View style={styles.purchaseDetailRow}>
            <Text style={styles.purchaseDetailLabel}>Cantidad</Text>

            <Text style={styles.purchaseDetailValue}>
              {quantity} {unit}
            </Text>
          </View>

          <View style={styles.purchaseDetailRow}>
            <Text style={styles.purchaseDetailLabel}>Precio unitario</Text>

            <Text style={styles.purchaseDetailValue}>
              {formatCurrency(unitPrice)}
            </Text>
          </View>

          <View style={styles.purchaseDetailRow}>
            <Text style={styles.purchaseDetailLabel}>Total</Text>

            <Text style={styles.purchaseTotalValue}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* ---------------------------
     Render principal
  ----------------------------*/

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name || "Producto sin nombre"}
        </Text>

        <Text style={styles.subtitle}>
          {purchases.length} compra
          {purchases.length === 1 ? "" : "s"} · {summary.totalUnits} producto
          {summary.totalUnits === 1 ? "" : "s"}
        </Text>

        {Boolean(product.categoryName || product.subcategoryName) ? (
          <View style={styles.categoryRow}>
            {product.categoryName ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} numberOfLines={1}>
                  {product.categoryName}
                </Text>
              </View>
            ) : null}

            {product.subcategoryName ? (
              <View style={styles.subcategoryPill}>
                <Text style={styles.subcategoryPillText} numberOfLines={1}>
                  {product.subcategoryName}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Resumen del producto</Text>

          <View style={styles.summaryGrid}>
            <SummaryItem
              label="Último precio"
              value={formatCurrency(summary.lastUnitPrice)}
              highlight
            />

            <SummaryItem
              label="Precio medio"
              value={formatCurrency(summary.averageUnitPrice)}
            />

            <SummaryItem
              label="Precio mínimo"
              value={formatCurrency(summary.minUnitPrice)}
            />

            <SummaryItem
              label="Precio máximo"
              value={formatCurrency(summary.maxUnitPrice)}
            />

            <SummaryItem
              label="Total gastado"
              value={formatCurrency(summary.totalSpent)}
            />

            <SummaryItem
              label="Unidades compradas"
              value={`${summary.totalUnits}`}
            />
          </View>
        </View>

        <View style={styles.historyTitleRow}>
          <Ionicons name="calendar-outline" size={17} color="#6B7280" />

          <Text style={styles.historyTitle}>Historial por fecha</Text>
        </View>

        <FlatList
          data={purchases}
          keyExtractor={(item, index) => {
            return item?.id ? String(item.id) : `purchase-${index}`;
          }}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            purchases.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={34} color="#9CA3AF" />

              <Text style={styles.emptyTitle}>Sin compras registradas</Text>

              <Text style={styles.emptyText}>
                Este producto todavía no tiene compras individuales asociadas.
              </Text>
            </View>
          }
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleRepeatProduct}
        >
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />

          <Text style={styles.buttonText}>Añadir a nueva lista</Text>
        </Pressable>
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
    marginBottom: 14,
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
  },

  /* ---------------------------
     Badges categoría y subcategoría
  ----------------------------*/

  categoryRow: {
    marginBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },

  categoryPill: {
    minHeight: 25,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },

  subcategoryPill: {
    minHeight: 25,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  categoryPillText: {
    color: "#2563EB",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },

  subcategoryPillText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },

  /* ---------------------------
     Títulos de sección
  ----------------------------*/

  sectionTitle: {
    marginBottom: 10,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* ---------------------------
     Resumen del producto
  ----------------------------*/

  summaryCard: {
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 1,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
  },

  summaryItem: {
    width: "50%",
    paddingRight: 8,
  },

  summaryLabel: {
    marginBottom: 4,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },

  summaryValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },

  summaryValueHighlight: {
    color: "#059669",
  },

  /* ---------------------------
     Listado de compras
  ----------------------------*/

  listContent: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: 14,
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  purchaseCard: {
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

  purchaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  purchaseHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  purchaseHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
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

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  storeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  priceBox: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
  },

  price: {
    color: "#059669",
    fontSize: 15,
    fontWeight: "800",
  },

  purchaseSeparator: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#E5E7EB",
  },

  purchaseDetails: {
    gap: 8,
  },

  purchaseDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  purchaseDetailLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  purchaseDetailValue: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },

  purchaseTotalValue: {
    color: "#059669",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ---------------------------
     Botón inferior
  ----------------------------*/

  button: {
    minHeight: 52,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
  },

  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* ---------------------------
     Estado vacío
  ----------------------------*/

  emptyState: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 10,
    color: "#374151",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  historyTitleRow: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  historyTitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  purchaseStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  purchaseStorePillWrap: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
});

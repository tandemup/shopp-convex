import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Linking,
} from "react-native";

import DatePill from "@/src/components/controls/DatePill";
import StorePill from "@/src/components/controls/StorePill";
import { SafeAreaView } from "react-native-safe-area-context";

import SearchBar from "@/src/components/features/search/SearchBar";
import BarcodeLink from "@/src/components/controls/BarcodeLink";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "@/src/utils/store/formatters";
import { ROUTES } from "@/src/navigation/ROUTES";
import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";
import { normalizePriceInfo } from "@/src/utils/core/defaultItem";

const HeaderRow = ({ title, expanded, onToggle }) => (
  <View style={styles.topRow}>
    <Text style={styles.listTitle} numberOfLines={1}>
      {title}
    </Text>

    <Pressable onPress={onToggle} style={styles.chevronPressable} hitSlop={10}>
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
);

const InfoRow = ({ archivedAt, store, onPressStore }) => (
  <View style={styles.infoRow}>
    <DatePill date={archivedAt} fallback="Sin fecha" icon="calendar-outline" />
    <StorePill store={store} onPressStore={onPressStore} />
  </View>
);

const ProductsAndTotalRow = ({ count, total }) => (
  <View style={styles.bottomRow}>
    <View style={styles.iconRow}>
      <Ionicons name="cart-outline" size={17} color="#6B7280" />
      <Text style={styles.productsText}>{count} productos</Text>
    </View>
    <Text style={styles.totalPrice}>{formatCurrency(total.toFixed(2))}</Text>
  </View>
);

/* ────────────────────────────────────────────────
   ITEM ROW
──────────────────────────────────────────────── */

const ArchivedItemRow = ({ item, isLast }) => {
  const pi = normalizePriceInfo(item.priceInfo);
  const { total, currency, promo, promoLabel, savings, summary, warning } = pi;

  const normalizedPromo = String(promo || "")
    .trim()
    .toLowerCase();
  const normalizedPromoLabel = String(promoLabel || "")
    .trim()
    .toLowerCase();

  const hasOffer =
    !!(promo || promoLabel) &&
    normalizedPromo !== "none" &&
    normalizedPromoLabel !== "none";

  return (
    <View style={[styles.itemRow, isLast && styles.itemRowLast]}>
      <View style={styles.itemIconBox}>
        <Ionicons name="receipt-outline" size={18} color="#111827" />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.nameRow}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>

          {hasOffer && (
            <View style={styles.offerBadgeInline}>
              <Text style={styles.offerText}>{promoLabel || promo}</Text>
            </View>
          )}
        </View>

        {summary && summary.length > 0 && (
          <Text style={styles.summaryText}>{summary}</Text>
        )}

        {typeof item.barcode === "string" && item.barcode.length > 0 && (
          <View style={styles.barcodeLinkContainer}>
            <BarcodeLink
              barcode={item.barcode}
              label={`🔎 ${item.barcode}`}
              style={styles.barcodeLink}
              textStyle={styles.barcode}
            />
          </View>
        )}

        {typeof savings === "number" && savings > 0 && (
          <Text style={styles.savingText}>💸 {formatCurrency(savings)}</Text>
        )}

        {typeof warning === "string" && (
          <Text style={styles.warningText}>⚠ {warning}</Text>
        )}
      </View>

      <View style={styles.itemPriceColumn}>
        {typeof total === "number" && (
          <Text style={styles.itemPrice}>{formatCurrency(total)}</Text>
        )}
      </View>
    </View>
  );
};
/* ────────────────────────────────────────────────
   CARD
──────────────────────────────────────────────── */

const ArchivedListCard = ({
  list,
  store,
  expanded,
  onToggle,
  onPressStore,
}) => {
  const items = list.items || [];
  const total = items.reduce(
    (sum, it) => sum + Number(it.priceInfo?.total ?? it.price ?? 0),
    0,
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconBox}>
          <Ionicons name="archive-outline" size={26} color="#111827" />
        </View>

        <View style={styles.cardText}>
          <HeaderRow
            title={list.name}
            expanded={expanded}
            onToggle={onToggle}
          />
          <InfoRow
            archivedAt={list.archivedAt || list.createdAt}
            store={store}
            onPressStore={onPressStore}
          />
        </View>
      </View>

      <View style={styles.separator} />

      <ProductsAndTotalRow count={items.length} total={total} />

      {expanded && (
        <View style={styles.itemsContainer}>
          {items.map((item, index) => (
            <ArchivedItemRow
              key={item.id}
              item={item}
              isLast={index === items.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/* ────────────────────────────────────────────────
   SCREEN
──────────────────────────────────────────────── */

export default function ArchivedListsScreen({ navigation }) {
  const { archivedLists } = useLists();
  const { getStoreById } = useStores();
  const [expandedListId, setExpandedListId] = useState(null);
  const [search, setSearch] = useState("");

  const sortedLists = useMemo(() => {
    return [...(archivedLists ?? [])].sort(
      (a, b) =>
        new Date(b.archivedAt || b.createdAt) -
        new Date(a.archivedAt || a.createdAt),
    );
  }, [archivedLists]);

  const filteredLists = useMemo(() => {
    if (!search.trim()) return sortedLists;

    const q = search.toLowerCase();

    return sortedLists.filter((list) => {
      const listNameMatch = list.name?.toLowerCase().includes(q);

      const store = list.storeId ? getStoreById(list.storeId) : null;
      const storeMatch = store?.name?.toLowerCase().includes(q);

      const itemsMatch = (list.items || []).some((item) => {
        const nameMatch = item.name?.toLowerCase().includes(q);
        const barcodeMatch =
          typeof item.barcode === "string" &&
          item.barcode.toLowerCase().includes(q);

        return nameMatch || barcodeMatch;
      });

      return listNameMatch || storeMatch || itemsMatch;
    });
  }, [search, sortedLists, getStoreById]);

  const openStoreInfo1 = (storeId) => {
    if (!storeId) return;

    const store = getStoreById(storeId);

    if (!store?.name) return;

    Linking.openURL(
      `https://www.google.com/search?q=${encodeURIComponent(store.name)}`,
    );
  };

  const openStoreInfo11 = (storeId) => {
    if (!storeId) return;

    navigation.navigate(ROUTES.STORE_INFO, {
      storeId,
    });
  };

  const openStoreInfo = (storeOrId) => {
    const storeId = typeof storeOrId === "string" ? storeOrId : storeOrId?.id;

    if (!storeId) return;

    navigation.navigate(ROUTES.STORES_TAB, {
      screen: ROUTES.STORE_DETAIL,
      params: {
        storeId,
      },
    });
  };

  const renderItem = ({ item }) => (
    <ArchivedListCard
      list={item}
      store={item.storeId ? getStoreById(item.storeId) : null}
      expanded={expandedListId === item.id}
      onToggle={() =>
        setExpandedListId(expandedListId === item.id ? null : item.id)
      }
      onPressStore={openStoreInfo}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Listas archivadas</Text>

        <Text style={styles.subtitle}>
          Consulta las listas ya pagadas, revisa sus productos y accede al
          detalle de cada compra archivada.
        </Text>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar lista, supermercado o producto…"
          style={styles.searchBar}
        />

        <FlatList
          data={filteredLists}
          keyExtractor={(item) => item.id}
          extraData={expandedListId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="archive-outline" size={30} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No hay listas archivadas</Text>
              <Text style={styles.emptySubtitle}>
                Cuando archives una lista de compra aparecerá aquí.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

/* ────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────── */

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
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 20,
  },

  searchBar: {
    marginBottom: 16,
  },

  listContent: {
    paddingBottom: 60,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
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

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
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

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  titlePressable: {
    flex: 1,
    paddingVertical: 2,
  },

  listTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  chevronPressable: {
    padding: 6,
    marginLeft: 8,
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  productsText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  totalPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#16A34A",
  },

  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  itemRowLast: {
    borderBottomWidth: 0,
  },

  itemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  itemContent: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },

  barcode: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 4,
  },

  barcodeLinkContainer: {
    alignSelf: "flex-start",
    marginTop: 4,
  },

  barcodeLink: {
    paddingVertical: 1,
  },

  summaryText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 17,
  },

  savingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
    marginTop: 4,
  },

  warningText: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 4,
  },

  itemPriceColumn: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    minWidth: 82,
  },

  itemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 8,
  },

  offerBadgeInline: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },

  offerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
});

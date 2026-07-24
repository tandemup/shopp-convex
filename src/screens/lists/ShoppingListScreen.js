import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BarcodeLink from "@/src/components/controls/BarcodeLink";

import DatePill from "@/src/components/controls/DatePill";
import StorePill from "@/src/components/controls/StorePill";

import { formatCurrency } from "@/src/utils/store/prices";
import { normalizePriceInfo } from "@/src/utils/core/defaultItem";

import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";
import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";
import { findBestCategoryMatch } from "@/src/utils/categoryMatcher";
import { PRODUCT_CATEGORIES } from "@/src/constants/categories";

import SearchCombinedBar from "@/src/components/features/search/SearchCombinedBar";

import { ROUTES } from "@/src/navigation/ROUTES";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

const getPriceTotal = (item) => {
  if (typeof item?.priceInfo?.total === "number") {
    return item.priceInfo.total;
  }

  if (typeof item?.total === "number") {
    return item.total;
  }

  if (typeof item?.price === "number") {
    const qty = Number(item.qty ?? item.quantity ?? 1);
    return item.price * qty;
  }

  return 0;
};

const HeaderRow = ({ title }) => (
  <View style={styles.topRow}>
    <Text style={styles.listTitle} numberOfLines={1}>
      {title}
    </Text>
  </View>
);

const InfoRow = ({ date, store, onSelectStore, onPressStoreInfo }) => (
  <View style={styles.infoRow}>
    <DatePill date={date} fallback="Sin fecha" icon="calendar-outline" />

    <StorePill
      store={store}
      onPressStore={onSelectStore}
      placeholder="Especificar tienda"
    />

    {!!store?.id && (
      <Pressable
        onPress={() => onPressStoreInfo(store)}
        style={styles.storeInfoButton}
        hitSlop={10}
      >
        <Ionicons name="information-circle-outline" size={18} color="#64748B" />
      </Pressable>
    )}
  </View>
);

const ProductsAndTotalRow = ({ checkedCount, total, onCheckout }) => (
  <View style={styles.bottomRow}>
    <View style={styles.iconRow}>
      <Ionicons name="cart-outline" size={17} color="#6B7280" />
      <Text style={styles.productsText}>{checkedCount} items</Text>
    </View>

    <Pressable
      onPress={onCheckout}
      style={({ pressed }) => [
        styles.checkoutInlineButton,
        pressed && styles.checkoutInlineButtonPressed,
      ]}
    >
      <Ionicons name="cart-outline" size={17} color="#FFFFFF" />
      <Text style={styles.checkoutInlineText} numberOfLines={1}>
        Finalizar · {formatCurrency(total)}
      </Text>
    </Pressable>
  </View>
);

const ShoppingListItemRow = ({ item, isLast, onToggle, onEdit }) => {
  const pi = normalizePriceInfo(item.priceInfo);
  const { total, promo, promoLabel, savings, summary, warning } = pi;

  const itemTotal = typeof total === "number" ? total : getPriceTotal(item);

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
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        styles.itemRow,
        isLast && styles.itemRowLast,
        pressed && styles.itemRowPressed,
      ]}
    >
      <Pressable onPress={onToggle} style={styles.itemIconBox} hitSlop={10}>
        <Ionicons
          name={item.checked ? "checkbox-outline" : "square-outline"}
          size={23}
          color={item.checked ? "#16A34A" : "#9CA3AF"}
        />
      </Pressable>

      <View style={styles.itemContent}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.itemName, !item.checked && styles.itemNameDisabled]}
            numberOfLines={1}
          >
            {item.name || "Producto sin nombre"}
          </Text>

          {hasOffer ? (
            <View style={styles.offerBadgeInline}>
              <Text style={styles.offerText}>{promoLabel || promo}</Text>
            </View>
          ) : null}
        </View>

        {summary ? <Text style={styles.summaryText}>{summary}</Text> : null}

        <Categories
          category={item.categoryName}
          subcategory={item.subcategoryName}
        />

        {typeof item.barcode === "string" && item.barcode.length > 0 ? (
          <BarcodeLink
            barcode={item.barcode}
            style={styles.barcodeLink}
            textStyle={styles.barcodeText}
            label={item.barcode}
          >
            <Text style={styles.barcodeText}>🔎 {item.barcode}</Text>
          </BarcodeLink>
        ) : null}

        {typeof savings === "number" && savings > 0 ? (
          <Text style={styles.savingText}>💸 {formatCurrency(savings)}</Text>
        ) : null}

        {typeof warning === "string" && warning.length > 0 ? (
          <Text style={styles.warningText}>⚠ {warning}</Text>
        ) : null}
      </View>

      <View style={styles.itemPriceColumn}>
        <Text
          style={[styles.itemPrice, !item.checked && styles.itemPriceDisabled]}
        >
          {formatCurrency(itemTotal)}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#CBD5E1"
          style={styles.itemChevron}
        />
      </View>
    </Pressable>
  );
};

const EmptyProducts = () => (
  <View style={styles.emptyProductsBox}>
    <View style={styles.emptyIconBoxSmall}>
      <Ionicons name="basket-outline" size={24} color="#9CA3AF" />
    </View>

    <Text style={styles.emptyProductsTitle}>Lista sin productos</Text>

    <Text style={styles.emptyProductsSubtitle}>
      Añade productos desde el buscador o recupera productos del historial.
    </Text>
  </View>
);

const ShoppingListCard = ({
  list,
  store,
  total,
  checkedCount,
  onSelectStore,
  onPressStoreInfo,
  onToggleItem,
  onEditItem,
  onCheckout,
}) => {
  const items = list.items || [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconBox}>
          <Ionicons name="cart-outline" size={24} color="#111827" />
        </View>

        <View style={styles.cardText}>
          <HeaderRow title={list.name} />

          <InfoRow
            date={list.createdAt || list.dateISO || list.updatedAt}
            store={store}
            onSelectStore={onSelectStore}
            onPressStoreInfo={onPressStoreInfo}
          />
        </View>
      </View>

      <View style={styles.separator} />

      <ProductsAndTotalRow
        checkedCount={checkedCount}
        total={total}
        onCheckout={onCheckout}
      />

      <View style={styles.itemsContainer}>
        {items.length > 0 ? (
          items.map((item, index) => (
            <ShoppingListItemRow
              key={item.id}
              item={item}
              isLast={index === items.length - 1}
              onToggle={() => onToggleItem(item.id)}
              onEdit={() => onEditItem(item.id)}
            />
          ))
        ) : (
          <EmptyProducts />
        )}
      </View>
    </View>
  );
};

const Categories = ({ category, subcategory }) => {
  if (!category && !subcategory) {
    return null;
  }

  const text =
    category && subcategory
      ? `🏷️ ${category} · ${subcategory}`
      : `🏷️ ${category || subcategory}`;

  return (
    <Text style={styles.categoriesText} numberOfLines={1}>
      {text}
    </Text>
  );
};

export default function ShoppingListScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { listId } = route.params || {};

  const { activeLists, addItem, updateItem, archiveList } = useLists();
  const { getStoreById } = useStores();

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Shopping Lists",
        preset: "light",
      }),
    [],
  );

  const list = useMemo(
    () => activeLists.find((l) => l.id === listId),
    [activeLists, listId],
  );

  const assignedStore = useMemo(() => {
    if (!list?.storeId) return null;
    return getStoreById(list.storeId);
  }, [list?.storeId, getStoreById]);

  const checkedItems = useMemo(() => {
    if (!list?.items) return [];
    return list.items.filter((item) => item.checked);
  }, [list?.items]);

  const total = useMemo(() => {
    return checkedItems.reduce((sum, item) => {
      return sum + getPriceTotal(item);
    }, 0);
  }, [checkedItems]);

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useEffect(() => {
    if (!list) {
      navigation.replace(ROUTES.SHOPPING_LISTS);
    }
  }, [list, navigation]);

  const handleCreateNew = (name) => {
    const trimmed = name?.trim();
    if (!trimmed || !list) return;

    const match = findBestCategoryMatch(trimmed, PRODUCT_CATEGORIES);

    addItem(listId, {
      name: trimmed,
      checked: true,
      categoryId: match?.categoryId ?? null,
      categoryName: match?.categoryName ?? null,
      subcategoryId: match?.subcategoryId ?? null,
      subcategoryName: match?.subcategoryName ?? null,
    });
  };

  const handleAddFromHistory = (historicItem) => {
    if (!historicItem || !list) return;

    addItem(listId, {
      name: historicItem.name,
      barcode: historicItem.barcode ?? "",
      priceInfo: historicItem.priceInfo
        ? {
            ...historicItem.priceInfo,
            currency:
              typeof list.currency === "string"
                ? list.currency
                : list.currency?.code,
          }
        : null,
      checked: true,
      categoryId: historicItem.categoryId ?? null,
      categoryName: historicItem.categoryName ?? null,
      subcategoryId: historicItem.subcategoryId ?? null,
      subcategoryName: historicItem.subcategoryName ?? null,
    });
  };

  const handleToggleItem = (itemId) => {
    if (!list) return;

    const item = list.items.find((i) => i.id === itemId);
    if (!item) return;

    updateItem(listId, itemId, {
      checked: !item.checked,
    });
  };

  const handleSelectStore = () => {
    navigation.navigate(ROUTES.STORE_SELECT, {
      selectForListId: listId,
    });
  };

  const openStoreInfo = (storeOrStoreId) => {
    const storeId =
      typeof storeOrStoreId === "string" ? storeOrStoreId : storeOrStoreId?.id;

    if (!storeId) return;

    navigation.navigate(ROUTES.STORES_TAB, {
      screen: ROUTES.STORE_DETAIL,
      params: { storeId },
    });
  };

  const handleEditItem = (itemId) => {
    navigation.navigate(ROUTES.ITEM_DETAIL, {
      listId,
      itemId,
    });
  };

  const handleCheckout = () => {
    if (!list) return;

    if (!list.items.length) {
      safeAlert("Lista vacía", "No puedes archivar una lista sin productos.", [
        { text: "Aceptar" },
      ]);
      return;
    }

    if (!checkedItems.length) {
      safeAlert(
        "Sin productos marcados",
        "Marca al menos un producto para finalizar la compra.",
        [{ text: "Aceptar" }],
      );
      return;
    }

    if (!total || total <= 0) {
      safeAlert(
        "Sin importe",
        "No hay productos marcados con precio para finalizar la compra.",
        [{ text: "Aceptar" }],
      );
      return;
    }

    safeAlert(
      "Finalizar compra",
      "¿Quieres archivar esta lista y guardar solo los productos marcados en el historial de compras?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            archiveList(list.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!list) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Esta lista ya no está activa</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchWrapper}>
            <SearchCombinedBar
              currentList={list}
              onCreateNew={handleCreateNew}
              onAddFromHistory={handleAddFromHistory}
            />
          </View>

          <ShoppingListCard
            list={list}
            store={assignedStore}
            total={total}
            checkedCount={checkedItems.length}
            onSelectStore={handleSelectStore}
            onPressStoreInfo={openStoreInfo}
            onToggleItem={handleToggleItem}
            onEditItem={handleEditItem}
            onCheckout={handleCheckout}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 70,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },

  centerText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
  },

  searchWrapper: {
    marginBottom: 12,
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

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardText: {
    flex: 1,
    minWidth: 0,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  listTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },

  storeInfoButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
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
    gap: 10,
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },

  productsText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  checkoutInlineButton: {
    minWidth: 150,
    maxWidth: 190,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 0,
  },

  checkoutInlineButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },

  checkoutInlineText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
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

  itemRowPressed: {
    opacity: 0.76,
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
    minWidth: 0,
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

  itemNameDisabled: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },

  categoriesText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
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

  barcodeLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#D7DEE8",
  },

  barcodeText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
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

  itemPriceDisabled: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },

  itemChevron: {
    marginTop: 4,
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

  emptyProductsBox: {
    paddingVertical: 22,
    alignItems: "center",
  },

  emptyIconBoxSmall: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyProductsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  emptyProductsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "center",
  },
});

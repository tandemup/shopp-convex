import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildHeaderConfig } from "@/utils/layout/headerStyles";
import { useLists } from "@/context/ListsContext";
import { useStores } from "@/context/StoresContext";
import { findBestCategoryMatch } from "@/utils/categoryMatcher";
import { PRODUCT_CATEGORIES } from "@/constants/categories";

import StoreSelector from "@/components/features/stores/StoreSelector";
import ItemRow from "@/components/features/items/ItemRow";
import SearchCombinedBar from "@/components/features/search/SearchCombinedBar";
import CheckoutBar from "@/components/features/checkout/CheckoutBar";

import { ROUTES } from "@/navigation/ROUTES";
import { safeAlert } from "@/components/ui/alert/safeAlert";

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

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useEffect(() => {
    if (!list) {
      navigation.replace(ROUTES.SHOPPING_LISTS);
    }
  }, [list, navigation]);

  if (!list) {
    return (
      <View style={styles.center}>
        <Text>Esta lista ya no está activa</Text>
      </View>
    );
  }

  const assignedStore = list.storeId ? getStoreById(list.storeId) : null;

  const checkedItems = useMemo(() => {
    return list.items.filter((item) => item.checked);
  }, [list.items]);

  const total = useMemo(() => {
    return checkedItems.reduce(
      (sum, item) => sum + (item.priceInfo?.total ?? 0),
      0,
    );
  }, [checkedItems]);

  const handleCreateNew = (name) => {
    const trimmed = name?.trim();
    if (!trimmed) return;

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
    const item = list.items.find((i) => i.id === itemId);
    if (!item) return;

    updateItem(listId, itemId, {
      checked: !item.checked,
    });
  };

  const handleCheckout = () => {
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

  const renderItem = ({ item }) => {
    return (
      <ItemRow
        item={item}
        onToggle={() => handleToggleItem(item.id)}
        onEdit={() =>
          navigation.navigate(ROUTES.ITEM_DETAIL, {
            listId,
            itemId: item.id,
          })
        }
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <CheckoutBar
          listName={list.name}
          total={total}
          currency={list.currency}
          onCheckout={handleCheckout}
        />

        <View style={styles.storeSelectorWrapper}>
          <StoreSelector
            store={assignedStore}
            onPress={() =>
              navigation.navigate(ROUTES.STORE_SELECT, {
                selectForListId: listId,
              })
            }
            onInfoPress={(store) =>
              navigation.navigate(ROUTES.STORES_TAB, {
                screen: ROUTES.STORE_DETAIL,
                params: { storeId: store.id },
              })
            }
          />
        </View>

        <SearchCombinedBar
          currentList={list}
          onCreateNew={handleCreateNew}
          onAddFromHistory={handleAddFromHistory}
        />

        <FlatList
          data={list.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        />
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
    backgroundColor: "#fff",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  storeSelectorWrapper: {
    width: "100%",
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "#fff",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
  },

  firstLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    minWidth: 0,
  },

  name: {
    flexShrink: 1,
    minWidth: 0,
    marginRight: 6,
  },

  badgesInline: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 5,
  },
});

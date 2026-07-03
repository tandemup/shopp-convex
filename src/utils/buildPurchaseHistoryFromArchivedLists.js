import { normalizeProductName } from "./normalize";

/**
 * Construye el índice purchaseHistory a partir de las listas archivadas.
 *
 * Cada producto queda agrupado por:
 * - barcode, si existe
 * - nombre normalizado, si no existe barcode
 *
 * Además conserva purchases[], que usa PurchaseDetailScreen.
 * También conserva category/subcategory para poder reutilizar productos
 * desde el historial sin perder clasificación.
 *
 * @param {Array} archivedLists
 * @returns {Array} purchaseHistory
 */

const toTimestamp = (value) => {
  if (!value) return 0;

  if (typeof value === "number") return value;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getQuantity = (item) => {
  const quantity = Number(item?.quantity ?? item?.priceInfo?.qty ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getPriceInfo = (item) => item?.priceInfo ?? null;

const getPurchaseTotal = (item) => {
  const priceInfo = getPriceInfo(item);
  const total = Number(priceInfo?.total ?? item?.total ?? item?.price ?? 0);
  return Number.isFinite(total) ? total : 0;
};

const getCategoryFields = (item) => ({
  categoryId: item?.categoryId ?? null,
  categoryName: item?.categoryName ?? null,
  subcategoryId: item?.subcategoryId ?? null,
  subcategoryName: item?.subcategoryName ?? null,
});

export function buildPurchaseHistoryFromArchivedLists(archivedLists = []) {
  const map = new Map();

  for (const list of archivedLists) {
    const listId = list.id ?? null;
    const listName = list.name ?? "";
    const storeId = list.storeId ?? null;
    const purchasedAt =
      list.archivedAt ?? list.date ?? list.createdAt ?? Date.now();

    for (const item of list.items || []) {
      if (!item?.name) continue;

      const normalizedName = normalizeProductName(item.name);
      const barcode = item.barcode ?? null;
      const key = barcode || normalizedName;
      const quantity = getQuantity(item);
      const total = getPurchaseTotal(item);
      const categoryFields = getCategoryFields(item);

      const purchase = {
        id: `${listId ?? "list"}-${item.id ?? key}-${purchasedAt}`,
        listId,
        listName,
        storeId,
        purchasedAt,

        itemId: item.id ?? null,
        name: item.name,
        normalizedName,
        barcode,

        quantity,
        unitPrice: item.unitPrice ?? item.priceInfo?.unitPrice ?? 0,
        unit: item.unit ?? item.priceInfo?.unit ?? "u",
        promo: item.promo ?? item.priceInfo?.promo ?? null,
        priceInfo: item.priceInfo ?? null,

        ...categoryFields,
      };

      const prev = map.get(key);

      if (!prev) {
        map.set(key, {
          id: key,
          name: item.name,
          normalizedName,
          barcode,
          unit: purchase.unit,

          ...categoryFields,

          storeId,
          frequency: 1,
          totalUnits: quantity,
          totalSpent: total,
          lastPurchasedAt: purchasedAt,
          priceInfo: item.priceInfo ?? null,
          purchases: [purchase],
        });

        continue;
      }

      const isMoreRecent =
        toTimestamp(purchasedAt) >= toTimestamp(prev.lastPurchasedAt);

      map.set(key, {
        ...prev,

        name: isMoreRecent ? item.name : prev.name,
        barcode: prev.barcode ?? barcode,
        unit: isMoreRecent ? purchase.unit : prev.unit,

        categoryId: isMoreRecent
          ? (categoryFields.categoryId ?? prev.categoryId ?? null)
          : prev.categoryId,
        categoryName: isMoreRecent
          ? (categoryFields.categoryName ?? prev.categoryName ?? null)
          : prev.categoryName,
        subcategoryId: isMoreRecent
          ? (categoryFields.subcategoryId ?? prev.subcategoryId ?? null)
          : prev.subcategoryId,
        subcategoryName: isMoreRecent
          ? (categoryFields.subcategoryName ?? prev.subcategoryName ?? null)
          : prev.subcategoryName,

        storeId: isMoreRecent ? storeId : prev.storeId,
        frequency: prev.frequency + 1,
        totalUnits: (prev.totalUnits ?? 0) + quantity,
        totalSpent: (prev.totalSpent ?? 0) + total,
        lastPurchasedAt: Math.max(
          toTimestamp(prev.lastPurchasedAt),
          toTimestamp(purchasedAt),
        ),
        priceInfo: isMoreRecent
          ? (item.priceInfo ?? prev.priceInfo)
          : prev.priceInfo,
        purchases: [...(prev.purchases ?? []), purchase],
      });
    }
  }

  return Array.from(map.values()).map((product) => ({
    ...product,
    purchases: [...(product.purchases ?? [])].sort(
      (a, b) => toTimestamp(b.purchasedAt) - toTimestamp(a.purchasedAt),
    ),
  }));
}

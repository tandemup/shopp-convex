// utils/queries/products.js

/**
 * Devuelve todos los productos del historial
 * (purchaseHistory ya suele venir plano).
 */
export function getAllProducts(purchaseHistory = []) {
  return purchaseHistory;
}

/**
 * Busca productos por texto (case-insensitive).
 * Busca por nombre, barcode, categoría y subcategoría.
 */
export function searchProducts(purchaseHistory = [], query = "") {
  const q = query.toLowerCase().trim();
  if (!q) return purchaseHistory;

  return purchaseHistory.filter((p) => {
    const nameMatch = p.name?.toLowerCase().includes(q);
    const barcodeMatch =
      typeof p.barcode === "string" && p.barcode.includes(query);
    const categoryMatch =
      typeof p.categoryName === "string" &&
      p.categoryName.toLowerCase().includes(q);
    const subcategoryMatch =
      typeof p.subcategoryName === "string" &&
      p.subcategoryName.toLowerCase().includes(q);

    return nameMatch || barcodeMatch || categoryMatch || subcategoryMatch;
  });
}

/**
 * Devuelve un producto por id.
 */
export function getProductById(purchaseHistory = [], productId) {
  return purchaseHistory.find((p) => p.id === productId) ?? null;
}

/**
 * Productos más comprados (por frecuencia).
 */
export function getMostFrequentProducts(purchaseHistory = [], limit = 10) {
  return [...purchaseHistory]
    .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
    .slice(0, limit);
}

/**
 * Productos con barcode conocido.
 */
export function getProductsWithBarcode(purchaseHistory = []) {
  return purchaseHistory.filter((p) => !!p.barcode);
}

/* =================================================
   NUEVO: filtros por tienda
================================================== */

/**
 * Devuelve todas las tiendas donde se ha comprado algo,
 * sin duplicados.
 *
 * Output:
 * [{ id, name }]
 */
export function getStoresFromPurchaseHistory__(purchaseHistory = []) {
  const map = new Map();

  purchaseHistory.forEach((p) => {
    if (p.storeId && p.storeName) {
      map.set(p.storeId, p.storeName);
    }
  });

  return Array.from(map.entries()).map(([id, name]) => ({
    id,
    name,
  }));
}

export function getStoresFromPurchaseHistory(
  purchaseHistory = [],
  getStoreById,
) {
  const map = new Map();

  purchaseHistory.forEach((p) => {
    if (!p.storeId) return;

    const store = getStoreById?.(p.storeId);
    if (!store?.name) return;

    map.set(p.storeId, store.name);
  });

  return Array.from(map.entries()).map(([id, name]) => ({
    id,
    name,
  }));
}

/**
 * Filtra productos por tienda.
 */
export function filterProductsByStore(purchaseHistory = [], storeId = null) {
  if (!storeId) return purchaseHistory;

  return purchaseHistory.filter((p) => p.storeId === storeId);
}

/**
 * Query combinada: búsqueda + tienda.
 * Busca por nombre (case-insensitive) y por barcode (EAN).
 * Pensada para usar directamente desde la UI.
 */
export function queryProducts({
  purchaseHistory = [],
  search = "",
  storeId = null,
}) {
  let result = purchaseHistory;

  // Filtro por tienda
  if (storeId) {
    result = filterProductsByStore(result, storeId);
  }

  // Búsqueda por texto / barcode
  if (search) {
    const q = search.toLowerCase().trim();

    result = result.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);

      const barcodeMatch =
        typeof p.barcode === "string" && p.barcode.includes(search);

      const categoryMatch =
        typeof p.categoryName === "string" &&
        p.categoryName.toLowerCase().includes(q);

      const subcategoryMatch =
        typeof p.subcategoryName === "string" &&
        p.subcategoryName.toLowerCase().includes(q);

      return nameMatch || barcodeMatch || categoryMatch || subcategoryMatch;
    });
  }

  return result;
}

export const STORAGE_KEYS = {
  LISTS: "@shopping/lists",

  SEARCH_SETTINGS: "@shopping/searchSettings",
  SEARCH_ENGINE: "@shopping/searchEngine",
  SEARCH_GENERAL_ENGINE: "@shopping/search-general-engine",
  SEARCH_BOOK_ENGINE: "@shopping/search-book-engine",

  HISTORY: "@shopping/history",
  FAVORITES: "@shopping/favorites",
  FAVORITE_STORES: "@shopping/favorite-stores",

  PRODUCT_LEARNING: "@shopping/productLearning",

  STORES: "@shopping/stores",
  PURCHASES: "@shopping/purchases",
  SCANNED_ITEMS: "@shopping/scanned-items",

  STORES_DISTANCE_CACHE: "@shopping/stores-distance-cache",
  LOCATION_CACHE: "@shopping/location-cache",
  HOME_LOCATION: "@shopping/home-location",
  SHOPPING_LOCATION: "@shopping/shopping-location",

  BARCODE_SETTINGS: "@shopping/barcode-settings",
};

export function getUserScopedStorageKey(userId, key) {
  const cleanUserId = String(userId || "anonymous").trim() || "anonymous";
  const cleanKey = String(key || "").trim();

  if (!cleanKey) {
    return `@shopping/users/${cleanUserId}`;
  }

  return `@shopping/users/${cleanUserId}/${cleanKey.replace(/^@shopping\//, "")}`;
}

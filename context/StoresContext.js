import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

import { storage } from "../src/storage/storage";

const StoresContext = createContext();

const FAVORITE_STORE_IDS_KEY = "favorite_store_ids";

const normalizeStores = (stores) => {
  if (!Array.isArray(stores)) return [];

  return stores.filter(
    (s) =>
      typeof s?.id === "string" &&
      s.id.length >= 8 &&
      typeof s.name === "string" &&
      typeof s.address === "string" &&
      s.location &&
      typeof s.location.lat === "number" &&
      typeof s.location.lng === "number",
  );
};

export const StoresProvider = ({ children }) => {
  const convexStores = useQuery(api.stores.listStores);

  const [favoriteStoreIds, setFavoriteStoreIds] = useState([]);
  const [favoritesReady, setFavoritesReady] = useState(false);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await storage.getJSON(FAVORITE_STORE_IDS_KEY, []);

        if (Array.isArray(stored)) {
          setFavoriteStoreIds(stored.filter((id) => typeof id === "string"));
        }
      } catch (error) {
        console.warn("Error loading favorite stores", error);
      } finally {
        setFavoritesReady(true);
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    if (!favoritesReady) return;

    storage.setJSON(FAVORITE_STORE_IDS_KEY, favoriteStoreIds);
  }, [favoriteStoreIds, favoritesReady]);

  const stores = useMemo(() => {
    const normalized = normalizeStores(convexStores);

    return normalized.map((store) => ({
      ...store,
      favorite: favoriteStoreIds.includes(store.id),
    }));
  }, [convexStores, favoriteStoreIds]);

  const ready = convexStores !== undefined && favoritesReady;

  const toggleFavorite = (storeId) => {
    if (!storeId) return;

    setFavoriteStoreIds((prev) => {
      if (prev.includes(storeId)) {
        return prev.filter((id) => id !== storeId);
      }

      return [...prev, storeId];
    });
  };

  const toggleFavoriteStore = toggleFavorite;

  const getStoreById = (storeId) =>
    stores.find((store) => store.id === storeId) || null;

  const favoriteStores = stores.filter((store) =>
    favoriteStoreIds.includes(store.id),
  );

  const isFavoriteStore = (storeId) => favoriteStoreIds.includes(storeId);

  const reloadStoresFromSeed = async () => {
    console.warn(
      "reloadStoresFromSeed ya no se usa: las tiendas se cargan desde Convex.",
    );
  };

  return (
    <StoresContext.Provider
      value={{
        stores,
        ready,
        favoriteStores,
        favoriteStoreIds,
        toggleFavorite,
        toggleFavoriteStore,
        isFavoriteStore,
        getStoreById,
        reloadStoresFromSeed,
      }}
    >
      {children}
    </StoresContext.Provider>
  );
};

export const useStores = () => {
  const ctx = useContext(StoresContext);

  if (!ctx) {
    throw new Error("useStores must be used within StoresProvider");
  }

  return ctx;
};

import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/storage/storage";
import { STORAGE_KEYS } from "@/src/storage/storageKeys";

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [favoriteStores, setFavoriteStores] = useState([]);
  const [isReady, setIsReady] = useState(false);

  /* -------------------------------------------------
     Rehidratación
  -------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const data = await storage.getJSON(STORAGE_KEYS.FAVORITE_STORES, []);
        setFavoriteStores(data);
      } catch (err) {
        console.warn("Error loading favorite stores", err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  /* -------------------------------------------------
     Persistencia
  -------------------------------------------------- */
  useEffect(() => {
    if (!isReady) return;
    storage.setJSON(STORAGE_KEYS.FAVORITE_STORES, favoriteStores);
  }, [favoriteStores, isReady]);

  /* -------------------------------------------------
     API
  -------------------------------------------------- */
  const toggleFavoriteStore = (storeId) => {
    setFavoriteStores((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId],
    );
  };

  const isFavoriteStore = (storeId) => favoriteStores.includes(storeId);

  return (
    <ConfigContext.Provider
      value={{
        favoriteStores,
        toggleFavoriteStore,
        isFavoriteStore,
        isReady,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);

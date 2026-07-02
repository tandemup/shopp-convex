import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { storage } from "../src/storage/storage";
import { STORAGE_KEYS } from "../src/storage/storageKeys";

const ProductLearningContext = createContext(null);

/* -------------------------------------------------
   Provider
-------------------------------------------------- */
export function ProductLearningProvider({ children }) {
  const [learning, setLearning] = useState({});
  const [isReady, setIsReady] = useState(false);

  /* ---------------------------
     Load
  ----------------------------*/
  useEffect(() => {
    const init = async () => {
      try {
        const data = await storage.getJSON(STORAGE_KEYS.PRODUCT_LEARNING, {});
        setLearning(data);
      } catch (err) {
        console.warn("Error loading product learning", err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  /* ---------------------------
     Persist
  ----------------------------*/
  useEffect(() => {
    if (!isReady) return;
    storage.setJSON(STORAGE_KEYS.PRODUCT_LEARNING, learning);
  }, [learning, isReady]);

  /* ---------------------------
     API
  ----------------------------*/
  const recordSelection = (name) => {
    if (!name) return;

    setLearning((prev) => {
      const key = name.toLowerCase();
      const curr = prev[key] ?? { selects: 0, lastSelect: null };

      return {
        ...prev,
        [key]: {
          selects: curr.selects + 1,
          lastSelect: new Date().toISOString(),
        },
      };
    });
  };

  const value = useMemo(
    () => ({
      learning,
      recordSelection,
      isReady,
    }),
    [learning, isReady],
  );

  return (
    <ProductLearningContext.Provider value={value}>
      {children}
    </ProductLearningContext.Provider>
  );
}

/* -------------------------------------------------
   Hook
-------------------------------------------------- */
export function useProductLearning() {
  const ctx = useContext(ProductLearningContext);
  if (!ctx) {
    throw new Error(
      "useProductLearning must be used inside ProductLearningProvider",
    );
  }
  return ctx;
}

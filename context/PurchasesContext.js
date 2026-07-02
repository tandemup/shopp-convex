import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { storage } from "../src/storage/storage";
import { STORAGE_KEYS } from "../src/storage/storageKeys";

/* -------------------------------------------------
   Context
-------------------------------------------------- */
const PurchasesContext = createContext(null);

/* -------------------------------------------------
   Provider
-------------------------------------------------- */
export function PurchasesProvider({ children }) {
  const [purchases, setPurchases] = useState([]);
  const [isReady, setIsReady] = useState(false);

  /* -------------------------------------------------
     Load
  -------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const data = await storage.getJSON(STORAGE_KEYS.PURCHASES, []);
        setPurchases(data);
      } catch (err) {
        console.warn("Error loading purchases", err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  /* -------------------------------------------------
     Persist
  -------------------------------------------------- */
  useEffect(() => {
    if (!isReady) return;
    storage.setJSON(STORAGE_KEYS.PURCHASES, purchases);
  }, [purchases, isReady]);

  /* -------------------------------------------------
     Helpers
  -------------------------------------------------- */
  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  /* -------------------------------------------------
     API
  -------------------------------------------------- */

  const addPurchase = ({ store, items }) => {
    const total = (items ?? []).reduce(
      (sum, i) => sum + (i.priceInfo?.total ?? 0),
      0,
    );

    const purchase = {
      id: generateId(),
      store,
      date: new Date().toISOString(),
      items,
      total,
    };

    setPurchases((prev) => [purchase, ...prev]);

    return purchase;
  };

  const deletePurchase = (purchaseId) => {
    setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
  };

  const clearPurchases = () => {
    setPurchases([]);
  };

  /* -------------------------------------------------
     Value
  -------------------------------------------------- */
  const value = useMemo(
    () => ({
      purchases,
      isReady,

      addPurchase,
      deletePurchase,
      clearPurchases,
    }),
    [purchases, isReady],
  );

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

/* -------------------------------------------------
   Hook
-------------------------------------------------- */
export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error("usePurchases must be used inside PurchasesProvider");
  }
  return ctx;
}

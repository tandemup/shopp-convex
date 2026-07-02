import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loadLists, saveLists } from "../src/storage/listsStorage";
import { DEFAULT_CURRENCY } from "@/constants/currency";
import { buildPurchaseHistoryFromArchivedLists } from "@/utils/buildPurchaseHistoryFromArchivedLists";

/* -------------------------------------------------
   Context
-------------------------------------------------- */
const ListsContext = createContext(null);

/* -------------------------------------------------
   Provider
-------------------------------------------------- */
export function ListsProvider({ children }) {
  const [lists, setLists] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [isReady, setIsReady] = useState(false);

  /* -------------------------------------------------
     Rehidratación (solo listas)
  -------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadLists();
        setLists(data);
      } catch (err) {
        console.warn("Error loading lists", err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  /* -------------------------------------------------
     Persistencia (solo listas)
  -------------------------------------------------- */
  useEffect(() => {
    if (!isReady) return;
    saveLists(lists);
  }, [lists, isReady]);

  /* -------------------------------------------------
     Derivar purchaseHistory (NO persistido)
  -------------------------------------------------- */
  const archivedLists = useMemo(() => lists.filter((l) => l.archived), [lists]);

  useEffect(() => {
    const rebuilt = buildPurchaseHistoryFromArchivedLists(archivedLists);
    setPurchaseHistory(rebuilt);
  }, [archivedLists]);

  const activeLists = useMemo(() => lists.filter((l) => !l.archived), [lists]);

  /* -------------------------------------------------
     Helpers
  -------------------------------------------------- */
  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  /* -------------------------------------------------
     API pública — Listas
  -------------------------------------------------- */
  const createList = (name, currency) => {
    setLists((prev) => [
      ...prev,
      {
        id: generateId(),
        name,
        currency: currency ?? DEFAULT_CURRENCY,
        items: [],
        createdAt: Date.now(),
        archived: false,
        archivedAt: null,
        storeId: null,
      },
    ]);
  };

  const updateList = (listId, updates) => {
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)),
    );
  };

  const updateListStore = (listId, storeId) => {
    updateList(listId, { storeId });
  };

  const deleteList = (listId) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const archiveList = (listId) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        const checkedItems = Array.isArray(list.items)
          ? list.items.filter((item) => item?.checked === true)
          : [];

        return {
          ...list,
          items: checkedItems,
          archived: true,
          archivedAt: Date.now(),
        };
      }),
    );
  };

  const restoreList = (listId) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, archived: false, archivedAt: null } : l,
      ),
    );
  };

  const clearActiveListsState = () => {
    setLists((prev) => prev.filter((list) => list?.archived === true));
  };

  const clearArchivedListsState = () => {
    setLists((prev) => prev.filter((list) => list?.archived !== true));
  };

  const clearAllListsState = () => {
    setLists([]);
  };
  /* -------------------------------------------------
     API pública — Items
  -------------------------------------------------- */
  const addItem = (listId, item) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: [
                {
                  id: generateId(),
                  name: item?.name ?? "",
                  barcode: item?.barcode ?? "",

                  quantity: item?.quantity ?? item?.priceInfo?.qty ?? 1,
                  unitPrice: item?.unitPrice ?? item?.priceInfo?.unitPrice ?? 0,
                  unit: item?.unit ?? item?.priceInfo?.unit ?? "u",

                  priceInfo: item?.priceInfo ?? null,
                  checked: item?.checked ?? true,
                  promo: item?.promo ?? item?.priceInfo?.promo ?? null,

                  categoryId: item?.categoryId ?? null,
                  categoryName: item?.categoryName ?? null,
                  subcategoryId: item?.subcategoryId ?? null,
                  subcategoryName: item?.subcategoryName ?? null,
                },
                ...list.items,
              ],
            }
          : list,
      ),
    );
  };

  const updateItem = (listId, itemId, updates) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item,
              ),
            }
          : list,
      ),
    );
  };

  const deleteItem = (listId, itemId) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.filter((i) => i.id !== itemId),
            }
          : list,
      ),
    );
  };

  /* -------------------------------------------------
     Memo
  -------------------------------------------------- */
  const value = useMemo(
    () => ({
      lists,
      activeLists,
      archivedLists,
      purchaseHistory,
      isReady,

      createList,
      updateList,
      updateListStore,
      deleteList,
      archiveList,
      restoreList,

      clearActiveListsState,
      clearArchivedListsState,
      clearAllListsState,

      addItem,
      updateItem,
      deleteItem,
    }),
    [lists, activeLists, archivedLists, purchaseHistory, isReady],
  );

  return (
    <ListsContext.Provider value={value}>{children}</ListsContext.Provider>
  );
}

/* -------------------------------------------------
   Hook
-------------------------------------------------- */
export function useLists() {
  const ctx = useContext(ListsContext);
  if (!ctx) {
    throw new Error("useLists must be used inside ListsProvider");
  }
  return ctx;
}

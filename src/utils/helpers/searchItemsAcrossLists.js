import { loadLists } from "@/src/storage/listsStorage";

/**
 * Busca productos en TODAS las listas archivadas / históricas
 */
export async function searchItemsAcrossLists(query) {
  if (!query || query.trim().length < 2) return [];

  const q = normalize(query);

  try {
    // ✅ usar storage centralizado
    const lists = await loadLists();
    if (!Array.isArray(lists)) return [];

    const results = [];

    for (const list of lists) {
      if (!list?.items || !Array.isArray(list.items)) continue;

      for (const item of list.items) {
        if (!item?.name) continue;

        if (!normalize(item.name).includes(q)) continue;

        results.push({
          item: {
            id: item.id,
            name: item.name,
            priceInfo: item.priceInfo ?? null,
            unitPrice: item.priceInfo?.unitPrice ?? null,
            unitType: item.priceInfo?.unitType ?? "unidad",
          },

          listId: list.id,
          listName: list.name ?? "Lista sin nombre",
          storeId: list.storeId ?? null,

          purchasedAt:
            item.purchasedAt ?? list.purchasedAt ?? list.updatedAt ?? null,
        });
      }
    }

    return results;
  } catch (e) {
    console.warn("searchItemsAcrossLists error:", e);
    return [];
  }
}

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

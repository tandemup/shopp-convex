import { loadLists } from "@/src/storage/listsStorage";

/**
 * Devuelve todos los items de todas las listas
 */
export async function loadAllItemsFromLists() {
  const lists = await loadLists();
  const items = [];

  for (const list of lists || []) {
    for (const item of list.items || []) {
      items.push({
        item,
        listId: list.id,
        listName: list.name,
      });
    }
  }

  return items;
}

/**
 * Busca productos en todas las listas guardadas
 */
export async function searchItemsAcrossLists(query) {
  const text = query?.toLowerCase().trim();
  if (!text) return [];

  const allItems = await loadAllItemsFromLists();

  return allItems
    .filter(({ item }) => item.name?.toLowerCase().includes(text))
    .map(({ item, listId, listName }) => ({
      // normalización mínima para reutilización
      item: {
        name: item.name,
        priceInfo: item.priceInfo ?? null,
        barcode: item.barcode ?? null,
      },
      listId,
      listName,
    }));
}

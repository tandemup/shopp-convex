import { storage } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";

export async function loadLists(storageKey = STORAGE_KEYS.LISTS) {
  return await storage.getJSON(storageKey, []);
}

export async function saveLists(lists, storageKey = STORAGE_KEYS.LISTS) {
  return await storage.setJSON(storageKey, lists);
}

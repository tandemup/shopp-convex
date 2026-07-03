import { storage } from "@/src/storage/storage";
import { STORAGE_KEYS } from "@/src/storage/storageKeys";

/**
 * Guarda distancias y ubicación
 */
export async function saveStoresDistance(data) {
  try {
    await storage.setJSON(STORAGE_KEYS.STORES_DISTANCE_CACHE, data);
  } catch (err) {
    console.warn("Error guardando cache:", err);
  }
}

/**
 * Carga cache si existe
 */
export async function loadStoresDistance() {
  try {
    return await storage.getJSON(STORAGE_KEYS.STORES_DISTANCE_CACHE, null);
  } catch (err) {
    console.warn("Error cargando cache:", err);
    return null;
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_PRODUCT_SEARCH_ENGINE,
  normalizeProductSearchEngine,
} from "./productSearchEngines";

const PRODUCT_SEARCH_ENGINE_KEY = "product_search_engine";

export async function getSelectedProductSearchEngine() {
  try {
    const value = await AsyncStorage.getItem(PRODUCT_SEARCH_ENGINE_KEY);

    return normalizeProductSearchEngine(value);
  } catch (error) {
    console.log("Error reading selected product search engine:", error);
    return DEFAULT_PRODUCT_SEARCH_ENGINE;
  }
}

export async function saveSelectedProductSearchEngine(engine) {
  try {
    const safeEngine = normalizeProductSearchEngine(engine);

    await AsyncStorage.setItem(PRODUCT_SEARCH_ENGINE_KEY, safeEngine);

    return safeEngine;
  } catch (error) {
    console.log("Error saving selected product search engine:", error);
    return DEFAULT_PRODUCT_SEARCH_ENGINE;
  }
}

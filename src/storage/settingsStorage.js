// src/storage/settingsStorage.js

import { storage } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";
import {
  DEFAULT_BOOK_ENGINE,
  DEFAULT_ENGINE,
  PRODUCT_SEARCH_ENGINE_IDS,
  SEARCH_ENGINES,
  BOOK_ENGINES,
} from "@/src/constants/searchEngines";

export const DEFAULT_SEARCH_SETTINGS = {
  selectedProductEngine: DEFAULT_ENGINE,
  generalEngine: DEFAULT_ENGINE,
  selectedBookEngine: DEFAULT_BOOK_ENGINE,
  bookEngine: DEFAULT_BOOK_ENGINE,

  productEngines: PRODUCT_SEARCH_ENGINE_IDS.reduce((result, engineId) => {
    result[engineId] = engineId === DEFAULT_ENGINE;
    return result;
  }, {}),

  bookEngines: Object.keys(BOOK_ENGINES).reduce((result, engineId) => {
    result[engineId] = engineId === DEFAULT_BOOK_ENGINE;
    return result;
  }, {}),
};

function getSelectedFromMap(map, allowedIds) {
  if (!map || typeof map !== "object") return null;

  return allowedIds.find((engineId) => Boolean(map[engineId])) ?? null;
}

function normalizeProductEngineId(value, saved) {
  const cleanValue = String(value || "").trim();

  if (cleanValue && SEARCH_ENGINES[cleanValue]) {
    // En versiones anteriores `google` abría Google Shopping.
    // Se migra únicamente cuando no existe todavía el modelo nuevo.
    if (
      cleanValue === "google" &&
      !saved?.selectedProductEngine &&
      saved?.generalEngine === "google"
    ) {
      return "google_shopping";
    }

    return cleanValue;
  }

  const selectedFromMap = getSelectedFromMap(
    saved?.productEngines,
    PRODUCT_SEARCH_ENGINE_IDS,
  );

  return selectedFromMap || DEFAULT_ENGINE;
}

function normalizeBookEngineId(value, saved) {
  const cleanValue = String(value || "").trim();

  if (cleanValue && BOOK_ENGINES[cleanValue]) {
    return cleanValue;
  }

  return (
    getSelectedFromMap(saved?.bookEngines, Object.keys(BOOK_ENGINES)) ||
    DEFAULT_BOOK_ENGINE
  );
}

function buildSingleSelectionMap(ids, selectedId) {
  return ids.reduce((result, engineId) => {
    result[engineId] = engineId === selectedId;
    return result;
  }, {});
}

function normalizeSearchSettings(savedSettings) {
  const saved =
    savedSettings && typeof savedSettings === "object" ? savedSettings : {};

  const selectedProductEngine = normalizeProductEngineId(
    saved.selectedProductEngine || saved.generalEngine,
    saved,
  );

  const selectedBookEngine = normalizeBookEngineId(
    saved.selectedBookEngine || saved.bookEngine,
    saved,
  );

  return {
    ...DEFAULT_SEARCH_SETTINGS,
    ...saved,

    selectedProductEngine,
    generalEngine: selectedProductEngine,
    selectedBookEngine,
    bookEngine: selectedBookEngine,

    productEngines: buildSingleSelectionMap(
      PRODUCT_SEARCH_ENGINE_IDS,
      selectedProductEngine,
    ),

    bookEngines: buildSingleSelectionMap(
      Object.keys(BOOK_ENGINES),
      selectedBookEngine,
    ),
  };
}

export async function getSearchSettings() {
  try {
    const savedSettings = await storage.getJSON(
      STORAGE_KEYS.SEARCH_SETTINGS,
      DEFAULT_SEARCH_SETTINGS,
    );

    return normalizeSearchSettings(savedSettings);
  } catch (error) {
    console.log("Error reading search settings:", error);
    return DEFAULT_SEARCH_SETTINGS;
  }
}

export async function setSearchSettings(settings) {
  try {
    const normalizedSettings = normalizeSearchSettings(settings);
    await storage.setJSON(STORAGE_KEYS.SEARCH_SETTINGS, normalizedSettings);
    return normalizedSettings;
  } catch (error) {
    console.log("Error saving search settings:", error);
    return DEFAULT_SEARCH_SETTINGS;
  }
}

export async function setSelectedProductEngine(engineId) {
  const cleanEngineId = String(engineId || "").trim();

  if (!SEARCH_ENGINES[cleanEngineId]) {
    throw new Error(`Motor de productos no válido: ${cleanEngineId}`);
  }

  const current = await getSearchSettings();

  return setSearchSettings({
    ...current,
    selectedProductEngine: cleanEngineId,
    generalEngine: cleanEngineId,
  });
}

export async function setSelectedBookEngine(engineId) {
  const cleanEngineId = String(engineId || "").trim();

  if (!BOOK_ENGINES[cleanEngineId]) {
    throw new Error(`Motor de libros no válido: ${cleanEngineId}`);
  }

  const current = await getSearchSettings();

  return setSearchSettings({
    ...current,
    selectedBookEngine: cleanEngineId,
    bookEngine: cleanEngineId,
  });
}

export async function setProductEngineEnabled(engineId, enabled) {
  if (!enabled) return getSearchSettings();
  return setSelectedProductEngine(engineId);
}

export async function setBookEngineEnabled(engineId, enabled) {
  if (!enabled) return getSearchSettings();
  return setSelectedBookEngine(engineId);
}

export async function getEnabledProductEngines() {
  const settings = await getSearchSettings();
  return [settings.selectedProductEngine];
}

export async function getEnabledBookEngines() {
  const settings = await getSearchSettings();
  return [settings.selectedBookEngine];
}

export async function resetSearchSettings() {
  try {
    await storage.setJSON(
      STORAGE_KEYS.SEARCH_SETTINGS,
      DEFAULT_SEARCH_SETTINGS,
    );

    return DEFAULT_SEARCH_SETTINGS;
  } catch (error) {
    console.log("Error resetting search settings:", error);
    return DEFAULT_SEARCH_SETTINGS;
  }
}

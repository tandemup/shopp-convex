// src/storage/settingsStorage.js

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  BOOK_ENGINES,
  DEFAULT_BOOK_ENGINE,
  DEFAULT_ENGINE,
  PRODUCT_SEARCH_ENGINE_IDS,
  SEARCH_ENGINES,
} from "../constants/searchEngines";

const SEARCH_SETTINGS_STORAGE_KEY = "shopp:search-settings";
const LEGACY_SEARCH_SETTINGS_STORAGE_KEYS = ["search_settings"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getBookEngineIds() {
  return Object.keys(BOOK_ENGINES || {});
}

function isValidProductEngineId(engineId) {
  return Boolean(engineId && SEARCH_ENGINES?.[engineId]);
}

function isValidBookEngineId(engineId) {
  return Boolean(engineId && BOOK_ENGINES?.[engineId]);
}

function buildEnabledMap(ids, defaultId, source = {}) {
  return safeArray(ids).reduce((result, engineId) => {
    result[engineId] =
      typeof source?.[engineId] === "boolean"
        ? source[engineId]
        : engineId === defaultId;

    return result;
  }, {});
}

export const DEFAULT_SEARCH_SETTINGS = {
  selectedProductEngine: DEFAULT_ENGINE,
  selectedBookEngine: DEFAULT_BOOK_ENGINE,

  // Campo legacy conservado para pantallas antiguas que todavía lo leen.
  generalEngine: DEFAULT_ENGINE,

  productEngines: buildEnabledMap(PRODUCT_SEARCH_ENGINE_IDS, DEFAULT_ENGINE),
  bookEngines: buildEnabledMap(getBookEngineIds(), DEFAULT_BOOK_ENGINE),
};

function safeJsonParse(value) {
  try {
    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn("[settingsStorage] No se pudo leer la configuración.", error);
    return null;
  }
}

export function normalizeSearchSettings(settings = {}) {
  const selectedProductEngine = isValidProductEngineId(
    settings?.selectedProductEngine,
  )
    ? settings.selectedProductEngine
    : isValidProductEngineId(settings?.generalEngine)
      ? settings.generalEngine
      : DEFAULT_SEARCH_SETTINGS.selectedProductEngine;

  const selectedBookEngine = isValidBookEngineId(settings?.selectedBookEngine)
    ? settings.selectedBookEngine
    : DEFAULT_SEARCH_SETTINGS.selectedBookEngine;

  return {
    ...DEFAULT_SEARCH_SETTINGS,
    ...settings,

    selectedProductEngine,
    selectedBookEngine,
    generalEngine: selectedProductEngine,

    productEngines: buildEnabledMap(
      PRODUCT_SEARCH_ENGINE_IDS,
      selectedProductEngine,
      settings?.productEngines,
    ),

    bookEngines: buildEnabledMap(
      getBookEngineIds(),
      selectedBookEngine,
      settings?.bookEngines,
    ),
  };
}

async function readStoredSettings() {
  const rawValue = await AsyncStorage.getItem(SEARCH_SETTINGS_STORAGE_KEY);
  const parsedValue = safeJsonParse(rawValue);

  if (parsedValue) {
    return parsedValue;
  }

  for (const legacyKey of LEGACY_SEARCH_SETTINGS_STORAGE_KEYS) {
    const legacyRawValue = await AsyncStorage.getItem(legacyKey);
    const legacyParsedValue = safeJsonParse(legacyRawValue);

    if (legacyParsedValue) {
      return legacyParsedValue;
    }
  }

  return null;
}

export async function getSearchSettings() {
  try {
    const storedSettings = await readStoredSettings();

    return normalizeSearchSettings(storedSettings || DEFAULT_SEARCH_SETTINGS);
  } catch (error) {
    console.warn("[settingsStorage] Error leyendo search settings.", error);
    return DEFAULT_SEARCH_SETTINGS;
  }
}

export async function setSearchSettings(settings) {
  try {
    const normalizedSettings = normalizeSearchSettings(settings);

    await AsyncStorage.setItem(
      SEARCH_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizedSettings),
    );

    return normalizedSettings;
  } catch (error) {
    console.warn("[settingsStorage] Error guardando search settings.", error);
    return normalizeSearchSettings(settings || DEFAULT_SEARCH_SETTINGS);
  }
}

export async function saveSearchSettings(settings) {
  return setSearchSettings(settings);
}

export async function updateSearchSettings(updater) {
  const currentSettings = await getSearchSettings();
  const nextSettings =
    typeof updater === "function" ? updater(currentSettings) : updater;

  return setSearchSettings({
    ...currentSettings,
    ...nextSettings,
  });
}

export async function setSelectedProductEngine(engineId) {
  const safeEngineId = isValidProductEngineId(engineId)
    ? engineId
    : DEFAULT_ENGINE;

  return updateSearchSettings((currentSettings) => ({
    ...currentSettings,
    selectedProductEngine: safeEngineId,
    generalEngine: safeEngineId,
    productEngines: buildEnabledMap(
      PRODUCT_SEARCH_ENGINE_IDS,
      safeEngineId,
      currentSettings?.productEngines,
    ),
  }));
}

export async function setSelectedBookEngine(engineId) {
  const safeEngineId = isValidBookEngineId(engineId)
    ? engineId
    : DEFAULT_BOOK_ENGINE;

  return updateSearchSettings((currentSettings) => ({
    ...currentSettings,
    selectedBookEngine: safeEngineId,
    bookEngines: buildEnabledMap(
      getBookEngineIds(),
      safeEngineId,
      currentSettings?.bookEngines,
    ),
  }));
}

export async function clearSearchSettings() {
  try {
    await AsyncStorage.removeItem(SEARCH_SETTINGS_STORAGE_KEY);

    return DEFAULT_SEARCH_SETTINGS;
  } catch (error) {
    console.warn("[settingsStorage] Error borrando search settings.", error);
    return DEFAULT_SEARCH_SETTINGS;
  }
}

// src/storage/barcodeSettingsStorage.js

import { storage } from "./storage";

import { DEFAULT_BARCODE_SETTINGS } from "@/src/constants/barcodeFormats";

/* -------------------------------------------------
   Storage key
-------------------------------------------------- */

const BARCODE_SETTINGS_KEY = "barcode_settings_v1";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

/*
 * Normaliza los ajustes guardados para mantener compatibilidad
 * con configuraciones antiguas o incompletas.
 */
function normalizeBarcodeSettings(savedSettings) {
  const saved =
    savedSettings && typeof savedSettings === "object" ? savedSettings : {};

  /*
   * Compatibilidad con una versión antigua:
   *
   * {
   *   barcodeTypes: ["ean13", "ean8"]
   * }
   */
  if (Array.isArray(saved.barcodeTypes)) {
    const legacyFormats = saved.barcodeTypes.reduce((acc, formatId) => {
      if (typeof formatId === "string" && formatId.trim()) {
        acc[formatId] = true;
      }

      return acc;
    }, {});

    return {
      ...DEFAULT_BARCODE_SETTINGS,

      formats: {
        ...DEFAULT_BARCODE_SETTINGS.formats,
        ...legacyFormats,
      },
    };
  }

  /*
   * Compatibilidad con una versión antigua:
   *
   * {
   *   barcodeTypes: {
   *     ean13: true,
   *     ean8: false
   *   }
   * }
   */
  if (
    saved.barcodeTypes &&
    typeof saved.barcodeTypes === "object" &&
    !Array.isArray(saved.barcodeTypes)
  ) {
    return {
      ...DEFAULT_BARCODE_SETTINGS,

      formats: {
        ...DEFAULT_BARCODE_SETTINGS.formats,
        ...saved.barcodeTypes,
      },
    };
  }

  /*
   * Formato actual:
   *
   * {
   *   formats: {
   *     ean13: true,
   *     ean8: true,
   *     upc_a: true,
   *     upc_e: true
   *   }
   * }
   */
  return {
    ...DEFAULT_BARCODE_SETTINGS,
    ...saved,

    formats: {
      ...DEFAULT_BARCODE_SETTINGS.formats,
      ...(saved.formats ?? {}),
    },
  };
}

/* -------------------------------------------------
   Read settings
-------------------------------------------------- */

export async function getBarcodeSettings() {
  try {
    const savedSettings = await storage.getJSON(
      BARCODE_SETTINGS_KEY,
      DEFAULT_BARCODE_SETTINGS,
    );

    return normalizeBarcodeSettings(savedSettings);
  } catch (error) {
    console.log("Error reading barcode settings:", error);

    return DEFAULT_BARCODE_SETTINGS;
  }
}

/* -------------------------------------------------
   Save settings
-------------------------------------------------- */

export async function setBarcodeSettings(settings) {
  try {
    const normalizedSettings = normalizeBarcodeSettings(settings);

    await storage.setJSON(BARCODE_SETTINGS_KEY, normalizedSettings);

    return normalizedSettings;
  } catch (error) {
    console.log("Error saving barcode settings:", error);

    return DEFAULT_BARCODE_SETTINGS;
  }
}

/* -------------------------------------------------
   Enable or disable one barcode format
-------------------------------------------------- */

export async function setBarcodeFormatEnabled(formatId, enabled) {
  const cleanFormatId = String(formatId || "").trim();

  if (!cleanFormatId) {
    return getBarcodeSettings();
  }

  const currentSettings = await getBarcodeSettings();

  const nextSettings = {
    ...currentSettings,

    formats: {
      ...currentSettings.formats,
      [cleanFormatId]: Boolean(enabled),
    },
  };

  return setBarcodeSettings(nextSettings);
}

/* -------------------------------------------------
   Replace the enabled formats
-------------------------------------------------- */

export async function setEnabledBarcodeFormats(formatIds = []) {
  const safeFormatIds = Array.isArray(formatIds)
    ? formatIds.map((formatId) => String(formatId || "").trim()).filter(Boolean)
    : [];

  const currentSettings = await getBarcodeSettings();

  const nextFormats = Object.keys(currentSettings.formats).reduce(
    (acc, formatId) => {
      acc[formatId] = safeFormatIds.includes(formatId);

      return acc;
    },
    {},
  );

  const nextSettings = {
    ...currentSettings,

    formats: nextFormats,
  };

  return setBarcodeSettings(nextSettings);
}

/* -------------------------------------------------
   Get only the enabled formats
-------------------------------------------------- */

export async function getEnabledBarcodeFormats() {
  const settings = await getBarcodeSettings();

  return Object.entries(settings.formats ?? {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([formatId]) => formatId);
}

/* -------------------------------------------------
   Reset settings
-------------------------------------------------- */

export async function resetBarcodeSettings() {
  try {
    await storage.setJSON(BARCODE_SETTINGS_KEY, DEFAULT_BARCODE_SETTINGS);

    return DEFAULT_BARCODE_SETTINGS;
  } catch (error) {
    console.log("Error resetting barcode settings:", error);

    return DEFAULT_BARCODE_SETTINGS;
  }
}

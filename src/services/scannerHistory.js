// services/scannerHistory.js

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------------------------------------
   Storage key
-------------------------------------------------- */

const SCANNER_HISTORY_KEY = "scanner_history_v1";

/* -------------------------------------------------
   Storage helpers
-------------------------------------------------- */

/*
 * En navegador usamos localStorage.
 * En Android e iOS usamos AsyncStorage.
 *
 * Los accesos web están protegidos porque localStorage puede
 * no estar disponible en ciertos contextos restringidos.
 */
async function getItem(key) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.log("Error reading web localStorage:", error);

      return null;
    }
  }

  return AsyncStorage.getItem(key);
}

async function setItem(key, value) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.log("Error writing web localStorage:", error);
    }

    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function removeItem(key) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.log("Error removing item from web localStorage:", error);
    }

    return;
  }

  await AsyncStorage.removeItem(key);
}

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function normalizeBarcode(barcode) {
  return String(barcode || "")
    .replace(/\D/g, "")
    .trim();
}

function normalizeHistoryItem(item) {
  const safeItem = item && typeof item === "object" ? item : {};

  const barcode = normalizeBarcode(safeItem.barcode);

  if (!barcode) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: safeItem.id || barcode,
    barcode,

    name: safeItem.name || "",
    brand: safeItem.brand || "",
    url: safeItem.url || "",
    imageUrl: safeItem.imageUrl || "",
    thumbnailUri: safeItem.thumbnailUri || null,
    notes: safeItem.notes || "",

    source: safeItem.source || "scanner",
    lookupSource: safeItem.lookupSource || null,

    scannedAt: safeItem.scannedAt || now,
    updatedAt: safeItem.updatedAt || now,

    scanCount: Number(safeItem.scanCount ?? 1),

    ...safeItem,

    /*
     * Reaplicamos los campos esenciales después del spread para
     * evitar guardar valores inválidos procedentes del almacenamiento.
     */
    id: safeItem.id || barcode,
    barcode,
    scanCount: Number(safeItem.scanCount ?? 1),
  };
}

function normalizeHistory(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(normalizeHistoryItem).filter(Boolean);
}

/* -------------------------------------------------
   Read one scanned entry
-------------------------------------------------- */

export async function getScannedEntryByBarcode(barcode) {
  const cleanBarcode = normalizeBarcode(barcode);

  if (!cleanBarcode) {
    return null;
  }

  const all = await getScannedHistory();

  return (
    all.find((item) => {
      return normalizeBarcode(item.barcode) === cleanBarcode;
    }) || null
  );
}

/* -------------------------------------------------
   Read complete history
-------------------------------------------------- */

export async function getScannedHistory() {
  try {
    const raw = await getItem(SCANNER_HISTORY_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return normalizeHistory(parsed);
  } catch (error) {
    console.log("Error reading scanned history:", error);

    return [];
  }
}

/* -------------------------------------------------
   Save complete history
-------------------------------------------------- */

export async function saveScannedHistory(items) {
  try {
    const safeItems = normalizeHistory(items);

    await setItem(SCANNER_HISTORY_KEY, JSON.stringify(safeItems));

    return safeItems;
  } catch (error) {
    console.log("Error saving scanned history:", error);

    return [];
  }
}

/* -------------------------------------------------
   Create or update without increasing scan count
-------------------------------------------------- */

export async function updateScannedEntry(barcode, patch = {}) {
  const cleanBarcode = normalizeBarcode(barcode);

  if (!cleanBarcode) {
    return null;
  }

  const all = await getScannedHistory();
  const now = new Date().toISOString();

  const index = all.findIndex((item) => {
    return normalizeBarcode(item.barcode) === cleanBarcode;
  });

  let nextItem;

  if (index >= 0) {
    const previous = all[index];

    nextItem = normalizeHistoryItem({
      ...previous,
      ...patch,

      id: previous.id || cleanBarcode,
      barcode: cleanBarcode,

      source: patch.source ?? previous.source ?? "scanner",

      scannedAt: previous.scannedAt ?? patch.scannedAt ?? now,

      updatedAt: patch.updatedAt ?? now,

      scanCount: Number(previous.scanCount ?? 1),
    });

    all[index] = nextItem;
  } else {
    nextItem = normalizeHistoryItem({
      id: cleanBarcode,
      barcode: cleanBarcode,

      name: "",
      brand: "",
      url: "",
      imageUrl: "",
      thumbnailUri: null,
      notes: "",

      source: "scanner",
      lookupSource: null,

      scannedAt: now,
      updatedAt: now,

      scanCount: 1,

      ...patch,
    });

    all.unshift(nextItem);
  }

  await saveScannedHistory(all);

  return nextItem;
}

/* -------------------------------------------------
   Create or update after a scanner reading
-------------------------------------------------- */

export async function saveScannedEntry(barcode, patch = {}) {
  const cleanBarcode = normalizeBarcode(barcode);

  if (!cleanBarcode) {
    return null;
  }

  const all = await getScannedHistory();
  const now = new Date().toISOString();

  const index = all.findIndex((item) => {
    return normalizeBarcode(item.barcode) === cleanBarcode;
  });

  let nextItem;

  if (index >= 0) {
    const previous = all[index];

    nextItem = normalizeHistoryItem({
      ...previous,
      ...patch,

      id: previous.id || cleanBarcode,
      barcode: cleanBarcode,

      source: patch.source ?? previous.source ?? "scanner",

      scannedAt: previous.scannedAt ?? patch.scannedAt ?? now,

      updatedAt: now,

      scanCount: Number(previous.scanCount ?? 0) + 1,
    });

    all[index] = nextItem;
  } else {
    nextItem = normalizeHistoryItem({
      id: cleanBarcode,
      barcode: cleanBarcode,

      name: "",
      brand: "",
      url: "",
      imageUrl: "",
      thumbnailUri: null,
      notes: "",

      source: "scanner",
      lookupSource: null,

      scannedAt: now,
      updatedAt: now,

      scanCount: 1,

      ...patch,
    });

    all.unshift(nextItem);
  }

  await saveScannedHistory(all);

  return nextItem;
}

/* -------------------------------------------------
   Remove one scanned item
-------------------------------------------------- */

export async function removeScannedItem(barcode) {
  const cleanBarcode = normalizeBarcode(barcode);

  if (!cleanBarcode) {
    return getScannedHistory();
  }

  const all = await getScannedHistory();

  const next = all.filter((item) => {
    return normalizeBarcode(item.barcode) !== cleanBarcode;
  });

  await saveScannedHistory(next);

  return next;
}

/* -------------------------------------------------
   Clear complete history
-------------------------------------------------- */

export async function clearScannedHistory() {
  try {
    await removeItem(SCANNER_HISTORY_KEY);

    return [];
  } catch (error) {
    console.log("Error clearing scanned history:", error);

    return [];
  }
}

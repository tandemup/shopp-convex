import { useCallback, useMemo } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  clearScannedHistory as clearLocalScannedHistory,
  getScannedEntryByBarcode as getLocalScannedEntryByBarcode,
  getScannedHistory as getLocalScannedHistory,
  removeScannedItem as removeLocalScannedItem,
  saveScannedEntry as saveLocalScannedEntry,
  updateScannedEntry as updateLocalScannedEntry,
} from "@/src/services/scannerHistory";

function normalizeBarcode(barcode) {
  return String(barcode || "")
    .replace(/\D/g, "")
    .trim();
}

function normalizeNullableString(value) {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  const cleanValue = String(value).trim();

  return cleanValue || undefined;
}

function toConvexScanPayload(barcode, patch = {}) {
  const cleanBarcode = normalizeBarcode(barcode || patch.barcode);

  const payload = {
    barcode: cleanBarcode,
    name: normalizeNullableString(patch.name),
    brand: normalizeNullableString(patch.brand),
    url: normalizeNullableString(patch.url),
    productUrl: normalizeNullableString(patch.productUrl),
    imageUrl: normalizeNullableString(patch.imageUrl),
    thumbnailUri: normalizeNullableString(patch.thumbnailUri),
    category: normalizeNullableString(patch.category),
    notes: normalizeNullableString(patch.notes),
    source: normalizeNullableString(patch.source),
    lookupSource: normalizeNullableString(patch.lookupSource),
    dataSource: normalizeNullableString(patch.dataSource),
    scannedAt: normalizeNullableString(patch.scannedAt),
    updatedAt: normalizeNullableString(patch.updatedAt),
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function normalizeConvexScan(item) {
  if (!item) {
    return null;
  }

  return {
    id: item._id || item.id || item.barcode,
    ...item,
    barcode: normalizeBarcode(item.barcode),
    scanCount: Number(item.scanCount ?? 1),
  };
}

function normalizeConvexScanList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(normalizeConvexScan).filter(Boolean);
}

export function useScannedHistoryStorage() {
  const convex = useConvex();
  const profile = useQuery(api.users.getMyProfile);

  const saveMyScannedEntry = useMutation(
    api.userScanHistory.saveMyScannedEntry,
  );
  const updateMyScannedEntry = useMutation(
    api.userScanHistory.updateMyScannedEntry,
  );
  const removeMyScannedEntry = useMutation(
    api.userScanHistory.removeMyScannedEntry,
  );
  const clearMyScanHistory = useMutation(
    api.userScanHistory.clearMyScanHistory,
  );

  const syncEnabled = profile?.scanHistorySyncEnabled === true;
  const loading = profile === undefined;

  const resolveSyncEnabled = useCallback(async () => {
    if (profile !== undefined) {
      return profile?.scanHistorySyncEnabled === true;
    }

    try {
      const freshProfile = await convex.query(api.users.getMyProfile, {});

      return freshProfile?.scanHistorySyncEnabled === true;
    } catch (error) {
      console.warn("[useScannedHistoryStorage] profile lookup failed", error);

      return false;
    }
  }, [convex, profile]);

  const getScannedHistory = useCallback(async () => {
    const shouldSync = await resolveSyncEnabled();

    if (!shouldSync) {
      return await getLocalScannedHistory();
    }

    const scans = await convex.query(api.userScanHistory.listMyScanHistory, {
      limit: 300,
    });

    return normalizeConvexScanList(scans);
  }, [convex, resolveSyncEnabled]);

  const getScannedEntryByBarcode = useCallback(
    async (barcode) => {
      const cleanBarcode = normalizeBarcode(barcode);

      if (!cleanBarcode) {
        return null;
      }

      const shouldSync = await resolveSyncEnabled();

      if (!shouldSync) {
        return await getLocalScannedEntryByBarcode(cleanBarcode);
      }

      const scan = await convex.query(api.userScanHistory.getMyScanByBarcode, {
        barcode: cleanBarcode,
      });

      return normalizeConvexScan(scan);
    },
    [convex, resolveSyncEnabled],
  );

  const saveScannedEntry = useCallback(
    async (barcode, patch = {}) => {
      const cleanBarcode = normalizeBarcode(barcode);

      if (!cleanBarcode) {
        return null;
      }

      const shouldSync = await resolveSyncEnabled();

      if (!shouldSync) {
        return await saveLocalScannedEntry(cleanBarcode, patch);
      }

      const scan = await saveMyScannedEntry(
        toConvexScanPayload(cleanBarcode, patch),
      );

      return normalizeConvexScan(scan);
    },
    [resolveSyncEnabled, saveMyScannedEntry],
  );

  const updateScannedEntry = useCallback(
    async (barcode, patch = {}) => {
      const cleanBarcode = normalizeBarcode(barcode);

      if (!cleanBarcode) {
        return null;
      }

      const shouldSync = await resolveSyncEnabled();

      if (!shouldSync) {
        return await updateLocalScannedEntry(cleanBarcode, patch);
      }

      const scan = await updateMyScannedEntry(
        toConvexScanPayload(cleanBarcode, patch),
      );

      return normalizeConvexScan(scan);
    },
    [resolveSyncEnabled, updateMyScannedEntry],
  );

  const removeScannedItem = useCallback(
    async (barcode) => {
      const cleanBarcode = normalizeBarcode(barcode);

      const shouldSync = await resolveSyncEnabled();

      if (!shouldSync) {
        return await removeLocalScannedItem(cleanBarcode);
      }

      await removeMyScannedEntry({ barcode: cleanBarcode });

      return await getScannedHistory();
    },
    [getScannedHistory, removeMyScannedEntry, resolveSyncEnabled],
  );

  const clearScannedHistory = useCallback(async () => {
    const shouldSync = await resolveSyncEnabled();

    if (!shouldSync) {
      return await clearLocalScannedHistory();
    }

    await clearMyScanHistory({});

    return [];
  }, [clearMyScanHistory, resolveSyncEnabled]);

  return useMemo(
    () => ({
      syncEnabled,
      loading,
      getScannedHistory,
      getScannedEntryByBarcode,
      saveScannedEntry,
      updateScannedEntry,
      removeScannedItem,
      clearScannedHistory,
    }),
    [
      syncEnabled,
      loading,
      getScannedHistory,
      getScannedEntryByBarcode,
      saveScannedEntry,
      updateScannedEntry,
      removeScannedItem,
      clearScannedHistory,
    ],
  );
}

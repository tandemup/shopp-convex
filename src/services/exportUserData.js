// services/exportUserData.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  shoppingLists: "shopping_lists",
  purchaseHistory: "purchase_history",
  scanHistory: "scanner_history_v1",
  userProfile: "user_profile",
};

function safeJsonParse(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (error) {
    console.warn("Error parsing JSON:", error);
    return fallback;
  }
}

function buildExportFilename() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `shopp-export-${yyyy}${mm}${dd}-${hh}${min}.json`;
}

function downloadJsonOnWeb(filename, jsonString) {
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportUserDataToJson(options = {}) {
  const { userId = null, username = null, city = null, zones = [] } = options;

  const [shoppingListsRaw, purchaseHistoryRaw, scanHistoryRaw, userProfileRaw] =
    await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.shoppingLists),
      AsyncStorage.getItem(STORAGE_KEYS.purchaseHistory),
      AsyncStorage.getItem(STORAGE_KEYS.scanHistory),
      AsyncStorage.getItem(STORAGE_KEYS.userProfile),
    ]);

  const storedUserProfile = safeJsonParse(userProfileRaw, {});

  const exportData = {
    exportedAt: new Date().toISOString(),
    app: "Shopp",
    version: 1,

    user: {
      id: userId || storedUserProfile.id || null,
      username: username || storedUserProfile.username || null,
      city: city || storedUserProfile.city || null,
      zones: zones.length > 0 ? zones : storedUserProfile.zones || [],
    },

    shoppingLists: safeJsonParse(shoppingListsRaw, []),
    purchaseHistory: safeJsonParse(purchaseHistoryRaw, []),
    scanHistory: safeJsonParse(scanHistoryRaw, []),
  };

  const filename = buildExportFilename();
  const jsonString = JSON.stringify(exportData, null, 2);

  if (Platform.OS === "web") {
    downloadJsonOnWeb(filename, jsonString);

    return {
      ok: true,
      filename,
      platform: "web",
    };
  }

  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      dialogTitle: "Exportar datos de Shopp",
      UTI: "public.json",
    });
  }

  return {
    ok: true,
    filename,
    fileUri,
    platform: Platform.OS,
  };
}

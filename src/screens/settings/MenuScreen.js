import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  getSearchSettings,
  DEFAULT_SEARCH_SETTINGS,
} from "@/src/storage/settingsStorage";

import { SEARCH_ENGINES } from "@/src/constants/searchEngines";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";

import { ROUTES } from "@/src/navigation/ROUTES";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

import {
  clearActiveLists,
  clearArchivedLists,
  clearPurchaseHistory,
  clearStorage,
  getUserScopedStorageKey,
  STORAGE_KEYS,
} from "@/src/storage";

import { useScannedHistoryStorage } from "@/src/hooks/useScannedHistoryStorage";
import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";

const USER_EXPORT_VERSION = 1;

const EXPORT_STORAGE_KEYS = {
  userProfile: "user_profile",
  shoppingLists: "shopping_lists",
  archivedLists: "archived_lists",
  purchaseHistory: "purchase_history",
  scanHistory: "scanner_history_v1",
};

const CAMERA_GRANTED_STORAGE_KEY = "shopp:web-camera-access-granted";

const ADMIN_EMAIL = "info@ramshopp.com";
const IMPORT_ITEMS_CHUNK_SIZE = 150;

function buildImportBatchId() {
  return `async-storage-items-${Date.now().toString(36)}`;
}

function normalizeImportNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeImportString(value) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function sanitizeForConvex(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch (error) {
    return null;
  }
}

function buildImportKey(list, item, listIndex, itemIndex) {
  const listId = normalizeImportString(list?.id) || `list-${listIndex}`;
  const itemId = normalizeImportString(item?.id) || `item-${itemIndex}`;
  const barcode = normalizeImportString(item?.barcode) || "no-barcode";
  const name = normalizeImportString(item?.name) || "no-name";

  return [listId, itemId, barcode, name].join(":");
}

function buildImportItemsFromLists(lists) {
  if (!Array.isArray(lists)) {
    return [];
  }

  return lists.flatMap((list, listIndex) => {
    const items = Array.isArray(list?.items) ? list.items : [];

    return items.map((item, itemIndex) => ({
      importKey: buildImportKey(list, item, listIndex, itemIndex),

      listId: normalizeImportString(list?.id),
      listName: normalizeImportString(list?.name),
      listArchived: list?.archived === true,
      listCreatedAt: normalizeImportNumber(list?.createdAt),
      listArchivedAt:
        list?.archivedAt === null
          ? null
          : normalizeImportNumber(list?.archivedAt),
      storeId: list?.storeId ?? null,

      itemId: normalizeImportString(item?.id),
      name: normalizeImportString(item?.name),
      barcode: normalizeImportString(item?.barcode),
      quantity: normalizeImportNumber(
        item?.quantity ?? item?.qty ?? item?.priceInfo?.qty,
      ),
      unit: normalizeImportString(item?.unit ?? item?.priceInfo?.unit),
      unitPrice: normalizeImportNumber(
        item?.unitPrice ?? item?.price ?? item?.priceInfo?.unitPrice,
      ),
      checked: item?.checked === true,

      categoryId: item?.categoryId ?? null,
      categoryName: item?.categoryName ?? null,
      subcategoryId: item?.subcategoryId ?? null,
      subcategoryName: item?.subcategoryName ?? null,

      rawList: sanitizeForConvex(list),
      rawItem: sanitizeForConvex(item),
    }));
  });
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function openAdminEmail() {
  const subject = encodeURIComponent("Contacto con administración Shopp");
  const body = encodeURIComponent(
    "Hola,\n\nQuiero ponerme en contacto con la administración de Shopp y denunciar Fake News y delitos contra la intimidad personal y familiar.\n\n",
  );

  Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`);
}

function buildProductSearchEngineSubtitle(settings) {
  const engineId =
    settings?.selectedProductEngine ||
    settings?.generalEngine ||
    DEFAULT_SEARCH_SETTINGS?.selectedProductEngine ||
    DEFAULT_SEARCH_SETTINGS?.generalEngine ||
    "google";

  const engine = SEARCH_ENGINES?.[engineId];

  const engineLabel = engine?.label || engine?.name || engineId;

  return `Motor activo: ${engineLabel}`;
}

function getPermissionLabel(permission) {
  if (!permission) return "Comprobando...";

  if (permission.granted) return "Concedido";
  if (permission.canAskAgain === false) return "Bloqueado";
  if (permission.status === "denied") return "Denegado";

  return "No solicitado";
}

function getPermissionColor(permission) {
  if (!permission) return "#64748b";

  if (permission.granted) return "#16a34a";
  if (permission.canAskAgain === false) return "#dc2626";
  if (permission.status === "denied") return "#f97316";

  return "#64748b";
}

function safeJsonParse(value, fallbackValue) {
  try {
    if (!value) return fallbackValue;
    return JSON.parse(value);
  } catch (error) {
    console.warn("[MenuScreen] JSON parse error", error);
    return fallbackValue;
  }
}

async function getStoredJson(key, fallbackValue) {
  const rawValue = await AsyncStorage.getItem(key);
  return safeJsonParse(rawValue, fallbackValue);
}

function buildExportFilename() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `shopp-user-export-${yyyy}${mm}${dd}-${hh}${min}.json`;
}

function downloadJsonOnWeb(filename, jsonString) {
  if (typeof document === "undefined") {
    throw new Error("document is not available");
  }

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

async function exportUserDataToJsonFile() {
  const [
    userProfile,
    shoppingLists,
    archivedLists,
    purchaseHistory,
    scanHistory,
  ] = await Promise.all([
    getStoredJson(EXPORT_STORAGE_KEYS.userProfile, {}),
    getStoredJson(EXPORT_STORAGE_KEYS.shoppingLists, []),
    getStoredJson(EXPORT_STORAGE_KEYS.archivedLists, []),
    getStoredJson(EXPORT_STORAGE_KEYS.purchaseHistory, []),
    getStoredJson(EXPORT_STORAGE_KEYS.scanHistory, []),
  ]);

  const exportData = {
    app: "Shopp",
    type: "user-data-export",
    version: USER_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),

    user: {
      id: userProfile?.id ?? null,
      username: userProfile?.username ?? null,
      city: userProfile?.city ?? null,
      zones: Array.isArray(userProfile?.zones) ? userProfile.zones : [],
      raw: userProfile ?? {},
    },

    data: {
      purchaseHistory,
      shoppingLists,
      archivedLists,
      scanHistory,
    },

    meta: {
      platform: Platform.OS,
      storageKeys: EXPORT_STORAGE_KEYS,
    },
  };

  const filename = buildExportFilename();
  const jsonString = JSON.stringify(exportData, null, 2);

  if (Platform.OS === "web") {
    downloadJsonOnWeb(filename, jsonString);

    return {
      ok: true,
      filename,
      platform: "web",
      shared: false,
      fileUri: null,
    };
  }

  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return {
    ok: true,
    filename,
    platform: Platform.OS,
    shared: false,
    fileUri,
  };
}

function getGrantedPermissionMessage() {
  if (Platform.OS === "web") {
    return "El permiso ya está concedido. Para volver a preguntar, revócalo desde los permisos del sitio: pulsa el icono junto a la URL, cambia el permiso a bloquear o preguntar, y recarga la página.";
  }

  return "El permiso ya está concedido. Android/iOS no permiten anularlo desde la app para volver a mostrar el diálogo del sistema. Puedes revocarlo manualmente desde Ajustes y después volver a tocar esta opción.";
}

function getBlockedPermissionMessage() {
  if (Platform.OS === "web") {
    return "El permiso está bloqueado en el navegador. Para cambiarlo, pulsa el icono de permisos junto a la URL y habilita el acceso desde los ajustes del sitio.";
  }

  return "El permiso está bloqueado para Shopp. Para cambiarlo, abre los ajustes del sistema y habilita el permiso manualmente.";
}

function getOpenSettingsButtons() {
  if (Platform.OS === "web") {
    return [];
  }

  return [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Abrir ajustes",
      onPress: async () => {
        await Linking.openSettings();
      },
    },
  ];
}

function showDestructiveConfirm(title, message, confirmText, onConfirm) {
  safeAlert(title, message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: confirmText,
      style: "destructive",
      onPress: onConfirm,
    },
  ]);
}

async function handlePermissionPress(permission, requestPermission, label) {
  if (permission?.granted) {
    safeAlert(
      `${label} concedido`,
      getGrantedPermissionMessage(),
      getOpenSettingsButtons(),
    );
    return;
  }

  if (permission?.canAskAgain === false) {
    safeAlert(
      "Permiso bloqueado",
      getBlockedPermissionMessage(),
      getOpenSettingsButtons(),
    );
    return;
  }

  await requestPermission();
}

function PermissionRow({ icon, title, description, permission, onPress }) {
  const label = getPermissionLabel(permission);
  const color = getPermissionColor(permission);

  return (
    <Pressable style={styles.permissionRow} onPress={onPress}>
      <View style={styles.permissionIconBox}>
        <Ionicons name={icon} size={22} color="#0f172a" />
      </View>

      <View style={styles.permissionTextBox}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>

      <View style={[styles.permissionBadge, { borderColor: color }]}>
        <Text style={[styles.permissionBadgeText, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  danger = false,
  disabled = false,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        danger && styles.dangerCard,
        disabled && styles.disabledCard,
        pressed && !disabled && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.cardIconBox, danger && styles.dangerIconBox]}>
          <Ionicons
            name={icon}
            size={22}
            color={danger ? "#dc2626" : "#0f172a"}
          />
        </View>

        <View style={styles.cardTextBox}>
          <Text
            style={[styles.cardTitle, danger && styles.dangerText]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.cardRight}>
        {badge ? (
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{badge}</Text>
          </View>
        ) : null}

        <Ionicons
          name={danger ? "warning-outline" : "chevron-forward"}
          size={20}
          color={danger ? "#dc2626" : "#94a3b8"}
        />
      </View>
    </Pressable>
  );
}

function UserAccountCard({ user }) {
  const isLoading = user === undefined;

  const displayName =
    user?.name || user?.email || user?._id || "Usuario autenticado";

  const displayEmail = user?.email || "Email no disponible";

  return (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Ionicons name="person-outline" size={26} color="#2563eb" />
      </View>

      <View style={styles.userTextBox}>
        <Text style={styles.userName} numberOfLines={1}>
          {isLoading ? "Cargando usuario..." : displayName}
        </Text>

        <Text style={styles.userEmail} numberOfLines={1}>
          {isLoading ? "Obteniendo datos de Convex Auth" : displayEmail}
        </Text>

        {!isLoading && user?._id ? (
          <Text style={styles.userId} numberOfLines={1}>
            ID: {String(user._id)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

async function getWebCameraPermissionStatus() {
  if (Platform.OS !== "web") {
    return null;
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      granted: false,
      status: "denied",
      canAskAgain: false,
    };
  }

  if (!navigator.permissions?.query) {
    const remembered =
      window.localStorage.getItem(CAMERA_GRANTED_STORAGE_KEY) === "true";

    return {
      granted: remembered,
      status: remembered ? "granted" : "undetermined",
      canAskAgain: true,
    };
  }

  try {
    const permission = await navigator.permissions.query({
      name: "camera",
    });

    return {
      granted: permission.state === "granted",
      status:
        permission.state === "granted"
          ? "granted"
          : permission.state === "denied"
            ? "denied"
            : "undetermined",
      canAskAgain: permission.state !== "denied",
    };
  } catch (error) {
    const remembered =
      window.localStorage.getItem(CAMERA_GRANTED_STORAGE_KEY) === "true";

    return {
      granted: remembered,
      status: remembered ? "granted" : "undetermined",
      canAskAgain: true,
    };
  }
}

async function requestWebCameraPermission() {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      granted: false,
      status: "denied",
      canAskAgain: false,
    };
  }

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment",
        },
      },
      audio: false,
    });

    window.localStorage.setItem(CAMERA_GRANTED_STORAGE_KEY, "true");

    return {
      granted: true,
      status: "granted",
      canAskAgain: true,
    };
  } catch (error) {
    window.localStorage.removeItem(CAMERA_GRANTED_STORAGE_KEY);

    const blocked =
      error?.name === "NotAllowedError" || error?.name === "SecurityError";

    return {
      granted: false,
      status: blocked ? "denied" : "undetermined",
      canAskAgain: !blocked,
    };
  } finally {
    stream?.getTracks?.().forEach((track) => {
      track.stop();
    });
  }
}

export default function MenuScreen({ navigation }) {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.current);
  const importItemsFromAsyncStorage = useMutation(
    api.shoppingImport.importItemsFromAsyncStorage,
  );
  const scanHistoryStorage = useScannedHistoryStorage();

  const [nativeCameraPermission, requestNativeCameraPermission] =
    useCameraPermissions();

  const [webCameraPermission, setWebCameraPermission] = useState(null);

  const [locationPermission, setLocationPermission] = useState(null);
  const [exportingUserData, setExportingUserData] = useState(false);
  const [importingItems, setImportingItems] = useState(false);
  const [productSearchEngineSubtitle, setProductSearchEngineSubtitle] =
    useState("Motor activo: Google");

  const { clearActiveListsState, clearArchivedListsState, clearAllListsState } =
    useLists();

  const tabBarHeight = useBottomTabBarHeight();
  const { reloadStoresFromSeed } = useStores();
  const isAdmin =
    currentUser?.isAdmin === true || currentUser?.role === "admin";

  const handleSignOut = () => {
    safeAlert("Cerrar sesión", "¿Quieres cerrar tu sesión de Shopp?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Settings",
        preset: "light",
      }),
    [],
  );

  const cameraPermission =
    Platform.OS === "web" ? webCameraPermission : nativeCameraPermission;

  useEffect(() => {
    let mounted = true;

    async function loadWebCameraPermission() {
      if (Platform.OS !== "web") {
        return;
      }

      const result = await getWebCameraPermissionStatus();

      if (mounted) {
        setWebCameraPermission(result);
      }
    }

    loadWebCameraPermission();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useEffect(() => {
    let mounted = true;

    async function loadLocationPermission() {
      try {
        if (Platform.OS === "web") {
          if (
            typeof navigator !== "undefined" &&
            navigator.permissions?.query
          ) {
            const result = await navigator.permissions.query({
              name: "geolocation",
            });

            if (!mounted) return;

            setLocationPermission({
              granted: result.state === "granted",
              status:
                result.state === "granted"
                  ? "granted"
                  : result.state === "denied"
                    ? "denied"
                    : "undetermined",
              canAskAgain: result.state !== "denied",
            });

            return;
          }

          if (mounted) {
            setLocationPermission({
              granted: false,
              status: "undetermined",
              canAskAgain: true,
            });
          }

          return;
        }

        const result = await Location.getForegroundPermissionsAsync();

        if (mounted) {
          setLocationPermission(result);
        }
      } catch (error) {
        console.warn("[MenuScreen] location permission error", error);

        if (mounted) {
          setLocationPermission({
            granted: false,
            status: "undetermined",
            canAskAgain: true,
          });
        }
      }
    }

    loadLocationPermission();

    return () => {
      mounted = false;
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === "web") {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          setLocationPermission({
            granted: false,
            status: "denied",
            canAskAgain: false,
          });

          safeAlert(
            "Ubicación no disponible",
            "Este navegador no permite usar geolocalización.",
          );

          return;
        }

        const result = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              resolve({
                granted: true,
                status: "granted",
                canAskAgain: true,
              });
            },
            (error) => {
              const blocked = error?.code === 1;

              resolve({
                granted: false,
                status: blocked ? "denied" : "undetermined",
                canAskAgain: !blocked,
              });
            },
            {
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 60000,
            },
          );
        });

        setLocationPermission(result);
        return;
      }

      const result = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(result);
    } catch (error) {
      console.warn("[MenuScreen] request location permission error", error);

      setLocationPermission({
        granted: false,
        status: "undetermined",
        canAskAgain: true,
      });
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === "web") {
      const result = await requestWebCameraPermission();

      setWebCameraPermission(result);

      return result;
    }

    return requestNativeCameraPermission();
  };

  const goToProfile = () => {
    navigation.navigate(ROUTES.PROFILE);
  };

  const goToAdminUsers = () => {
    navigation.navigate(ROUTES.ADMIN_USERS);
  };

  const goToProductSearchEngines = () => {
    navigation.navigate(ROUTES.SEARCH_ENGINE_SETTINGS, {
      type: "product",
    });
  };

  const goToBookSearchEngines = () => {
    navigation.navigate(ROUTES.SEARCH_ENGINE_SETTINGS, {
      type: "book",
    });
  };

  const goToBarcodeSettings = () => {
    navigation.navigate(ROUTES.BARCODE_SETTINGS);
  };

  const goToScannedHistory = () => {
    navigation.navigate(ROUTES.SCANNER_TAB, {
      screen: ROUTES.SCANNED_HISTORY,
    });
  };

  const goToShoppingLists = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: ROUTES.SHOPPING_TAB,
          params: { screen: ROUTES.SHOPPING_LISTS },
        },
      ],
    });
  };

  const handleExportUserData = async () => {
    if (exportingUserData) return;

    try {
      setExportingUserData(true);

      const result = await exportUserDataToJsonFile();
      const exportMessage = result.shared
        ? `Se ha generado el fichero ${result.filename}.`
        : result.platform === "web"
          ? `Se ha descargado el fichero ${result.filename}.`
          : `Se ha guardado el fichero ${result.filename} en el almacenamiento local de la app.`;

      safeAlert("Exportación completada", exportMessage);
    } catch (error) {
      console.warn("[MenuScreen] export user data error", error);

      safeAlert(
        "Error al exportar",
        "No se pudieron exportar los datos del usuario y el historial de compras.",
      );
    } finally {
      setExportingUserData(false);
    }
  };

  const handleImportItemsToConvex = async () => {
    if (importingItems) return;

    if (!isAdmin) {
      safeAlert(
        "Acceso restringido",
        "Solo los administradores pueden subir items a Convex.",
      );
      return;
    }

    try {
      setImportingItems(true);

      const userId = currentUser?._id || "anonymous";
      const scopedListsKey = getUserScopedStorageKey(
        userId,
        STORAGE_KEYS.LISTS,
      );

      const scopedLists = await getStoredJson(scopedListsKey, null);
      const legacyLists = await getStoredJson(
        EXPORT_STORAGE_KEYS.shoppingLists,
        [],
      );
      const lists = Array.isArray(scopedLists) ? scopedLists : legacyLists;
      const items = buildImportItemsFromLists(lists);

      if (items.length === 0) {
        safeAlert(
          "Sin items para subir",
          "No se encontraron items en las listas guardadas en AsyncStorage.",
        );
        return;
      }

      const importBatchId = buildImportBatchId();
      const chunks = chunkArray(items, IMPORT_ITEMS_CHUNK_SIZE);
      const summary = {
        total: 0,
        inserted: 0,
        skipped: 0,
      };

      for (const chunk of chunks) {
        const result = await importItemsFromAsyncStorage({
          importBatchId,
          items: chunk,
        });

        summary.total += result.total || 0;
        summary.inserted += result.inserted || 0;
        summary.skipped += result.skipped || 0;
      }

      safeAlert(
        "Importación completada",
        [
          `Items encontrados: ${summary.total}`,
          `Subidos a Convex: ${summary.inserted}`,
          `Omitidos por duplicado: ${summary.skipped}`,
        ].join("\n"),
      );
    } catch (error) {
      console.warn("[MenuScreen] import items to Convex error", error);

      safeAlert(
        "Error al subir items",
        error?.message || "No se pudieron subir los items a Convex.",
      );
    } finally {
      setImportingItems(false);
    }
  };

  const handleClearActiveLists = async () => {
    await clearActiveLists();
    clearActiveListsState();
    goToShoppingLists();
  };

  const handleClearArchivedLists = async () => {
    await clearArchivedLists();
    clearArchivedListsState();
    goToShoppingLists();
  };

  const handleClearPurchaseHistory = async () => {
    await clearPurchaseHistory();
    goToShoppingLists();
  };

  const handleClearScannedHistory = async () => {
    await scanHistoryStorage.clearScannedHistory();
    goToScannedHistory();
  };

  const handleReloadStores = () => {
    safeAlert(
      "Recargar tiendas",
      "Se eliminarán los cambios locales en tiendas y se volverán a cargar desde los datos iniciales. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recargar",
          style: "destructive",
          onPress: async () => {
            await reloadStoresFromSeed();
            goToShoppingLists();
          },
        },
      ],
    );
  };

  const handleClearAllStorage = () => {
    safeAlert(
      "Borrar almacenamiento",
      "¿Seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: async () => {
            await clearStorage();
            clearAllListsState();
            await scanHistoryStorage.clearScannedHistory();
            await reloadStoresFromSeed();
            goToShoppingLists();
          },
        },
      ],
    );
  };

  const loadProductSearchEngineSubtitle = useCallback(async () => {
    try {
      const settings = await getSearchSettings();
      const subtitle = buildProductSearchEngineSubtitle(settings);

      setProductSearchEngineSubtitle(subtitle);
    } catch (error) {
      console.warn("[MenuScreen] product search settings error", error);

      const fallbackSubtitle = buildProductSearchEngineSubtitle(
        DEFAULT_SEARCH_SETTINGS,
      );

      setProductSearchEngineSubtitle(fallbackSubtitle);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProductSearchEngineSubtitle();
    }, [loadProductSearchEngineSubtitle]),
  );

  function Email({ onPress }) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>

        <SettingsCard
          icon="mail-outline"
          title="Contacto con administración"
          subtitle={`Enviar un mensaje privado a ${ADMIN_EMAIL} con fotos, vídeos o documentos adjuntos`}
          badge="EMAIL"
          onPress={onPress}
        />
      </View>
    );
  }

  function DangerZone({}) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>

        <SettingsCard
          icon="trash-outline"
          title="Borrar listas activas"
          subtitle="Elimina las listas de compra que todavía no están archivadas"
          danger
          onPress={() =>
            showDestructiveConfirm(
              "Borrar listas activas",
              "¿Seguro?",
              "Borrar",
              handleClearActiveLists,
            )
          }
        />

        <SettingsCard
          icon="file-tray-outline"
          title="Borrar listas archivadas"
          subtitle="Elimina las listas guardadas como archivadas"
          danger
          onPress={() =>
            showDestructiveConfirm(
              "Borrar listas archivadas",
              "¿Seguro?",
              "Borrar",
              handleClearArchivedLists,
            )
          }
        />

        <SettingsCard
          icon="receipt-outline"
          title="Borrar historial de compras"
          subtitle="Limpia los registros generados a partir de compras anteriores"
          danger
          onPress={() =>
            showDestructiveConfirm(
              "Borrar historial de compras",
              "¿Seguro?",
              "Borrar",
              handleClearPurchaseHistory,
            )
          }
        />

        <SettingsCard
          icon="barcode-outline"
          title="Borrar historial de escaneos"
          subtitle="Elimina productos y códigos guardados desde el scanner"
          danger
          onPress={() =>
            showDestructiveConfirm(
              "Borrar historial de escaneos",
              "¿Seguro?",
              "Borrar",
              handleClearScannedHistory,
            )
          }
        />

        <SettingsCard
          icon="refresh-outline"
          title="Recargar tiendas"
          subtitle="Restaura las tiendas desde los datos iniciales del proyecto"
          danger
          onPress={handleReloadStores}
        />

        <SettingsCard
          icon="close-circle-outline"
          title="Borrar almacenamiento completo"
          subtitle="Elimina todos los datos locales guardados por la aplicación"
          danger
          onPress={handleClearAllStorage}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: tabBarHeight + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>Shopp</Text>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.headerIconBox}>
              <Ionicons name="settings-outline" size={26} color="#0f172a" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>

            <UserAccountCard user={currentUser} />

            <SettingsCard
              icon="person-circle-outline"
              title="Mi perfil"
              subtitle="Editar alias público, teléfono y privacidad de Parking"
              onPress={goToProfile}
            />

            {isAdmin ? (
              <SettingsCard
                icon="shield-checkmark-outline"
                title="Administrar usuarios"
                subtitle="Consultar usuarios y asignar roles"
                badge="ADMIN"
                onPress={goToAdminUsers}
              />
            ) : null}

            <SettingsCard
              icon="log-out-outline"
              title="Cerrar sesión"
              subtitle="Salir de tu cuenta de Shopp en este dispositivo"
              danger
              onPress={handleSignOut}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Búsqueda</Text>

            <SettingsCard
              icon="search-outline"
              title="Product Search Engines"
              subtitle={productSearchEngineSubtitle}
              onPress={goToProductSearchEngines}
            />

            <SettingsCard
              icon="book-outline"
              title="Book Search Engines"
              subtitle="Google Books, Open Library..."
              onPress={goToBookSearchEngines}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escáner</Text>

            <SettingsCard
              icon="barcode-outline"
              title="Configuración del código de barras"
              subtitle="Formatos admitidos: EAN-13, EAN-8..."
              onPress={goToBarcodeSettings}
            />

            <SettingsCard
              icon="time-outline"
              title="Historial de escaneos"
              subtitle="Consulta los códigos escaneados recientemente"
              onPress={goToScannedHistory}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos</Text>

            <SettingsCard
              icon="download-outline"
              title="Exportar datos a JSON"
              subtitle="Genera un fichero con datos del usuario, listas, historial de compras e historial de escaneos"
              badge={exportingUserData ? "..." : "JSON"}
              disabled={exportingUserData}
              onPress={handleExportUserData}
            />
          </View>

          {isAdmin ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Migración temporal</Text>

              <SettingsCard
                icon="cloud-upload-outline"
                title="Subir items locales a Convex"
                subtitle="Lee los items de AsyncStorage y los guarda en una tabla temporal"
                badge={importingItems ? "..." : "ADMIN"}
                disabled={importingItems}
                onPress={handleImportItemsToConvex}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permisos</Text>

            <View style={styles.permissionsCard}>
              <View style={styles.permissionsHeader}>
                <View style={styles.permissionsHeaderTextBox}>
                  <Text style={styles.permissionsTitle}>
                    Accesos del dispositivo
                  </Text>

                  <Text style={styles.permissionsSubtitle}>
                    Cámara, micrófono, ubicación y permisos necesarios para la
                    app
                  </Text>
                </View>

                <Ionicons
                  name="shield-checkmark-outline"
                  size={24}
                  color="#0f172a"
                />
              </View>

              <PermissionRow
                icon="camera-outline"
                title="Cámara"
                description="Necesaria para escanear códigos de barras."
                permission={cameraPermission}
                onPress={() =>
                  handlePermissionPress(
                    cameraPermission,
                    requestCameraPermission,
                    "Cámara",
                  )
                }
              />

              {Platform.OS !== "web" ? (
                <PermissionRow
                  icon="mic-outline"
                  title="Micrófono"
                  description="Necesario solo si grabas vídeo con audio."
                  permission={null}
                  onPress={() => {
                    safeAlert(
                      "Micrófono",
                      "Shopp no necesita micrófono para escanear códigos de barras.",
                    );
                  }}
                />
              ) : null}

              <PermissionRow
                icon="location-outline"
                title="Ubicación"
                description="Necesaria para tiendas cercanas y mapas."
                permission={locationPermission}
                onPress={() =>
                  handlePermissionPress(
                    locationPermission,
                    requestLocationPermission,
                    "Ubicación",
                  )
                }
              />

              {Platform.OS === "web" ? (
                <Text style={styles.permissionNote}>
                  En web, los permisos dependen del navegador, del uso de HTTPS
                  y de los ajustes del sitio.
                </Text>
              ) : (
                <Text style={styles.permissionNote}>
                  Si un permiso ya está concedido, Android/iOS no permiten
                  volver a mostrar el diálogo del sistema desde la app. Para
                  probar el flujo otra vez, revoca el permiso desde Ajustes.
                </Text>
              )}
            </View>
          </View>
          <Email onPress={openAdminEmail} />
          {/* <DangerZone /> */}

          <View style={styles.footerSpace} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  headerEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
  },

  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  card: {
    minHeight: 76,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  disabledCard: {
    opacity: 0.55,
  },

  dangerCard: {
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
  },

  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  dangerIconBox: {
    backgroundColor: "#fee2e2",
  },

  cardTextBox: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  dangerText: {
    color: "#dc2626",
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  cardBadge: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },

  cardBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0369a1",
  },

  userCard: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  userTextBox: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },

  userEmail: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  userId: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },

  permissionsCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  permissionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  permissionsHeaderTextBox: {
    flex: 1,
    paddingRight: 10,
  },

  permissionsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  permissionsSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  permissionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  permissionTextBox: {
    flex: 1,
    minWidth: 0,
  },

  permissionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },

  permissionDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: "#64748b",
  },

  permissionBadge: {
    marginLeft: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#fff",
  },

  permissionBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  permissionNote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
  },

  footerSpace: {
    height: 24,
  },
});

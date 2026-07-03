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
import * as Sharing from "expo-sharing";

import {
  getSearchSettings,
  DEFAULT_SEARCH_SETTINGS,
} from "@/src/storage/settingsStorage";
import { useAuthActions } from "@convex-dev/auth/react";
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
} from "@/src/storage";

import { clearScannedHistory } from "@/src/services/scannerHistory";
import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";

const USER_EXPORT_VERSION = 1;

const EXPORT_STORAGE_KEYS = {
  userProfile: "user_profile",
  shoppingLists: "shopping_lists",
  archivedLists: "archived_lists",
  purchaseHistory: "purchase_history",
  scanHistory: "scanned_history",
};

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
    platform: Platform.OS,
    shared: canShare,
    fileUri,
  };
}

async function handlePermissionPress(permission, requestPermission, label) {
  if (permission?.granted) {
    if (Platform.OS === "web") {
      safeAlert(
        `${label} concedido`,
        "El permiso ya está concedido. Para volver a preguntar, revócalo desde los permisos del sitio: pulsa el icono junto a la URL, cambia el permiso a bloquear o preguntar, y recarga la página.",
      );
      return;
    }

    safeAlert(
      `${label} concedido`,
      "El permiso ya está concedido. Android/iOS no permiten anularlo desde la app para volver a mostrar el diálogo del sistema. Puedes revocarlo manualmente desde Ajustes y después volver a tocar esta opción.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abrir ajustes",
          onPress: async () => {
            await Linking.openSettings();
          },
        },
      ],
    );

    return;
  }

  if (permission?.canAskAgain === false) {
    if (Platform.OS === "web") {
      safeAlert(
        "Permiso bloqueado",
        "El permiso está bloqueado en el navegador. Para cambiarlo, pulsa el icono de permisos junto a la URL y habilita el acceso desde los ajustes del sitio.",
      );
      return;
    }

    await Linking.openSettings();
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

const CAMERA_GRANTED_STORAGE_KEY = "shopp:web-camera-access-granted";

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

  const [nativeCameraPermission, requestNativeCameraPermission] =
    useCameraPermissions();

  const [webCameraPermission, setWebCameraPermission] = useState(null);

  const [locationPermission, setLocationPermission] = useState(null);
  const [exportingUserData, setExportingUserData] = useState(false);
  const [productSearchEngineSubtitle, setProductSearchEngineSubtitle] =
    useState("Motor activo: Google");

  const { clearActiveListsState, clearArchivedListsState, clearAllListsState } =
    useLists();

  const tabBarHeight = useBottomTabBarHeight();
  const { reloadStoresFromSeed } = useStores();
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

      if (Platform.OS === "web") {
        safeAlert(
          "Exportación completada",
          `Se ha descargado el fichero ${result.filename}.`,
        );
        return;
      }

      if (result.shared) {
        safeAlert(
          "Exportación completada",
          `Se ha generado el fichero ${result.filename}.`,
        );
        return;
      }

      safeAlert(
        "Exportación completada",
        `Se ha guardado el fichero ${result.filename} en el almacenamiento local de la app.`,
      );
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
    await clearScannedHistory();
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
            await clearScannedHistory();
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>

            <SettingsCard
              icon="log-out-outline"
              title="Cerrar sesión"
              subtitle="Salir de tu cuenta de Shopp en este dispositivo"
              danger
              onPress={handleSignOut}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>

            <SettingsCard
              icon="trash-outline"
              title="Borrar listas activas"
              subtitle="Elimina las listas de compra que todavía no están archivadas"
              danger
              onPress={() =>
                safeAlert("Borrar listas activas", "¿Seguro?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Borrar",
                    style: "destructive",
                    onPress: handleClearActiveLists,
                  },
                ])
              }
            />

            <SettingsCard
              icon="file-tray-outline"
              title="Borrar listas archivadas"
              subtitle="Elimina las listas guardadas como archivadas"
              danger
              onPress={() =>
                safeAlert("Borrar listas archivadas", "¿Seguro?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Borrar",
                    style: "destructive",
                    onPress: handleClearArchivedLists,
                  },
                ])
              }
            />

            <SettingsCard
              icon="receipt-outline"
              title="Borrar historial de compras"
              subtitle="Limpia los registros generados a partir de compras anteriores"
              danger
              onPress={() =>
                safeAlert("Borrar historial de compras", "¿Seguro?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Borrar",
                    style: "destructive",
                    onPress: handleClearPurchaseHistory,
                  },
                ])
              }
            />

            <SettingsCard
              icon="barcode-outline"
              title="Borrar historial de escaneos"
              subtitle="Elimina productos y códigos guardados desde el scanner"
              danger
              onPress={() =>
                safeAlert("Borrar historial de escaneos", "¿Seguro?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Borrar",
                    style: "destructive",
                    onPress: handleClearScannedHistory,
                  },
                ])
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

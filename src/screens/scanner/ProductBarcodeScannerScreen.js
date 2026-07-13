// screens/scanner/ProductBarcodeScannerScreen.js

import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { ROUTES } from "@/src/navigation/ROUTES";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";
import { getBarcodeSettings } from "@/src/storage/barcodeSettingsStorage";
import { normalizeBarcode } from "@/src/utils/barcodeNormalization";
import {
  DEFAULT_SCANNER_ZOOM,
  getNextScannerZoom,
  getScannerZoomLabel,
  loadScannerZoom,
  saveScannerZoom,
} from "@/src/utils/scannerZoomStorage";

const DEFAULT_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"];

const ALLOWED_BARCODE_TYPES = new Set([
  "aztec",
  "codabar",
  "code39",
  "code93",
  "code128",
  "datamatrix",
  "ean8",
  "ean13",
  "itf14",
  "pdf417",
  "qr",
  "upc_a",
  "upc_e",
]);

function normalizeBarcodeTypes(value) {
  if (Array.isArray(value)) {
    const filtered = value.filter((type) => ALLOWED_BARCODE_TYPES.has(type));
    return filtered.length > 0 ? filtered : DEFAULT_BARCODE_TYPES;
  }

  if (value && typeof value === "object") {
    const filtered = Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([type]) => type)
      .filter((type) => ALLOWED_BARCODE_TYPES.has(type));

    return filtered.length > 0 ? filtered : DEFAULT_BARCODE_TYPES;
  }

  return DEFAULT_BARCODE_TYPES;
}

export default function ProductBarcodeScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const scannedRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_SCANNER_ZOOM);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const [barcodeTypes, setBarcodeTypes] = useState(DEFAULT_BARCODE_TYPES);

  const {
    listId,
    itemId,
    returnToTab = ROUTES.SHOPPING_TAB,
  } = route.params || {};

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Escanear código",
        preset: "light",
      }),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      scannedRef.current = false;
      setLocked(false);
      setTorchEnabled(false);

      async function loadScannerPreferences() {
        try {
          const [settings, storedZoom] = await Promise.all([
            getBarcodeSettings(),
            loadScannerZoom(),
          ]);

          if (!isActive) return;

          setBarcodeTypes(normalizeBarcodeTypes(settings?.formats));
          setZoom(storedZoom);
        } catch (error) {
          if (!isActive) return;

          setBarcodeTypes(DEFAULT_BARCODE_TYPES);
          setZoom(DEFAULT_SCANNER_ZOOM);
        }
      }

      loadScannerPreferences();

      return () => {
        isActive = false;
        scannedRef.current = false;
        setLocked(false);
        setTorchEnabled(false);
      };
    }, []),
  );

  const handleCancel = () => {
    scannedRef.current = false;
    setLocked(false);
    setTorchEnabled(false);
    navigation.goBack();
  };

  const handleChangeZoom = async () => {
    const nextZoom = getNextScannerZoom(zoom);
    setZoom(nextZoom);
    await saveScannerZoom(nextZoom);
  };

  const handleToggleTorch = () => {
    setTorchEnabled((prev) => !prev);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (locked || scannedRef.current) return;

    const code = normalizeBarcode(data);

    if (!code) return;

    scannedRef.current = true;
    setLocked(true);
    setTorchEnabled(false);

    const parentNavigation = navigation.getParent?.();

    if (parentNavigation) {
      parentNavigation.dispatch(
        CommonActions.navigate({
          name: returnToTab,
          params: {
            screen: ROUTES.ITEM_DETAIL,
            params: {
              listId,
              itemId,
              scannedBarcode: code,
            },
          },
        }),
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: ROUTES.SCANNER_HOME }],
        }),
      );

      return;
    }

    navigation.navigate(returnToTab, {
      screen: ROUTES.ITEM_DETAIL,
      params: {
        listId,
        itemId,
        scannedBarcode: code,
      },
    });
  };
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar {...headerConfig.statusBar} />

        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.message}>Comprobando permisos de cámara...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar {...headerConfig.statusBar} />

        <View style={styles.center}>
          <Ionicons name="camera-outline" size={42} color="#64748b" />

          <Text style={styles.title}>Permiso de cámara necesario</Text>

          <Text style={styles.message}>
            Necesitas permitir el acceso a la cámara para leer el código de
            barras del producto.
          </Text>

          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryText}>Permitir cámara</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleCancel}>
            <Text style={styles.secondaryText}>Cancelar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar {...headerConfig.statusBar} />

      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          zoom={zoom}
          enableTorch={torchEnabled}
          onBarcodeScanned={locked ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes,
          }}
        />

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="none" />

          <View style={styles.middle} pointerEvents="none">
            <View style={styles.scanBox}>
              <View style={styles.scanLine} />

              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>

            <Text style={styles.centerHint}>
              Coloca el código dentro del recuadro
            </Text>
          </View>

          <View style={styles.bottomPanel}>
            <Text style={styles.scanTitle}>Escáner básico</Text>

            <Text style={styles.scanHint}>
              Lee el código y lo devuelve al producto. No busca en internet ni
              guarda historial.
            </Text>

            <View style={styles.actionsRow}>
              <Pressable style={styles.actionBtn} onPress={handleChangeZoom}>
                <Ionicons name="scan-outline" size={18} color="#fff" />

                <Text style={styles.actionText}>
                  Zoom {getScannerZoomLabel(zoom)}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionBtn,
                  torchEnabled && styles.actionBtnActive,
                ]}
                onPress={handleToggleTorch}
              >
                <Ionicons
                  name={torchEnabled ? "flashlight" : "flashlight-outline"}
                  size={18}
                  color="#fff"
                />

                <Text style={styles.actionText}>
                  {torchEnabled ? "Luz ON" : "Linterna"}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>

            {locked && (
              <View style={styles.readingBox}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.readingText}>Código leído...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 30;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },

  cameraWrap: {
    flex: 1,
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },

  topBar: {
    minHeight: Platform.OS === "android" ? 56 : 48,
  },

  middle: {
    alignItems: "center",
    justifyContent: "center",
  },

  scanBox: {
    width: "82%",
    height: 150,
    borderRadius: 18,
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  scanLine: {
    position: "absolute",
    left: 18,
    right: 18,
    top: "50%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.85)",
  },

  cornerTopLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#fff",
    borderTopLeftRadius: 18,
  },

  cornerTopRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#fff",
    borderTopRightRadius: 18,
  },

  cornerBottomLeft: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#fff",
    borderBottomLeftRadius: 18,
  },

  cornerBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#fff",
    borderBottomRightRadius: 18,
  },

  centerHint: {
    marginTop: 14,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  bottomPanel: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.68)",
  },

  scanTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  scanHint: {
    marginTop: 6,
    color: "#d1d5db",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.95)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },

  actionBtnActive: {
    backgroundColor: "rgba(245,158,11,0.95)",
  },

  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
  },

  cancelText: {
    color: "#fff",
    fontWeight: "700",
  },

  readingBox: {
    marginTop: 14,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 10,
  },

  readingText: {
    color: "#fff",
    fontWeight: "600",
  },

  center: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  message: {
    marginTop: 10,
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
  },

  primaryBtn: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },

  secondaryBtn: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  secondaryText: {
    color: "#374151",
    fontWeight: "700",
  },
});

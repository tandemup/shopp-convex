// screens/scanner/ProductInfoScreen.js

import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { openExternalUrl } from "@/utils/openExternalUrl";
import { ROUTES } from "@/navigation/ROUTES";

import {
  getSearchSettings,
  DEFAULT_SEARCH_SETTINGS,
} from "@/src/storage/settingsStorage";

import {
  buildProductSearchUrl,
  getProductSearchEngineLabel,
} from "@/utils/productSearchUrl";

export default function ProductInfoScreen({ route, navigation }) {
  const { barcode, product, autoOpenEngine } = route.params || {};

  const safeProduct = product || {
    barcode,
  };

  const [selectedProductEngine, setSelectedProductEngine] = useState(
    DEFAULT_SEARCH_SETTINGS?.selectedProductEngine ||
      DEFAULT_SEARCH_SETTINGS?.generalEngine ||
      "openfoodfacts",
  );

  const hasAutoOpenedRef = useRef(false);

  const imageUri = safeProduct.imageUrl || safeProduct.thumbnailUri || "";
  const displayName = safeProduct.name || "Producto sin nombre";
  const displayBrand = safeProduct.brand || "Marca no indicada";
  const engineLabel = getProductSearchEngineLabel(selectedProductEngine);

  useEffect(() => {
    let mounted = true;

    async function loadSelectedProductEngine() {
      try {
        const searchSettings = await getSearchSettings();

        const engine =
          searchSettings?.selectedProductEngine ||
          searchSettings?.generalEngine ||
          "openfoodfacts";

        if (mounted) {
          setSelectedProductEngine(engine);
        }
      } catch (error) {
        console.log("Error loading selected product engine:", error);
      }
    }

    loadSelectedProductEngine();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!autoOpenEngine) return;
    if (!selectedProductEngine) return;
    if (hasAutoOpenedRef.current) return;

    hasAutoOpenedRef.current = true;

    handleOpenSelectedProductEngine();
  }, [autoOpenEngine, selectedProductEngine]);

  function handleEditProduct() {
    navigation.navigate(ROUTES.EDIT_SCANNED_ITEM, {
      barcode: safeProduct.barcode || barcode,
      item: safeProduct,
    });
  }

  async function handleOpenSelectedProductEngine() {
    const targetBarcode = safeProduct.barcode || barcode;

    const url = buildProductSearchUrl(selectedProductEngine, targetBarcode);

    if (!url) return;

    try {
      const result = await openExternalUrl(url);

      if (!result.ok) {
        console.log("Error opening product search URL");
      }
    } catch (error) {
      console.log("Error opening product search URL:", error);
    }
  }

  function handleOpenProductUrl() {
    if (!safeProduct.url) return;

    openExternalUrl(safeProduct.url).catch((error) => {
      console.log("Error opening product URL:", error);
    });
  }

  function handleGoToHistory() {
    navigation.navigate(ROUTES.SCANNED_HISTORY, {
      scannedBarcode: safeProduct.barcode || barcode,
      showScannedFeedback: false,
    });
  }

  if (!safeProduct?.barcode) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar style="dark" />

        <View style={styles.emptyIconWrap}>
          <Ionicons name="alert-circle-outline" size={44} color="#DC2626" />
        </View>

        <Text style={styles.errorTitle}>Sin información</Text>

        <Text style={styles.errorText}>
          No se recibió información del producto ni código de barras.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressedDark,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.productImage} />
            ) : (
              <View style={styles.noImageBox}>
                <Ionicons name="image-outline" size={34} color="#9CA3AF" />
                <Text style={styles.noImageText}>Sin imagen</Text>
              </View>
            )}

            <View style={styles.heroInfo}>
              <Text style={styles.heroEyebrow}>Ficha del producto</Text>

              <Text style={styles.productName} numberOfLines={3}>
                {displayName}
              </Text>

              <Text style={styles.brand} numberOfLines={1}>
                {displayBrand}
              </Text>
            </View>
          </View>

          <View style={styles.barcodePanel}>
            <View style={styles.barcodeHeader}>
              <Ionicons name="barcode-outline" size={18} color="#2563EB" />
              <Text style={styles.barcodeLabel}>Código de barras</Text>
            </View>

            <Text style={styles.barcodeText}>{safeProduct.barcode}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.pressedLight,
            ]}
            onPress={handleOpenSelectedProductEngine}
          >
            <Ionicons name="search-outline" size={20} color="#2563EB" />
            <Text style={styles.searchButtonText}>Buscar en {engineLabel}</Text>
          </Pressable>
        </View>

        <InfoSection
          icon="information-circle-outline"
          title="Datos principales"
          subtitle="Información obtenida desde el escaneo o desde el buscador."
        >
          <InfoRow label="Código de barras" value={safeProduct.barcode} />
          <InfoRow label="Nombre" value={safeProduct.name} />
          <InfoRow label="Marca" value={safeProduct.brand} />
          <InfoRow label="Fuente" value={safeProduct.lookupSource} />
          <InfoRow label="Origen" value={safeProduct.source} isLast />
        </InfoSection>

        <InfoSection
          icon="image-outline"
          title="Imagen"
          subtitle="Enlaces asociados a la imagen del producto."
        >
          <InfoRow label="Imagen remota" value={safeProduct.imageUrl} />
          <InfoRow
            label="Miniatura local"
            value={safeProduct.thumbnailUri}
            isLast
          />
        </InfoSection>

        <InfoSection
          icon="document-text-outline"
          title="Notas"
          subtitle="Notas guardadas manualmente para este producto."
        >
          <Text style={styles.longText}>
            {safeProduct.notes || "No hay notas para este producto."}
          </Text>
        </InfoSection>

        <InfoSection
          icon="calendar-outline"
          title="Fechas"
          subtitle="Registro temporal del escaneo."
        >
          <InfoRow
            label="Escaneado"
            value={formatDate(safeProduct.scannedAt)}
          />
          <InfoRow
            label="Actualizado"
            value={formatDate(safeProduct.updatedAt)}
            isLast
          />
        </InfoSection>

        {!!safeProduct.url && (
          <Pressable
            style={({ pressed }) => [
              styles.linkButton,
              pressed && styles.pressedLight,
            ]}
            onPress={handleOpenProductUrl}
          >
            <Ionicons name="open-outline" size={20} color="#2563EB" />
            <Text style={styles.linkButtonText}>Abrir ficha del producto</Text>
          </Pressable>
        )}

        <View style={styles.actionsCard}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressedSave,
            ]}
            onPress={handleEditProduct}
          >
            <Ionicons name="create-outline" size={21} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Editar producto</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressedLight,
            ]}
            onPress={handleGoToHistory}
          >
            <Ionicons name="time-outline" size={20} color="#111827" />
            <Text style={styles.secondaryButtonText}>Ver historial</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && styles.pressedLight,
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#6B7280" />
            <Text style={styles.ghostButtonText}>Volver</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoSection({ icon, title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#2563EB" />
        </View>

        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, isLast = false }) {
  const safeValue =
    value === null || value === undefined || value === ""
      ? "No disponible"
      : String(value);

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{safeValue}</Text>
    </View>
  );
}

function formatDate(value) {
  if (!value) return "No disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SCREEN_BACKGROUND = "#F3F4F6";
const CARD_BACKGROUND = "#FFFFFF";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6B7280";
const BORDER_COLOR = "#E5E7EB";
const BLUE = "#2563EB";
const BLUE_SOFT = "#EFF6FF";
const SAVE = "#16A34A";

const SHADOW = {
  shadowColor: "#111827",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },

  content: {
    padding: 16,
    paddingBottom: 42,
    gap: 14,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "900",
    color: TEXT_PRIMARY,
  },

  errorText: {
    marginTop: 8,
    maxWidth: 320,
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
  },

  backButton: {
    marginTop: 24,
    minHeight: 48,
    backgroundColor: TEXT_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  heroCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...SHADOW,
  },

  heroTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },

  productImage: {
    width: 104,
    height: 104,
    borderRadius: 22,
    resizeMode: "contain",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },

  noImageBox: {
    width: 104,
    height: 104,
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },

  noImageText: {
    marginTop: 6,
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },

  heroInfo: {
    flex: 1,
    minWidth: 0,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  productName: {
    marginTop: 5,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
    color: TEXT_PRIMARY,
  },

  brand: {
    marginTop: 6,
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "800",
  },

  barcodePanel: {
    marginTop: 16,
    padding: 13,
    borderRadius: 18,
    backgroundColor: BLUE_SOFT,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  barcodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },

  barcodeLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: TEXT_SECONDARY,
  },

  barcodeText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  searchButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },

  searchButtonText: {
    color: BLUE,
    fontSize: 15,
    fontWeight: "900",
  },

  section: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 12,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: BLUE_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: TEXT_PRIMARY,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_MUTED,
  },

  sectionBody: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "800",
  },

  rowValue: {
    flex: 1.6,
    fontSize: 14,
    color: TEXT_PRIMARY,
    textAlign: "right",
    fontWeight: "700",
  },

  longText: {
    padding: 12,
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 21,
    fontWeight: "600",
  },

  linkButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: BLUE_SOFT,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },

  linkButtonText: {
    color: BLUE,
    fontSize: 15,
    fontWeight: "900",
  },

  actionsCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 10,
  },

  primaryButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: SAVE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...SHADOW,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "900",
  },

  ghostButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  ghostButtonText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: "800",
  },

  pressedLight: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },

  pressedDark: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  pressedSave: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});

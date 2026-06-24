// screens/scanner/ProductInfoScreen.js

import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={52} color="#E53935" />

        <Text style={styles.errorTitle}>Sin información</Text>

        <Text style={styles.errorText}>
          No se recibió información del producto ni código de barras.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} />
        ) : (
          <View style={styles.noImageBox}>
            <Ionicons name="image-outline" size={52} color="#9CA3AF" />
            <Text style={styles.noImageText}>Sin imagen</Text>
          </View>
        )}

        <Text style={styles.productName}>
          {safeProduct.name || "Producto sin nombre"}
        </Text>

        {!!safeProduct.brand && (
          <Text style={styles.brand}>{safeProduct.brand}</Text>
        )}

        <View style={styles.barcodeBox}>
          <Ionicons name="barcode-outline" size={20} color="#374151" />
          <Text style={styles.barcodeText}>{safeProduct.barcode}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleOpenSelectedProductEngine}
      >
        <Ionicons name="search-outline" size={21} color="#2563EB" />
        <Text style={styles.searchButtonText}>
          Buscar en {getProductSearchEngineLabel(selectedProductEngine)}
        </Text>
      </TouchableOpacity>

      <InfoSection title="Datos principales">
        <InfoRow label="Código de barras" value={safeProduct.barcode} />
        <InfoRow label="Nombre" value={safeProduct.name} />
        <InfoRow label="Marca" value={safeProduct.brand} />
        <InfoRow label="Fuente" value={safeProduct.lookupSource} />
        <InfoRow label="Origen" value={safeProduct.source} />
      </InfoSection>

      <InfoSection title="Imagen">
        <InfoRow label="Imagen remota" value={safeProduct.imageUrl} />
        <InfoRow label="Miniatura local" value={safeProduct.thumbnailUri} />
      </InfoSection>

      <InfoSection title="Notas">
        <Text style={styles.longText}>
          {safeProduct.notes || "No hay notas para este producto."}
        </Text>
      </InfoSection>

      <InfoSection title="Fechas">
        <InfoRow label="Escaneado" value={formatDate(safeProduct.scannedAt)} />
        <InfoRow
          label="Actualizado"
          value={formatDate(safeProduct.updatedAt)}
        />
      </InfoSection>

      {!!safeProduct.url && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleOpenProductUrl}
        >
          <Ionicons name="open-outline" size={21} color="#2563EB" />
          <Text style={styles.linkButtonText}>Abrir ficha del producto</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleEditProduct}
      >
        <Ionicons name="create-outline" size={22} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Editar producto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleGoToHistory}
      >
        <Ionicons name="time-outline" size={21} color="#111827" />
        <Text style={styles.secondaryButtonText}>Ver historial</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ghostButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.ghostButtonText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoSection({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }) {
  const safeValue =
    value === null || value === undefined || value === ""
      ? "No disponible"
      : String(value);

  return (
    <View style={styles.row}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  errorText: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },

  backButton: {
    marginTop: 24,
    backgroundColor: "#111827",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  productImage: {
    width: 190,
    height: 190,
    resizeMode: "contain",
    marginBottom: 16,
  },

  noImageBox: {
    width: 190,
    height: 190,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  noImageText: {
    marginTop: 8,
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },

  productName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  brand: {
    marginTop: 6,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "600",
  },

  barcodeBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
  },

  barcodeText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "800",
  },

  searchButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  searchButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "800",
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
  },

  rowValue: {
    flex: 1.6,
    fontSize: 14,
    color: "#111827",
    textAlign: "right",
    fontWeight: "600",
  },

  longText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 21,
  },

  linkButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  linkButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "800",
  },

  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },

  ghostButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  ghostButtonText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
  },
});

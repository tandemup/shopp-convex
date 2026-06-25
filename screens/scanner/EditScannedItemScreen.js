import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useProductLookupWithCache } from "@/hooks/useProductLookupWithCache";
import {
  getProductBrand,
  getProductCategory,
  getProductDisplayName,
  getProductImageUrl,
  getProductUrl,
} from "@/services/productLookup";

function normalizeBarcode(value) {
  return String(value || "").trim();
}

function normalizeString(value) {
  return String(value || "").trim();
}

export default function EditScannedItemScreen({ route, navigation }) {
  const params = route?.params || {};

  const barcode = normalizeBarcode(
    params.barcode || params.scannedBarcode || params.code || params.data,
  );

  const initialProduct = params.product || null;

  const { loading, error, lookupWithCache } = useProductLookupWithCache();

  const saveManualProduct = useMutation(api.scanHistory.saveManualProduct);

  const [product, setProduct] = useState(initialProduct);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState(null);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");

  const visibleError = localError || error;

  const resolvedName = useMemo(
    () => getProductDisplayName(product, barcode),
    [product, barcode],
  );

  const fillFormFromProduct = useCallback(
    (nextProduct) => {
      setName(getProductDisplayName(nextProduct, barcode));
      setBrand(getProductBrand(nextProduct));
      setCategory(getProductCategory(nextProduct));
      setImageUrl(getProductImageUrl(nextProduct));
      setProductUrl(getProductUrl(nextProduct, barcode));
    },
    [barcode],
  );

  useEffect(() => {
    if (initialProduct) {
      fillFormFromProduct(initialProduct);
    }
  }, [initialProduct, fillFormFromProduct]);

  const handleLookup = useCallback(async () => {
    if (!barcode) {
      setLocalError("No se ha recibido ningún código de barras.");
      return;
    }

    setLocalError(null);

    try {
      const result = await lookupWithCache(barcode);

      if (!result) {
        return;
      }

      setProduct(result.product);
      fillFormFromProduct(result.product);
    } catch (err) {
      console.error("EditScannedItemScreen lookup error:", err);
      setLocalError(
        err?.message || "No se pudo buscar la información del producto.",
      );
    }
  }, [barcode, lookupWithCache, fillFormFromProduct]);

  useEffect(() => {
    if (!initialProduct && barcode) {
      handleLookup();
    }
  }, [initialProduct, barcode, handleLookup]);

  const handleSave = useCallback(async () => {
    const normalizedBarcode = normalizeBarcode(barcode);

    if (!normalizedBarcode) {
      setLocalError("No hay código de barras para guardar.");
      return;
    }

    const normalizedName = normalizeString(name);

    if (!normalizedName) {
      setLocalError("El nombre del producto no puede estar vacío.");
      return;
    }

    setSaving(true);
    setLocalError(null);

    try {
      await saveManualProduct({
        barcode: normalizedBarcode,
        name: normalizedName,
        brand: normalizeString(brand),
        category: normalizeString(category),
        imageUrl: normalizeString(imageUrl),
        productUrl: normalizeString(productUrl),
        source: "manual",
      });

      navigation.goBack();
    } catch (err) {
      console.error("EditScannedItemScreen save error:", err);
      setLocalError(
        err?.message || "No se pudo guardar el producto en Convex.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    barcode,
    name,
    brand,
    category,
    imageUrl,
    productUrl,
    saveManualProduct,
    navigation,
  ]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Editar producto escaneado</Text>
          <Text style={styles.title}>{resolvedName}</Text>
          <Text style={styles.barcode}>{barcode || "Sin código"}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>
              Buscando datos del producto...
            </Text>
          </View>
        ) : null}

        {visibleError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
            </View>
          )}

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre del producto"
            style={styles.input}
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>Marca</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="Marca"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Categoría</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Categoría"
            style={styles.input}
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>URL imagen</Text>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>URL producto</Text>
          <TextInput
            value={productUrl}
            onChangeText={setProductUrl}
            placeholder="https://..."
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.primaryButton,
              saving ? styles.disabledButton : null,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Guardando..." : "Guardar en Convex"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleLookup}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>
              Buscar de nuevo en internet
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },
  barcode: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#4B5563",
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    color: "#991B1B",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  productImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  imagePlaceholder: {
    height: 140,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  imagePlaceholderText: {
    color: "#6B7280",
    fontWeight: "800",
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "800",
  },
});

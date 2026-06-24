// screens/scanner/EditScannedItemScreen.js

import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  updateScannedEntry,
  removeScannedItem,
} from "@/services/scannerHistory";
import { safeAlert } from "@/components/ui/alert/safeAlert";
import { safeQuestion } from "@/components/ui/alert/safeQuestion";
import { createThumbnail } from "@/utils/createThumbnail";
import BarcodeLink from "@/components/controls/BarcodeLink";
import { lookupProductByBarcode } from "@/services/productLookup";
import { buildHeaderConfig } from "@/utils/layout/headerStyles";

export default function EditScannedItemScreen({ route, navigation }) {
  const { item } = route.params || {};

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Editar escaneo",
        preset: "light",
      }),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  const barcode = item?.barcode ?? "";

  const [name, setName] = useState(item?.name ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [thumbnailUri, setThumbnailUri] = useState(item?.thumbnailUri ?? null);

  const handleImageUrlBlur = async () => {
    if (!imageUrl || imageUrl === item?.imageUrl) return;

    try {
      const thumb = await createThumbnail(imageUrl, barcode);

      if (thumb) {
        setThumbnailUri(thumb);
      }
    } catch (error) {
      console.log("Error creating thumbnail:", error);
    }
  };

  const handleLookupProduct = async () => {
    if (!barcode) {
      safeAlert("Código vacío", "Este escaneo no tiene código de barras");
      return;
    }

    try {
      const result = await lookupProductByBarcode(barcode);

      if (!result.found) {
        safeAlert(
          "Producto no encontrado",
          "No se encontró información para este código de barras",
        );
        return;
      }

      const product = result.product;

      if (product.name) setName(product.name);
      if (product.brand) setBrand(product.brand);
      if (product.url) setUrl(product.url);

      if (product.imageUrl) {
        setImageUrl(product.imageUrl);

        try {
          const thumb = await createThumbnail(product.imageUrl, barcode);

          if (thumb) {
            setThumbnailUri(thumb);
          }
        } catch (error) {
          console.log("Error creating product thumbnail:", error);
        }
      }
    } catch (error) {
      console.log("Error looking up product:", error);
      safeAlert("Error", "No se pudo consultar la información del producto");
    }
  };

  const handleSave = async () => {
    if (!barcode) {
      safeAlert("Código vacío", "Este escaneo no tiene código de barras");
      return;
    }

    try {
      let finalThumbnail = thumbnailUri;

      if (imageUrl && imageUrl !== item?.imageUrl && !thumbnailUri) {
        finalThumbnail = await createThumbnail(imageUrl, barcode);
      }

      await updateScannedEntry(barcode, {
        name: name.trim() || "Producto sin nombre",
        brand: brand.trim(),
        url: url.trim(),
        imageUrl: imageUrl.trim(),
        thumbnailUri: finalThumbnail,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      });

      navigation.goBack();
    } catch (error) {
      console.log("Error saving scanned item:", error);
      safeAlert("Error", "No se pudo guardar el escaneo");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!barcode) {
      safeAlert("Código vacío", "Este escaneo no tiene código de barras");
      return;
    }

    try {
      await removeScannedItem(barcode);

      navigation.goBack();
    } catch (error) {
      console.log("Error deleting scanned item:", error);
      safeAlert("Error", "No se pudo eliminar el escaneo");
    }
  };

  const handleDelete = () => {
    if (!barcode) {
      safeAlert("Código vacío", "Este escaneo no tiene código de barras");
      return;
    }

    safeQuestion({
      title: "Eliminar escaneo",
      message: "¿Deseas eliminar este escaneo?",
      detail: name || barcode,
      yesText: "Sí",
      noText: "No",
      cancelText: "Cancelar",
      yesAction: "destructive",
      noAction: "default",
      cancelAction: "cancel",
      onYes: handleDeleteConfirmed,
    });
  };

  if (!item) {
    return (
      <View style={styles.emptyScreen}>
        <StatusBar {...headerConfig.statusBar} />

        <View style={styles.emptyIconWrap}>
          <Ionicons name="alert-circle-outline" size={42} color="#6B7280" />
        </View>

        <Text style={styles.emptyTitle}>Escaneo no encontrado</Text>

        <Text style={styles.emptyText}>
          No se pudo cargar la información del producto escaneado.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.pressedDark,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const previewImage = thumbnailUri || imageUrl;
  const displayName = name?.trim() || "Producto sin nombre";
  const displayBrand = brand?.trim() || "Marca no indicada";

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.screen} edges={["left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              {previewImage ? (
                <Image
                  source={{ uri: previewImage }}
                  style={styles.heroImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.heroImagePlaceholder}>
                  <Ionicons name="image-outline" size={30} color="#9CA3AF" />
                  <Text style={styles.heroImagePlaceholderText}>
                    Sin imagen
                  </Text>
                </View>
              )}

              <View style={styles.heroInfo}>
                <Text style={styles.heroEyebrow}>Producto escaneado</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {displayName}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={1}>
                  {displayBrand}
                </Text>
              </View>
            </View>

            <View style={styles.barcodePanel}>
              <View style={styles.barcodeHeader}>
                <Ionicons name="barcode-outline" size={18} color="#2563EB" />
                <Text style={styles.barcodeLabel}>Código de barras</Text>
              </View>

              <View style={styles.codeBox}>
                <BarcodeLink barcode={barcode} />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.lookupBtn,
                pressed && styles.pressedLight,
              ]}
              onPress={handleLookupProduct}
            >
              <Ionicons name="search-outline" size={19} color="#111827" />
              <Text style={styles.lookupBtnText}>
                Buscar información online
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="cube-outline" size={18} color="#2563EB" />
              </View>

              <View>
                <Text style={styles.sectionTitle}>Datos del producto</Text>
                <Text style={styles.sectionSubtitle}>
                  Nombre, marca y enlaces asociados.
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nombre del producto"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="Marca"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>URL del producto</Text>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>URL de imagen</Text>
              <TextInput
                style={styles.input}
                value={imageUrl}
                onChangeText={(value) => {
                  setImageUrl(value);
                  setThumbnailUri(null);
                }}
                onBlur={handleImageUrlBlur}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#2563EB"
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>Notas</Text>
                <Text style={styles.sectionSubtitle}>
                  Información adicional para este escaneo.
                </Text>
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas del producto"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.pressedDanger,
              ]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#B91C1C" />
              <Text style={styles.deleteText}>Eliminar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressedSave,
              ]}
              onPress={handleSave}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#FFFFFF"
              />
              <Text style={styles.saveText}>Guardar cambios</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const SCREEN_BACKGROUND = "#F3F4F6";
const CARD_BACKGROUND = "#FFFFFF";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6B7280";
const BORDER_COLOR = "#E5E7EB";
const BLUE = "#2563EB";
const BLUE_SOFT = "#EFF6FF";
const DANGER = "#DC2626";
const DANGER_SOFT = "#FEF2F2";
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

  container: {
    padding: 16,
    paddingBottom: 42,
    gap: 14,
    backgroundColor: SCREEN_BACKGROUND,
  },

  emptyScreen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  backBtn: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: TEXT_PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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

  heroImage: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },

  heroImagePlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },

  heroImagePlaceholderText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
  },

  heroInfo: {
    flex: 1,
    minWidth: 0,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  heroTitle: {
    marginTop: 5,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    color: TEXT_PRIMARY,
  },

  heroSubtitle: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },

  barcodePanel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 18,
    backgroundColor: BLUE_SOFT,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  barcodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },

  barcodeLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_SECONDARY,
  },

  codeBox: {
    backgroundColor: CARD_BACKGROUND,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  lookupBtn: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },

  lookupBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },

  sectionCard: {
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
    marginBottom: 14,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: BLUE_SOFT,
    alignItems: "center",
    justifyContent: "center",
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

  field: {
    marginTop: 12,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_SECONDARY,
  },

  input: {
    minHeight: 50,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },

  notesInput: {
    minHeight: 108,
    textAlignVertical: "top",
    lineHeight: 22,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
    paddingBottom: 8,
  },

  saveBtn: {
    flex: 1.3,
    height: 58,
    borderRadius: 18,
    backgroundColor: SAVE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...SHADOW,
  },

  deleteBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: DANGER_SOFT,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  deleteText: {
    color: DANGER,
    fontSize: 16,
    fontWeight: "900",
  },

  pressedLight: {
    opacity: 0.78,
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

  pressedDanger: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});

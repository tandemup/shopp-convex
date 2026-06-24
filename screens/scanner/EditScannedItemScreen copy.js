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

        <Ionicons name="alert-circle-outline" size={42} color="#9CA3AF" />

        <Text style={styles.emptyTitle}>Escaneo no encontrado</Text>

        <Text style={styles.emptyText}>
          No se pudo cargar la información del producto escaneado.
        </Text>

        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const previewImage = thumbnailUri || imageUrl;

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
          <View style={styles.card}>
            <Text style={styles.label}>Código de barras</Text>

            <View style={styles.codeBox}>
              <BarcodeLink barcode={barcode} />
            </View>

            <View style={styles.previewRow}>
              {previewImage ? (
                <Image
                  source={{ uri: previewImage }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.noThumb}>
                  <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.noThumbText}>Sin imagen</Text>
                </View>
              )}

              <Pressable style={styles.lookupBtn} onPress={handleLookupProduct}>
                <Ionicons name="search-outline" size={18} color="#111827" />
                <Text style={styles.lookupBtnText}>Buscar producto</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nombre del producto"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
            />

            <Text style={styles.label}>Marca</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Marca"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
            />

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

            <Text style={styles.label}>Notas</Text>
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
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Eliminar</Text>
            </Pressable>

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Guardar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const SCREEN_BACKGROUND = "#F9FAFB";
const CARD_BACKGROUND = "#FFFFFF";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6B7280";
const BORDER_COLOR = "#E5E7EB";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },

  emptyScreen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  backBtn: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: TEXT_PRIMARY,
  },

  backBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: SCREEN_BACKGROUND,
  },

  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },

  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_SECONDARY,
  },

  codeBox: {
    backgroundColor: "#E8F0FE",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#AABBBE",
  },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },

  lookupBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },

  lookupBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },

  input: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },

  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#EEEEEE",
  },

  noThumb: {
    width: 96,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },

  noThumbText: {
    marginTop: 4,
    fontSize: 12,
    color: TEXT_MUTED,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
  },

  saveBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  deleteBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

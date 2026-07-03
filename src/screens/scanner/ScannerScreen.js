import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

import BarcodeScannerView from "@/components/features/scanner/BarcodeScannerView";
import {
  getScannedEntryByBarcode,
  saveScannedEntry,
} from "@/services/scannerHistory";
import { safeAlert } from "@/components/ui/alert/safeAlert";
import { ROUTES } from "@/navigation/ROUTES";
import { lookupProductByBarcode } from "@/services/productLookup";

export default function ScannerScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const isHandlingScanRef = useRef(false);

  const onScan = route.params?.onScan;

  const continuous = route.params?.continuous ?? false;
  const closeOnScan = route.params?.closeOnScan ?? true;
  const shouldSaveToHistory = route.params?.saveToHistory ?? !onScan;
  const returnToTab = route.params?.returnToTab;

  /**
   * Importante:
   * No ponemos fallback ["ean13"] aquí.
   * Si barcodeTypes no viene por navegación, BarcodeScannerView usará
   * los formatos guardados en BarcodeSettingsScreen.
   */
  const barcodeTypes = route.params?.barcodeTypes;

  function normalizeBarcode(code) {
    return String(code || "")
      .replace(/\D/g, "")
      .trim();
  }

  async function saveDetectedBarcode(code) {
    const barcode = normalizeBarcode(code);

    if (!barcode) return null;

    const now = new Date().toISOString();

    const cachedItem = await getScannedEntryByBarcode(barcode);

    const hasUsefulCachedData =
      cachedItem?.name?.trim() || cachedItem?.imageUrl?.trim();

    if (hasUsefulCachedData) {
      const updatedItem = {
        ...cachedItem,
        barcode,
        source: cachedItem.source || "scanner",
        updatedAt: now,
      };

      await saveScannedEntry(barcode, updatedItem);

      return updatedItem;
    }

    const lookup = await lookupProductByBarcode(barcode);
    const product = lookup.found ? lookup.product : null;

    const scannedItem = {
      id: barcode,
      barcode,

      name: product?.name || cachedItem?.name || "",
      brand: product?.brand || cachedItem?.brand || "",
      imageUrl: product?.imageUrl || cachedItem?.imageUrl || "",
      thumbnailUri: cachedItem?.thumbnailUri || null,
      url: product?.url || cachedItem?.url || "",
      notes: cachedItem?.notes || "",

      source: "scanner",
      lookupSource: product?.lookupSource || cachedItem?.lookupSource || null,

      scannedAt: cachedItem?.scannedAt || now,
      updatedAt: now,
    };

    await saveScannedEntry(barcode, scannedItem);

    return scannedItem;
  }

  function closeScanner() {
    if (returnToTab) {
      navigation.getParent()?.navigate(returnToTab);
      return;
    }

    navigation.goBack();
  }

  async function handleDetected(code) {
    if (isHandlingScanRef.current) return;

    isHandlingScanRef.current = true;

    const barcode = normalizeBarcode(code);

    if (!barcode) {
      isHandlingScanRef.current = false;
      return;
    }

    try {
      if (typeof onScan === "function") {
        onScan(barcode);

        if (closeOnScan) {
          closeScanner();
        }

        return;
      }

      if (shouldSaveToHistory) {
        await saveDetectedBarcode(barcode);

        navigation.replace(ROUTES.SCANNED_HISTORY, {
          scannedBarcode: barcode,
          showScannedFeedback: true,
        });

        return;
      }

      if (closeOnScan) {
        closeScanner();
      }
    } catch (error) {
      console.log("Error handling scanned barcode:", error);

      safeAlert("Error", "No se pudo procesar el código escaneado", [
        {
          text: "Cerrar",
          onPress: () => {
            if (closeOnScan) {
              closeScanner();
            }
          },
        },
      ]);
    } finally {
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 800);
    }
  }

  function handleClose() {
    closeScanner();
  }

  return (
    <View style={styles.container}>
      <BarcodeScannerView
        onDetected={handleDetected}
        onClose={handleClose}
        continuous={continuous}
        barcodeTypes={barcodeTypes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});

// components/controls/BarcodeLink.js

import React, { useCallback } from "react";
import { Pressable, Text } from "react-native";

import { openExternalUrl } from "@/utils/openExternalUrl";

import * as Clipboard from "expo-clipboard";

import { showOptions } from "@/utils/ui/primitives/ActionSheet";

import { SEARCH_ENGINES, DEFAULT_ENGINE } from "@/constants/searchEngines";

import { getSearchSettings } from "@/src/storage/settingsStorage";

export default function BarcodeLink({ barcode, label, iconColor = "#2563eb" }) {
  const getSelectedProductEngine = async () => {
    const settings = await getSearchSettings();

    const selectedEngineId =
      settings?.selectedProductEngine ||
      settings?.generalEngine ||
      DEFAULT_ENGINE;

    const engine =
      SEARCH_ENGINES[selectedEngineId] || SEARCH_ENGINES[DEFAULT_ENGINE];

    return {
      id: selectedEngineId,
      engine,
      label: engine?.label || selectedEngineId || "buscador",
    };
  };

  const openSearch = async (query) => {
    try {
      const { id, engine } = await getSelectedProductEngine();

      if (!engine?.buildUrl) {
        console.warn("Motor de búsqueda no válido:", id);
        return;
      }

      const url = engine.buildUrl(query);
      await openExternalUrl(url);
    } catch (error) {
      console.warn("Error abriendo búsqueda de barcode:", error);
    }
  };

  const handlePress = useCallback(async () => {
    if (!barcode) return;

    const { label: engineLabel } = await getSelectedProductEngine();

    showOptions("Barcodes", [
      {
        text: "Copiar",
        onPress: () => Clipboard.setStringAsync(barcode),
      },
      {
        text: `Buscar en ${engineLabel}`,
        onPress: () => openSearch(barcode),
      },
      {
        text: "Cancelar",
        style: "cancel",
      },
    ]);
  }, [barcode]);

  if (!barcode) return null;

  return (
    <Pressable onPress={handlePress}>
      <Text
        style={{
          color: iconColor,
          fontSize: 13,
          fontWeight: "600",
          textDecorationLine: "underline",
        }}
      >
        {label || barcode}
      </Text>
    </Pressable>
  );
}

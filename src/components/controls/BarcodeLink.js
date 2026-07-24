// components/controls/BarcodeLink.js

import React, { useCallback } from "react";
import { Pressable, Text } from "react-native";

import { openExternalUrl } from "@/src/utils/openExternalUrl";
import * as Clipboard from "expo-clipboard";

import { safeAlert } from "@/src/components/ui/alert/safeAlert";

import { SEARCH_ENGINES, DEFAULT_ENGINE } from "@/src/constants/searchEngines";

import { getSearchSettings } from "@/src/storage/settingsStorage";

export default function BarcodeLink({
  barcode,
  label,
  iconColor = "#2563eb",
  style,
  textStyle,
  children,
}) {
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

    safeAlert("Código de barras", barcode, [
      {
        text: "Copiar barcode",
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(barcode);

            safeAlert(
              "Código copiado",
              `Se ha copiado ${barcode} al portapapeles.`,
            );
          } catch (error) {
            console.warn("Error copiando barcode:", error);

            safeAlert(
              "No se pudo copiar",
              "No se pudo copiar el código de barras al portapapeles.",
            );
          }
        },
      },
      {
        text: "Open browser",
        onPress: () => openSearch(barcode),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }, [barcode]);

  if (!barcode) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Opciones del código de barras"
      onPress={handlePress}
      style={style}
    >
      {children || (
        <Text
          selectable
          style={[
            {
              color: iconColor,
              fontSize: 13,
              fontWeight: "600",
              textDecorationLine: "underline",
            },
            textStyle,
          ]}
        >
          {label || barcode}
        </Text>
      )}
    </Pressable>
  );
}

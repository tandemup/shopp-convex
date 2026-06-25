import { useCallback, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { lookupProductByBarcode } from "@/services/productLookup";

function normalizeBarcode(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
}

function hasUsefulProductData(product) {
  if (!product) {
    return false;
  }

  return Boolean(
    product.name ||
    product.brand ||
    product.imageUrl ||
    product.category ||
    product.productUrl ||
    product.url ||
    product.rawData,
  );
}

export function useProductLookupWithCache() {
  const convex = useConvex();

  const saveProductFromLookup = useMutation(
    api.scanHistory.saveProductFromLookup,
  );

  const runningRef = useRef(false);
  const lastBarcodeRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookupWithCache = useCallback(
    async (barcode) => {
      const normalizedBarcode = normalizeBarcode(barcode);

      if (!normalizedBarcode) {
        throw new Error("Código de barras vacío");
      }

      if (runningRef.current && lastBarcodeRef.current === normalizedBarcode) {
        return null;
      }

      runningRef.current = true;
      lastBarcodeRef.current = normalizedBarcode;

      setLoading(true);
      setError(null);

      try {
        console.log("[scanHistory] buscando en Convex:", normalizedBarcode);

        const cachedProduct = await convex.query(api.scanHistory.getByBarcode, {
          barcode: normalizedBarcode,
        });

        if (hasUsefulProductData(cachedProduct)) {
          console.log("[scanHistory] encontrado en Convex:", cachedProduct);

          return {
            fromCache: true,
            barcode: normalizedBarcode,
            product: cachedProduct,
          };
        }

        console.log("[scanHistory] no existe en Convex, buscando internet");

        const lookupResult = await lookupProductByBarcode(normalizedBarcode);

        console.log("[scanHistory] resultado internet:", lookupResult);

        if (!lookupResult?.found || !lookupResult?.product) {
          return {
            fromCache: false,
            barcode: normalizedBarcode,
            product: {
              barcode: normalizedBarcode,
              name: "",
              brand: "",
              imageUrl: "",
              category: "",
              productUrl: "",
              source: "openfoodfacts",
              notFound: true,
              rawData: lookupResult || {},
            },
          };
        }

        const productToSave = {
          ...lookupResult.product,
          productUrl: lookupResult.product.url || "",
          source: lookupResult.product.lookupSource || "openfoodfacts",
          rawData: lookupResult,
        };

        console.log("[scanHistory] guardando en Convex:", productToSave);

        const saveResult = await saveProductFromLookup({
          barcode: normalizedBarcode,
          product: productToSave,
          source: productToSave.source,
        });

        console.log("[scanHistory] guardado OK:", saveResult);

        return {
          fromCache: false,
          barcode: normalizedBarcode,
          product: productToSave,
        };
      } catch (err) {
        console.error("[scanHistory] error:", err);

        const message =
          err?.message || "No se pudo buscar o guardar el producto.";

        setError(message);
        throw err;
      } finally {
        setLoading(false);
        runningRef.current = false;
      }
    },
    [convex, saveProductFromLookup],
  );

  return {
    loading,
    error,
    lookupWithCache,
  };
}

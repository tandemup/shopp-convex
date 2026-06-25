import { useCallback, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { lookupProductByBarcode } from "@/services/productLookup";

function normalizeBarcode(value) {
  return String(value || "").trim();
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
        const cachedProduct = await convex.query(api.scanHistory.getByBarcode, {
          barcode: normalizedBarcode,
        });

        if (hasUsefulProductData(cachedProduct)) {
          return {
            fromCache: true,
            barcode: normalizedBarcode,
            product: cachedProduct,
          };
        }

        const internetProduct = await lookupProductByBarcode(normalizedBarcode);

        await saveProductFromLookup({
          barcode: normalizedBarcode,
          product: internetProduct || {},
          source: internetProduct?.source || "internet",
        });

        return {
          fromCache: false,
          barcode: normalizedBarcode,
          product: internetProduct,
        };
      } catch (err) {
        console.error("lookupWithCache error:", err);
        setError(err?.message || "No se pudo buscar el producto.");
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

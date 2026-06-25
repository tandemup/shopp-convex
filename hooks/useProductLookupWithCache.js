import { useCallback, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { lookupProductByBarcode } from "../utils/productLookup";

export function useProductLookupWithCache() {
  const convex = useConvex();

  const saveScanFromLookup = useMutation(api.scanHistory.saveScanFromLookup);

  const runningRef = useRef(false);
  const lastBarcodeRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const lookupWithCache = useCallback(
    async ({
      barcode,
      format = "EAN-13",
      username = "anonymous",
      deviceId,
      storeId,
      storeName,
    }) => {
      const normalizedBarcode = String(barcode || "").trim();

      if (!normalizedBarcode) {
        throw new Error("Código de barras vacío");
      }

      if (runningRef.current && lastBarcodeRef.current === normalizedBarcode) {
        return null;
      }

      runningRef.current = true;
      lastBarcodeRef.current = normalizedBarcode;
      setLoading(true);

      try {
        const cachedProduct = await convex.query(
          api.scanHistory.getLatestByBarcode,
          {
            barcode: normalizedBarcode,
          },
        );

        if (cachedProduct?.name || cachedProduct?.rawData) {
          return {
            fromCache: true,
            product: cachedProduct,
          };
        }

        const internetProduct = await lookupProductByBarcode(normalizedBarcode);

        await saveScanFromLookup({
          barcode: normalizedBarcode,
          format,
          product: internetProduct || {},
          username,
          deviceId,
          storeId,
          storeName,
          source: internetProduct?.source || "internet",
        });

        return {
          fromCache: false,
          product: internetProduct,
        };
      } finally {
        setLoading(false);
        runningRef.current = false;
      }
    },
    [convex, saveScanFromLookup],
  );

  return {
    loading,
    lookupWithCache,
  };
}

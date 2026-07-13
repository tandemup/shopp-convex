import { useCallback, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { lookupProductByBarcode } from "@/src/services/productLookup";

function normalizeBarcode(value) {
  return String(value || "").replace(/\D/g, "");
}

function hasUsefulProductData(product) {
  if (!product) {
    return false;
  }

  return Boolean(
    String(product.name || "").trim() ||
    String(product.brand || "").trim() ||
    String(product.category || "").trim() ||
    String(product.imageUrl || "").trim() ||
    String(product.productUrl || "").trim(),
  );
}

export function useProductLookupWithCache() {
  const convex = useConvex();
  const saveProductData = useMutation(api.productCache.saveProductData);
  const markAsNotFound = useMutation(api.productCache.markAsNotFound);

  const runningBarcodeRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookupWithCache = useCallback(
    async (barcode, options = {}) => {
      const { forceRefresh = false } = options;
      const normalizedBarcode = normalizeBarcode(barcode);

      if (!normalizedBarcode) {
        throw new Error("Código de barras vacío.");
      }

      if (runningBarcodeRef.current === normalizedBarcode) {
        return null;
      }

      runningBarcodeRef.current = normalizedBarcode;
      setLoading(true);
      setError(null);

      try {
        const cachedProduct = await convex.query(
          api.productCache.getByBarcode,
          {
            barcode: normalizedBarcode,
          },
        );

        if (!forceRefresh && hasUsefulProductData(cachedProduct)) {
          return {
            fromCache: true,
            barcode: normalizedBarcode,
            product: cachedProduct,
          };
        }

        const negativeCacheActive =
          !forceRefresh &&
          cachedProduct?.status === "not_found" &&
          Number(cachedProduct?.nextExternalLookupAt || 0) > Date.now();

        if (negativeCacheActive) {
          return {
            fromCache: true,
            barcode: normalizedBarcode,
            product: cachedProduct,
            notFound: true,
            retryAt: cachedProduct.nextExternalLookupAt,
          };
        }

        const lookupResult = await lookupProductByBarcode(normalizedBarcode);

        if (!lookupResult?.found || !lookupResult?.product) {
          const notFoundProduct = await markAsNotFound({
            barcode: normalizedBarcode,
          });

          return {
            fromCache: false,
            barcode: normalizedBarcode,
            product: notFoundProduct,
            notFound: true,
            reason: lookupResult?.reason || "not_found",
          };
        }

        const externalProduct = lookupResult.product;

        const savedProduct = await saveProductData({
          barcode: normalizedBarcode,
          name: String(externalProduct.name || "").trim() || undefined,
          brand: String(externalProduct.brand || "").trim() || undefined,
          category: String(externalProduct.category || "").trim() || undefined,
          imageUrl: String(externalProduct.imageUrl || "").trim() || undefined,
          productUrl:
            String(
              externalProduct.productUrl || externalProduct.url || "",
            ).trim() || undefined,
          source: "internet",
          status: "complete",
        });

        return {
          fromCache: false,
          barcode: normalizedBarcode,
          product: savedProduct,
        };
      } catch (err) {
        const message =
          err?.message || "No se pudo buscar o guardar el producto.";

        setError(message);
        throw err;
      } finally {
        if (runningBarcodeRef.current === normalizedBarcode) {
          runningBarcodeRef.current = null;
        }

        setLoading(false);
      }
    },
    [convex, markAsNotFound, saveProductData],
  );

  return {
    loading,
    error,
    lookupWithCache,
  };
}

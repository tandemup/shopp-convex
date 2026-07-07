// src/utils/productImageCache.js

import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const CACHE_DIR = `${FileSystem.cacheDirectory || ""}shopp-product-images/`;

function safeFileName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function getImageExtension(url) {
  const cleanUrl = String(url || "")
    .split("?")[0]
    .toLowerCase();

  if (cleanUrl.endsWith(".png")) return "png";
  if (cleanUrl.endsWith(".webp")) return "webp";
  if (cleanUrl.endsWith(".jpeg")) return "jpg";
  if (cleanUrl.endsWith(".jpg")) return "jpg";

  return "jpg";
}

export function getProductImageCacheKey(product) {
  if (product?.ean) {
    return `ean-${product.ean}`;
  }

  if (product?.barcode) {
    return `ean-${product.barcode}`;
  }

  if (product?.id) {
    return `id-${product.id}`;
  }

  return safeFileName(product?.nombre || product?.name || "product");
}

export function getCachedProductImagePath(product, imageUrl) {
  const key = safeFileName(getProductImageCacheKey(product));
  const extension = getImageExtension(imageUrl);

  return `${CACHE_DIR}${key}.${extension}`;
}

async function ensureCacheDir() {
  if (Platform.OS === "web") {
    return false;
  }

  if (!FileSystem.cacheDirectory) {
    return false;
  }

  const info = await FileSystem.getInfoAsync(CACHE_DIR);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, {
      intermediates: true,
    });
  }

  return true;
}

export async function getCachedProductImageUri(product, imageUrl) {
  if (!imageUrl) {
    return null;
  }

  /**
   * En web dejamos trabajar al navegador.
   * En iOS/Android descargamos a FileSystem.cacheDirectory.
   */
  if (Platform.OS === "web") {
    return imageUrl;
  }

  try {
    const hasCacheDir = await ensureCacheDir();

    if (!hasCacheDir) {
      return imageUrl;
    }

    const localUri = getCachedProductImagePath(product, imageUrl);
    const localInfo = await FileSystem.getInfoAsync(localUri);

    if (localInfo.exists) {
      return localUri;
    }

    const downloaded = await FileSystem.downloadAsync(imageUrl, localUri);

    if (downloaded?.uri) {
      return downloaded.uri;
    }

    return imageUrl;
  } catch (error) {
    console.warn("No se pudo cachear la imagen del producto:", error);
    return imageUrl;
  }
}

export async function prefetchProductImages(products = []) {
  if (Platform.OS === "web") {
    return {
      ok: true,
      downloaded: 0,
      skipped: products.length,
      errors: [],
    };
  }

  const result = {
    ok: true,
    downloaded: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const hasCacheDir = await ensureCacheDir();

    if (!hasCacheDir) {
      return {
        ok: true,
        downloaded: 0,
        skipped: products.length,
        errors: [],
      };
    }
  } catch (error) {
    result.ok = false;
    result.errors.push(String(error?.message || error));
    return result;
  }

  for (const product of products) {
    const imageUrl = product?.image || product?.imageUrl;

    if (!imageUrl) {
      result.skipped += 1;
      continue;
    }

    try {
      const localUri = getCachedProductImagePath(product, imageUrl);
      const localInfo = await FileSystem.getInfoAsync(localUri);

      if (localInfo.exists) {
        result.skipped += 1;
        continue;
      }

      await FileSystem.downloadAsync(imageUrl, localUri);
      result.downloaded += 1;
    } catch (error) {
      result.ok = false;
      result.errors.push({
        productId: product?.id,
        imageUrl,
        message: String(error?.message || error),
      });
    }
  }

  return result;
}

export async function clearProductImageCache() {
  if (Platform.OS === "web") {
    return true;
  }

  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);

    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, {
        idempotent: true,
      });
    }

    return true;
  } catch (error) {
    console.warn("No se pudo limpiar la caché de imágenes:", error);
    return false;
  }
}

// services/productLookup.js

const OPEN_FOOD_FACTS_API_BASE_URL =
  "https://world.openfoodfacts.org/api/v2/product";

const OPEN_FOOD_FACTS_PRODUCT_BASE_URL =
  "https://world.openfoodfacts.org/product";

const REQUEST_TIMEOUT_MS = 10000;

function normalizeBarcode(code) {
  return String(code || "")
    .replace(/\D/g, "")
    .trim();
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function isSupportedBarcode(barcode) {
  return barcode.length === 8 || barcode.length === 12 || barcode.length === 13;
}

function isLikelyIsbn(barcode) {
  return (
    barcode.length === 13 &&
    (barcode.startsWith("978") || barcode.startsWith("979"))
  );
}

function getBestImage(product) {
  return (
    product?.image_front_url ||
    product?.image_url ||
    product?.selected_images?.front?.display?.es ||
    product?.selected_images?.front?.display?.en ||
    product?.selected_images?.front?.small?.es ||
    product?.selected_images?.front?.small?.en ||
    ""
  );
}

function getBestProductName(product) {
  return (
    product?.product_name_es ||
    product?.product_name ||
    product?.generic_name_es ||
    product?.generic_name ||
    ""
  ).trim();
}

function getOpenFoodFactsProductUrl(product, barcode) {
  return product?.url || `${OPEN_FOOD_FACTS_PRODUCT_BASE_URL}/${barcode}`;
}

async function fetchWithTimeout(url, options = {}) {
  if (typeof AbortController === "undefined") {
    return fetch(url, options);
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function lookupProductByBarcode(barcode) {
  const cleanBarcode = normalizeBarcode(barcode);

  if (!cleanBarcode || !isSupportedBarcode(cleanBarcode)) {
    return {
      found: false,
      product: null,
      reason: "invalid_barcode",
    };
  }

  // OpenFoodFacts no es una fuente adecuada para libros identificados por ISBN.
  if (isLikelyIsbn(cleanBarcode)) {
    return {
      found: false,
      product: null,
      reason: "isbn_use_external_search",
    };
  }

  try {
    const fields = [
      "code",
      "product_name",
      "product_name_es",
      "generic_name",
      "generic_name_es",
      "brands",
      "categories",
      "image_url",
      "image_front_url",
      "selected_images",
      "url",
    ].join(",");

    const url =
      `${OPEN_FOOD_FACTS_API_BASE_URL}/${cleanBarcode}.json` +
      `?fields=${encodeURIComponent(fields)}`;

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        found: false,
        product: null,
        reason: "http_error",
        status: response.status,
      };
    }

    const data = await response.json();

    if (data?.status !== 1 || !data?.product) {
      return {
        found: false,
        product: null,
        reason: "not_found",
      };
    }

    const product = data.product;

    return {
      found: true,
      product: {
        barcode: cleanBarcode,

        name: getBestProductName(product),
        brand: normalizeOptionalString(product?.brands),
        category: normalizeOptionalString(product?.categories),

        imageUrl: getBestImage(product),

        url: getOpenFoodFactsProductUrl(product, cleanBarcode),
        productUrl: getOpenFoodFactsProductUrl(product, cleanBarcode),

        source: "openfoodfacts",
        lookupSource: "openfoodfacts",

        rawData: data,
      },
    };
  } catch (error) {
    const isAbortError = error?.name === "AbortError";

    console.log(
      isAbortError
        ? "Open Food Facts request timed out"
        : "Error looking up product by barcode:",
      error,
    );

    return {
      found: false,
      product: null,
      reason: isAbortError ? "timeout" : "network_error",
    };
  }
}

export function getProductDisplayName(product, fallbackBarcode = "") {
  return (
    normalizeOptionalString(product?.name) ||
    normalizeOptionalString(product?.product_name) ||
    normalizeOptionalString(product?.title) ||
    normalizeOptionalString(product?.rawData?.product?.product_name_es) ||
    normalizeOptionalString(product?.rawData?.product?.product_name) ||
    `Producto ${fallbackBarcode}`
  );
}

export function getProductBrand(product) {
  return (
    normalizeOptionalString(product?.brand) ||
    normalizeOptionalString(product?.brands) ||
    normalizeOptionalString(product?.rawData?.product?.brands)
  );
}

export function getProductImageUrl(product) {
  return (
    normalizeOptionalString(product?.imageUrl) ||
    normalizeOptionalString(product?.image_url) ||
    normalizeOptionalString(product?.image) ||
    normalizeOptionalString(product?.rawData?.product?.image_front_url) ||
    normalizeOptionalString(product?.rawData?.product?.image_url)
  );
}

export function getProductCategory(product) {
  return (
    normalizeOptionalString(product?.category) ||
    normalizeOptionalString(product?.categories) ||
    normalizeOptionalString(product?.rawData?.product?.categories)
  );
}

export function getProductUrl(product, barcode = "") {
  return (
    normalizeOptionalString(product?.productUrl) ||
    normalizeOptionalString(product?.url) ||
    normalizeOptionalString(product?.link) ||
    normalizeOptionalString(product?.rawData?.product?.url) ||
    (barcode
      ? `${OPEN_FOOD_FACTS_PRODUCT_BASE_URL}/${encodeURIComponent(barcode)}`
      : "")
  );
}

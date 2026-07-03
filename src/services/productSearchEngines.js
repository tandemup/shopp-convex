import { openExternalUrl } from "@/utils/openExternalUrl";

export const PRODUCT_SEARCH_ENGINES = {
  GOOGLE: "google",
  GOOGLE_SHOPPING: "google_shopping",
  BING: "bing",
  DUCKDUCKGO: "duckduckgo",
  OPEN_FOOD_FACTS: "open_food_facts",
  BARCODE_LOOKUP: "barcode_lookup",
};

export const PRODUCT_SEARCH_ENGINE_LABELS = {
  [PRODUCT_SEARCH_ENGINES.GOOGLE]: "Google",
  [PRODUCT_SEARCH_ENGINES.GOOGLE_SHOPPING]: "Google Shopping",
  [PRODUCT_SEARCH_ENGINES.BING]: "Bing",
  [PRODUCT_SEARCH_ENGINES.DUCKDUCKGO]: "DuckDuckGo",
  [PRODUCT_SEARCH_ENGINES.OPEN_FOOD_FACTS]: "OpenFoodFacts",
  [PRODUCT_SEARCH_ENGINES.BARCODE_LOOKUP]: "BarcodeLookup",
};

export const DEFAULT_PRODUCT_SEARCH_ENGINE =
  PRODUCT_SEARCH_ENGINES.OPEN_FOOD_FACTS;

export function normalizeProductSearchEngine(engine) {
  const values = Object.values(PRODUCT_SEARCH_ENGINES);

  if (values.includes(engine)) {
    return engine;
  }

  return DEFAULT_PRODUCT_SEARCH_ENGINE;
}

export function buildProductSearchUrl(engine, barcode) {
  const safeEngine = normalizeProductSearchEngine(engine);
  const safeBarcode = String(barcode || "").trim();

  if (!safeBarcode) {
    return null;
  }

  const encodedBarcode = encodeURIComponent(safeBarcode);

  switch (safeEngine) {
    case PRODUCT_SEARCH_ENGINES.GOOGLE:
      return `https://www.google.com/search?q=${encodedBarcode}`;

    case PRODUCT_SEARCH_ENGINES.GOOGLE_SHOPPING:
      return `https://www.google.com/search?tbm=shop&q=${encodedBarcode}`;

    case PRODUCT_SEARCH_ENGINES.BING:
      return `https://www.bing.com/search?q=${encodedBarcode}`;

    case PRODUCT_SEARCH_ENGINES.DUCKDUCKGO:
      return `https://duckduckgo.com/?q=${encodedBarcode}`;

    case PRODUCT_SEARCH_ENGINES.OPEN_FOOD_FACTS:
      return `https://world.openfoodfacts.org/product/${encodedBarcode}`;

    case PRODUCT_SEARCH_ENGINES.BARCODE_LOOKUP:
      return `https://www.barcodelookup.com/${encodedBarcode}`;

    default:
      return `https://world.openfoodfacts.org/product/${encodedBarcode}`;
  }
}

export async function openProductSearchEngine(engine, barcode) {
  const url = buildProductSearchUrl(engine, barcode);

  if (!url) {
    return {
      ok: false,
      error: "No se recibió un código de barras válido.",
    };
  }

  const result = await openExternalUrl(url);

  if (!result.ok) {
    return {
      ok: false,
      error: "No se pudo abrir el motor de búsqueda.",
    };
  }

  return {
    ok: true,
    url,
  };
}

// utils/productSearchUrl.js

export function normalizeProductSearchEngineId(engineId) {
  const id = String(engineId || "").trim();

  switch (id) {
    case "google":
      return "google";

    case "google_shopping":
      return "google_shopping";

    case "bing":
      return "bing";

    case "duckduckgo":
      return "duckduckgo";

    case "openfoodfacts":
    case "open_food_facts":
      return "openfoodfacts";

    case "barcodelookup":
    case "barcode_lookup":
      return "barcodelookup";

    default:
      return "openfoodfacts";
  }
}

export function buildProductSearchUrl(engineId, barcode) {
  const safeBarcode = String(barcode || "").trim();

  if (!safeBarcode) {
    return null;
  }

  const safeEngineId = normalizeProductSearchEngineId(engineId);
  const encodedBarcode = encodeURIComponent(safeBarcode);

  switch (safeEngineId) {
    case "google":
      return `https://www.google.com/search?q=${encodedBarcode}`;

    case "google_shopping":
      return `https://www.google.com/search?tbm=shop&q=${encodedBarcode}`;

    case "bing":
      return `https://www.bing.com/search?q=${encodedBarcode}`;

    case "duckduckgo":
      return `https://duckduckgo.com/?q=${encodedBarcode}`;

    case "openfoodfacts":
      return `https://world.openfoodfacts.org/product/${encodedBarcode}`;

    case "barcodelookup":
      return `https://www.barcodelookup.com/${encodedBarcode}`;

    default:
      return `https://world.openfoodfacts.org/product/${encodedBarcode}`;
  }
}

export function getProductSearchEngineLabel(engineId) {
  const safeEngineId = normalizeProductSearchEngineId(engineId);

  switch (safeEngineId) {
    case "google":
      return "Google";

    case "google_shopping":
      return "Google Shopping";

    case "bing":
      return "Bing";

    case "duckduckgo":
      return "DuckDuckGo";

    case "openfoodfacts":
      return "OpenFoodFacts";

    case "barcodelookup":
      return "BarcodeLookup";

    default:
      return "OpenFoodFacts";
  }
}

// src/constants/searchEngines.js

const encodeQuery = (query) => {
  return encodeURIComponent(String(query ?? "").trim());
};

export const SEARCH_ENGINES = {
  google_ai: {
    id: "google_ai",
    label: "Google Modo IA",
    description: "Respuesta generada por Google a partir del código",
    family: "Ionicons",
    icon: "sparkles-outline",
    buildUrl: (query) => {
      return `https://www.google.com/search?udm=50&q=${encodeQuery(query)}`;
    },
  },

  google_shopping: {
    id: "google_shopping",
    label: "Google Shopping",
    description: "Precios, tiendas y ofertas disponibles",
    family: "Ionicons",
    icon: "cart-outline",
    buildUrl: (query) => {
      return `https://www.google.com/search?tbm=shop&q=${encodeQuery(query)}`;
    },
  },

  google: {
    id: "google",
    label: "Google",
    description: "Búsqueda general en Google",
    family: "Ionicons",
    icon: "logo-google",
    buildUrl: (query) => {
      return `https://www.google.com/search?q=${encodeQuery(query)}`;
    },
  },

  bing: {
    id: "bing",
    label: "Bing",
    description: "Búsqueda general en Bing",
    family: "Fontisto",
    icon: "bing",
    buildUrl: (query) => {
      return `https://www.bing.com/search?q=${encodeQuery(query)}`;
    },
  },

  duckduckgo: {
    id: "duckduckgo",
    label: "DuckDuckGo",
    description: "Búsqueda general con DuckDuckGo",
    family: "Ionicons",
    icon: "search-outline",
    buildUrl: (query) => {
      return `https://duckduckgo.com/?q=${encodeQuery(query)}`;
    },
  },

  openfoodfacts: {
    id: "openfoodfacts",
    label: "OpenFoodFacts",
    description: "Ficha de producto en Open Food Facts",
    family: "Ionicons",
    icon: "nutrition-outline",
    buildUrl: (query) => {
      return `https://world.openfoodfacts.org/product/${encodeQuery(query)}`;
    },
  },

  barcodelookup: {
    id: "barcodelookup",
    label: "BarcodeLookup",
    description: "Consulta el código en Barcode Lookup",
    family: "Ionicons",
    icon: "barcode-outline",
    buildUrl: (query) => {
      return `https://www.barcodelookup.com/${encodeQuery(query)}`;
    },
  },
};

export const PRODUCT_SEARCH_ENGINE_IDS = [
  "google_ai",
  "google_shopping",
  "google",
  "bing",
  "duckduckgo",
  "openfoodfacts",
  "barcodelookup",
];

export const BOOK_ENGINES = {
  google_books: {
    id: "google_books",
    label: "Google Books",
    family: "Ionicons",
    icon: "book-outline",
    buildUrl: (query) => {
      return `https://www.google.com/search?tbm=bks&q=${encodeQuery(query)}`;
    },
  },

  open_library: {
    id: "open_library",
    label: "Open Library",
    family: "Ionicons",
    icon: "library-outline",
    buildUrl: (query) => {
      return `https://openlibrary.org/search?q=${encodeQuery(query)}`;
    },
  },

  amazon_books: {
    id: "amazon_books",
    label: "Amazon Books",
    family: "Ionicons",
    icon: "cart-outline",
    buildUrl: (query) => {
      return `https://www.amazon.com/s?k=${encodeQuery(query)}&i=stripbooks`;
    },
  },
};

export const DEFAULT_ENGINE = "google_ai";
export const DEFAULT_BOOK_ENGINE = "google_books";

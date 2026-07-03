// constants/searchEngines.js

/* ────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────── */

/**
 * Convierte cualquier valor recibido en un texto seguro para incluirlo
 * como parámetro de una URL.
 *
 * También elimina espacios accidentales al principio y al final.
 */
const encodeQuery = (query) => {
  return encodeURIComponent(String(query ?? "").trim());
};

/* ────────────────────────────────────────────────
   PRODUCT SEARCH ENGINES
──────────────────────────────────────────────── */

export const SEARCH_ENGINES = {
  /**
   * Se conserva esta clave por compatibilidad con configuraciones antiguas.
   * Actualmente abre directamente Google Shopping.
   */
  google: {
    id: "google",
    label: "Google Shopping",
    family: "Ionicons",
    icon: "logo-google",
    buildUrl: (query) => {
      return `https://www.google.com/search?tbm=shop&q=${encodeQuery(query)}`;
    },
  },

  /**
   * Alias explícito para Google Shopping.
   * Puede utilizarse desde la pantalla de ajustes.
   */
  google_shopping: {
    id: "google_shopping",
    label: "Google Shopping",
    family: "Ionicons",
    icon: "logo-google",
    buildUrl: (query) => {
      return `https://www.google.com/search?tbm=shop&q=${encodeQuery(query)}`;
    },
  },

  bing: {
    id: "bing",
    label: "Bing",
    family: "Fontisto",
    icon: "bing",
    buildUrl: (query) => {
      return `https://www.bing.com/search?q=${encodeQuery(query)}`;
    },
  },

  duckduckgo: {
    id: "duckduckgo",
    label: "DuckDuckGo",
    family: "Ionicons",
    icon: "search-outline",
    buildUrl: (query) => {
      return `https://duckduckgo.com/?q=${encodeQuery(query)}`;
    },
  },

  openfoodfacts: {
    id: "openfoodfacts",
    label: "OpenFoodFacts",
    family: "Ionicons",
    icon: "nutrition-outline",
    buildUrl: (query) => {
      return `https://world.openfoodfacts.org/product/${encodeQuery(query)}`;
    },
  },

  barcodelookup: {
    id: "barcodelookup",
    label: "BarcodeLookup",
    family: "Ionicons",
    icon: "barcode-outline",
    buildUrl: (query) => {
      return `https://www.barcodelookup.com/${encodeQuery(query)}`;
    },
  },
};

/* ────────────────────────────────────────────────
   BOOK SEARCH ENGINES
──────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────
   DEFAULT VALUES
──────────────────────────────────────────────── */

export const DEFAULT_ENGINE = "google";

export const DEFAULT_BOOK_ENGINE = "google_books";

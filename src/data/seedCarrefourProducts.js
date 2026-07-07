// src/data/seedCarrefourProducts.js

/**
 * Catálogo semilla de productos Carrefour para pruebas en Shopp.
 *
 * Uso recomendado:
 * - importar CARREFOUR_PRODUCTS en una pantalla de prueba
 * - cargarlo en AsyncStorage
 * - o usarlo como dataset inicial para búsqueda por nombre / EAN
 */

export const CARREFOUR_PRODUCTS = [
  {
    id: "carrefour-basic-001",
    store: "Carrefour Online",
    source: "carrefour.es",
    image: "https://static.carrefour.es/hd_350x_/img_pim_food/539372_00_1.jpg",
    nombre: "Leche entera Carrefour Classic pack de 9 unidades de 1 l",
    marca: "Carrefour Classic",
    categoria: "Lácteos y huevos",
    subcategoria: "Leche",
    ean: "8431876361209",
    eanStatus: "confirmed",
    imageStatus: "confirmed",
  },
  {
    id: "carrefour-basic-002",
    store: "Carrefour Online",
    source: "carrefour.es",
    image: null,
    nombre: "Leche semidesnatada Carrefour Classic pack de 9 unidades de 1 l",
    marca: "Carrefour Classic",
    categoria: "Lácteos y huevos",
    subcategoria: "Leche",
    ean: null,
    eanStatus: "not_publicly_verified",
    imageStatus: "not_publicly_verified",
  },
  {
    id: "carrefour-basic-003",
    store: "Carrefour Online",
    source: "carrefour.es",
    image: null,
    nombre: "Leche desnatada Carrefour Classic pack de 9 unidades de 1 l",
    marca: "Carrefour Classic",
    categoria: "Lácteos y huevos",
    subcategoria: "Leche",
    ean: null,
    eanStatus: "not_publicly_verified",
    imageStatus: "not_publicly_verified",
  },
];

/**
 * Normaliza un producto Carrefour al formato interno de Shopp.
 */
export function normalizeCarrefourProduct(product) {
  return {
    id: product.id,
    name: product.nombre,
    brand: product.marca,
    barcode: product.ean || "",
    category: product.categoria,
    subcategory: product.subcategoria,
    store: product.store || "Carrefour Online",
    imageUrl: product.image || "",
    productUrl: "",
    source: product.source || "carrefour.es",
    eanStatus: product.eanStatus || "not_publicly_verified",
    imageStatus: product.imageStatus || "not_publicly_verified",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Devuelve el catálogo ya adaptado al formato de Shopp.
 */
export function getNormalizedCarrefourProducts() {
  return CARREFOUR_PRODUCTS.map(normalizeCarrefourProduct);
}

/**
 * Busca por código EAN.
 */
export function findCarrefourProductByEAN(ean) {
  if (!ean) return null;

  const cleanEAN = String(ean).trim();

  return (
    CARREFOUR_PRODUCTS.find((product) => {
      return String(product.ean || "").trim() === cleanEAN;
    }) || null
  );
}

/**
 * Busca por texto en nombre, marca, categoría o subcategoría.
 */
export function searchCarrefourProducts(query) {
  const text = String(query || "")
    .trim()
    .toLowerCase();

  if (!text) {
    return CARREFOUR_PRODUCTS;
  }

  return CARREFOUR_PRODUCTS.filter((product) => {
    const haystack = [
      product.nombre,
      product.marca,
      product.categoria,
      product.subcategoria,
      product.ean,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(text);
  });
}

/**
 * Comprueba si el catálogo tiene IDs o EAN duplicados.
 */
export function validateCarrefourProducts(products = CARREFOUR_PRODUCTS) {
  const errors = [];
  const ids = new Set();
  const eans = new Set();

  products.forEach((product, index) => {
    if (!product.id) {
      errors.push(`Producto ${index + 1}: falta id`);
    }

    if (!product.nombre) {
      errors.push(`Producto ${index + 1}: falta nombre`);
    }

    if (product.id) {
      if (ids.has(product.id)) {
        errors.push(`ID duplicado: ${product.id}`);
      }
      ids.add(product.id);
    }

    if (product.ean) {
      if (eans.has(product.ean)) {
        errors.push(`EAN duplicado: ${product.ean}`);
      }
      eans.add(product.ean);
    }
  });

  return {
    ok: errors.length === 0,
    total: products.length,
    withEAN: products.filter((product) => Boolean(product.ean)).length,
    withImage: products.filter((product) => Boolean(product.image)).length,
    errors,
  };
}

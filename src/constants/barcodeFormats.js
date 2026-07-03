// constants/barcodeFormats.js

export const BARCODE_FORMATS = {
  ean13: {
    id: "ean13",
    label: "EAN-13",
    description: "Productos comerciales en Europa y supermercados",
  },

  ean8: {
    id: "ean8",
    label: "EAN-8",
    description: "Productos pequeños con código corto",
  },

  upc_a: {
    id: "upc_a",
    label: "UPC-A",
    description: "Productos de EE. UU. y Canadá",
  },

  upc_e: {
    id: "upc_e",
    label: "UPC-E",
    description: "Versión compacta de UPC",
  },

  qr: {
    id: "qr",
    label: "QR",
    description: "URLs, promociones, tickets o información adicional",
  },

  code128: {
    id: "code128",
    label: "Code 128",
    description: "Logística, almacenes y etiquetas internas",
  },
};

export const DEFAULT_BARCODE_SETTINGS = {
  formats: {
    ean13: true,
    ean8: true,
    upc_a: true,
    upc_e: true,
    qr: false,
    code128: false,
  },
};

export const ROUTES = {
  // Tabs
  SHOPPING_TAB: "ShoppingTab",
  STORES_TAB: "StoresTab",
  SCANNER_TAB: "ScannerTab",
  MENU_TAB: "MenuTab",

  // Shopping stack
  SHOPPING_LISTS: "Shopping Lists",
  SHOPPING_LIST: "Shopping List",
  ITEM_DETAIL: "Item Detail",

  // Stores stack
  STORES_HOME: "Stores Home",
  STORES_BROWSE: "Stores Browse",
  STORE_SELECT: "Store Select",
  STORES_FAVORITES: "Stores Favorites",
  STORE_DETAIL: "Store Detail",
  STORE_MAP: "Store Map",
  STORES_NEARBY: "Stores Nearby",
  STORE_INFO: "Store Info",

  // Archive
  ARCHIVED_LISTS: "Archived Lists",
  ARCHIVED_LIST_DETAIL: "Archived List Detail",

  // History
  PURCHASE_HISTORY: "Purchase History",
  PURCHASE_DETAIL: "Purchase Detail",
  SCANNED_HISTORY: "Scanned History",

  // Scanner stack
  SCANNER_HOME: "Scanner Home",

  // Scanner básico heredado:
  // Se conserva como pantalla auxiliar.
  PRODUCT_BARCODE_SCANNER: "ProductBarcodeScanner",

  // Scanner principal:
  // Se usa desde el tab Scanner para escanear un producto nuevo.
  // ItemDetailScreen también abre NEW_PRODUCT_SCANNER2 con
  // captureMode: "ean13-input" para activar el lector rápido.
  NEW_PRODUCT_SCANNER2: "NewProductScanner2",
  // Pantalla para mostrar información obtenida del producto escaneado
  PRODUCT_INFO: "ProductInfo",

  // Scanner auxiliares / existentes
  SCANNER_SCREEN: "Scanner Screen",
  QUICK_SCANNER_SCREEN: "QuickScanner Screen",
  DETAILED_SCANNER_SCREEN: "DetailedScanner Screen",
  SHELF_LABEL_SCANNER: "Shelf Label Scanner",
  EDIT_SCANNED_ITEM: "Edit Scanned Item",

  // Search settings
  SEARCH_ENGINES: "Search Engines",
  SEARCH_ENGINE_SETTINGS: "SearchEngine Settings Screen",

  // Menu / Settings
  MENU: "Menu",
  SETTINGS: "Settings Screen",
  BARCODE_SETTINGS: "Barcode Settings Screen",
  CONFIRM_DELETE: "Confirm Delete Screen",

  // Chat
  CHAT_SCREEN: "Chat",
  CHAT_SCREEN_RESPONSIVE: "Chat Responsive",

  // Debug
  PRODUCT_LEARNING_DEBUG: "Product Learning Debug",
};

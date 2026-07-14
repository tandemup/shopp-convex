export const DEFAULT_MAP_TILE_STYLE = "default";

export const MAP_TILE_STYLES = {
  default: {
    id: "default",
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxNativeZoom: 19,
  },

  gray: {
    id: "gray",
    label: "Gris claro",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxNativeZoom: 20,
  },

  dark: {
    id: "dark",
    label: "Oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxNativeZoom: 20,
  },

  voyager: {
    id: "voyager",
    label: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxNativeZoom: 20,
  },
};

export function getMapTileConfig(mapStyle = DEFAULT_MAP_TILE_STYLE) {
  return MAP_TILE_STYLES[mapStyle] ?? MAP_TILE_STYLES[DEFAULT_MAP_TILE_STYLE];
}

export function isValidMapTileStyle(mapStyle) {
  return Object.prototype.hasOwnProperty.call(MAP_TILE_STYLES, mapStyle);
}

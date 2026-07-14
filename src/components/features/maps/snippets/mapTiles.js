export function getMapTileConfig(mapStyle = "default") {
  switch (mapStyle) {
    case "gray":
      return {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution:
          "&copy; OpenStreetMap contributors &copy; CARTO",
      };

    case "dark":
      return {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution:
          "&copy; OpenStreetMap contributors &copy; CARTO",
      };

    case "voyager":
      return {
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution:
          "&copy; OpenStreetMap contributors &copy; CARTO",
      };

    default:
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "&copy; OpenStreetMap contributors",
      };
  }
}

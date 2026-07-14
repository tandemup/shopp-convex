import L from "leaflet";

export function getMarkerSizeForZoom(
  zoom,
  minSize = 18,
  maxSize = 38,
) {
  const normalizedZoom = Number.isFinite(zoom) ? zoom : 15;
  const rawSize = 18 + (normalizedZoom - 13) * 3;
  return Math.round(Math.min(maxSize, Math.max(minSize, rawSize)));
}

function traditionalPinSvg(color, size) {
  const height = Math.round(size * 1.38);

  return {
    width: size,
    height,
    html: `
      <svg width="${size}" height="${height}" viewBox="0 0 42 56"
        xmlns="http://www.w3.org/2000/svg"
        style="display:block;overflow:visible;filter:drop-shadow(0 4px 4px rgba(15,23,42,.30));">
        <path d="M21 1C10.2 1 1.5 9.7 1.5 20.5C1.5 34.3 15.3 48.6 21 55C26.7 48.6 40.5 34.3 40.5 20.5C40.5 9.7 31.8 1 21 1Z"
          fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round" />
        <circle cx="21" cy="20.5" r="7" fill="#fff" />
      </svg>`,
  };
}

function circleStickSvg(color, size) {
  const width = size;
  const height = Math.round(size * 1.55);
  const center = width / 2;
  const radius = width * 0.42;
  const circleY = radius + 2;

  return {
    width,
    height,
    html: `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
        xmlns="http://www.w3.org/2000/svg"
        style="display:block;overflow:visible;filter:drop-shadow(0 3px 3px rgba(15,23,42,.25));">
        <line x1="${center}" y1="${circleY + radius - 1}" x2="${center}" y2="${height - 1}"
          stroke="#9ca3af" stroke-width="${Math.max(2, size * 0.09)}" stroke-linecap="round" />
        <circle cx="${center}" cy="${circleY}" r="${radius}"
          fill="${color}" stroke="#fff" stroke-width="2" />
        <circle cx="${center + radius * 0.3}" cy="${circleY - radius * 0.3}"
          r="${Math.max(2, size * 0.09)}" fill="rgba(255,255,255,.55)" />
      </svg>`,
  };
}

function circleSvg(color, size) {
  return {
    width: size,
    height: size,
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid #fff;box-sizing:border-box;box-shadow:0 4px 10px rgba(15,23,42,.3)"></div>`,
  };
}

export function createParkingMarkerIcon({
  style = "traditional-pin",
  color = "#dc2626",
  size = 28,
}) {
  const drawing =
    style === "circle-stick"
      ? circleStickSvg(color, size)
      : style === "circle"
        ? circleSvg(color, size)
        : traditionalPinSvg(color, size);

  const isCircle = style === "circle";

  return L.divIcon({
    className: "shopp-parking-marker",
    html: drawing.html,
    iconSize: [drawing.width, drawing.height],
    iconAnchor: isCircle
      ? [drawing.width / 2, drawing.height / 2]
      : [drawing.width / 2, drawing.height],
    popupAnchor: [0, -drawing.height + 8],
  });
}

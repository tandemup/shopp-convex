/* Copiar estas funciones dentro del <script> del HTML de StoreMapPreview.native.js */

function getMarkerSizeForZoom(zoom, minSize, maxSize) {
  const numericZoom = Number.isFinite(zoom) ? zoom : 15;
  const rawSize = 18 + (numericZoom - 13) * 3;
  return Math.round(Math.min(maxSize, Math.max(minSize, rawSize)));
}

function createParkingIcon(style, color, size) {
  const traditionalHeight = Math.round(size * 1.38);
  const stickHeight = Math.round(size * 1.55);

  if (style === "circle-stick") {
    const center = size / 2;
    const radius = size * 0.42;
    const circleY = radius + 2;

    return L.divIcon({
      className: "shopp-parking-marker",
      html: `<svg width="${size}" height="${stickHeight}" viewBox="0 0 ${size} ${stickHeight}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 3px 3px rgba(15,23,42,.25))"><line x1="${center}" y1="${circleY + radius - 1}" x2="${center}" y2="${stickHeight - 1}" stroke="#9ca3af" stroke-width="${Math.max(2, size * .09)}" stroke-linecap="round"/><circle cx="${center}" cy="${circleY}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="${center + radius * .3}" cy="${circleY - radius * .3}" r="${Math.max(2, size * .09)}" fill="rgba(255,255,255,.55)"/></svg>`,
      iconSize: [size, stickHeight],
      iconAnchor: [size / 2, stickHeight],
      popupAnchor: [0, -stickHeight + 8],
    });
  }

  if (style === "circle") {
    return L.divIcon({
      className: "shopp-parking-marker",
      html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid #fff;box-sizing:border-box;box-shadow:0 4px 10px rgba(15,23,42,.3)"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }

  return L.divIcon({
    className: "shopp-parking-marker",
    html: `<svg width="${size}" height="${traditionalHeight}" viewBox="0 0 42 56" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 4px 4px rgba(15,23,42,.30))"><path d="M21 1C10.2 1 1.5 9.7 1.5 20.5C1.5 34.3 15.3 48.6 21 55C26.7 48.6 40.5 34.3 40.5 20.5C40.5 9.7 31.8 1 21 1Z" fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="21" cy="20.5" r="7" fill="#fff"/></svg>`,
    iconSize: [size, traditionalHeight],
    iconAnchor: [size / 2, traditionalHeight],
    popupAnchor: [0, -traditionalHeight + 8],
  });
}

/*
const parkingMarkerRecords = [];

function refreshParkingMarkerIcons() {
  const size = parkingMarkerScaleByZoom
    ? getMarkerSizeForZoom(
        map.getZoom(),
        parkingMarkerMinSize,
        parkingMarkerMaxSize,
      )
    : Math.round((parkingMarkerMinSize + parkingMarkerMaxSize) / 2);

  parkingMarkerRecords.forEach(({ marker }) => {
    marker.setIcon(
      createParkingIcon(
        parkingMarkerStyle,
        parkingMarkerColor,
        size,
      ),
    );
  });
}

map.on("zoomend", refreshParkingMarkerIcons);
*/

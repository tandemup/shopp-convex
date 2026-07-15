import React, { useMemo } from "react";
import { WebView } from "react-native-webview";

const DEFAULT_ZOOM = 15;
const DEFAULT_MIN_ZOOM = 13;
const DEFAULT_MAX_ZOOM = 21;

const TILE_STYLES = {
  default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxNativeZoom: 19,
  },
  gray: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    maxNativeZoom: 20,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    maxNativeZoom: 20,
  },
  voyager: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    maxNativeZoom: 20,
  },
};

function isValidCoord(value) {
  return Number.isFinite(Number(value));
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function normalizeSpot(spot) {
  const lat = Number(spot?.location?.lat ?? spot?.lat ?? spot?.latitude);
  const lng = Number(spot?.location?.lng ?? spot?.lng ?? spot?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: String(spot?.id || spot?._id || `${lat}-${lng}`),
    lat,
    lng,
    alias: escapeHtml(spot?.alias || "Plaza"),
    status: String(spot?.status || ""),
  };
}

export default function StoreMapPreview({
  lat,
  lng,
  centerLat,
  centerLng,
  userLat,
  userLng,
  parkingSpots = [],
  onMapPress,
  selectedLat,
  selectedLng,
  defaultZoom = DEFAULT_ZOOM,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomControlsEnabled = true,
  zoomGesturesEnabled = true,
  mapStyle = "default",
  parkingMarkerStyle = "traditional-pin",
  parkingMarkerColor = "#ef4444",
  parkingMarkerBaseSize = 32,
  markerSizeByZoom = true,
}) {
  if (!isValidCoord(lat) || !isValidCoord(lng)) return null;
  const tile = TILE_STYLES[mapStyle] || TILE_STYLES.default;
  const spots = useMemo(
    () =>
      Array.isArray(parkingSpots)
        ? parkingSpots.map(normalizeSpot).filter(Boolean)
        : [],
    [parkingSpots],
  );
  const initialLat = isValidCoord(centerLat) ? Number(centerLat) : Number(lat);
  const initialLng = isValidCoord(centerLng) ? Number(centerLng) : Number(lng);
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{width:100%;height:100%;margin:0;overflow:hidden}.round{border-radius:999px;border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;color:#fff;font:900 12px system-ui}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  const map=L.map('map',{zoomControl:${zoomControlsEnabled},dragging:true,scrollWheelZoom:${zoomGesturesEnabled},doubleClickZoom:${zoomGesturesEnabled},touchZoom:${zoomGesturesEnabled},boxZoom:${zoomGesturesEnabled},keyboard:${zoomGesturesEnabled},minZoom:${Number(minZoom)},maxZoom:${Number(maxZoom)}}).setView([${initialLat},${initialLng}],${Number(defaultZoom)});
  L.tileLayer(${JSON.stringify(tile.url)},{attribution:${JSON.stringify(tile.attribution)},maxZoom:${Number(maxZoom)},maxNativeZoom:${tile.maxNativeZoom}}).addTo(map);
  function roundIcon(color,label,size=34){return L.divIcon({className:'',html:'<div class="round" style="width:'+size+'px;height:'+size+'px;background:'+color+'">'+label+'</div>',iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]});}
  function sizeForZoom(z){const b=${Number(parkingMarkerBaseSize)};if(!${markerSizeByZoom})return b;if(z<=13)return Math.max(18,Math.round(b*.68));if(z<=15)return Math.max(22,Math.round(b*.82));if(z<=17)return b;if(z<=19)return Math.round(b*1.15);return Math.round(b*1.28);}
  function parkingIcon(size){const style=${JSON.stringify(parkingMarkerStyle)},color=${JSON.stringify(parkingMarkerColor)};if(style==='circle')return roundIcon(color,'P',size);if(style==='circle-stick'){const h=Math.round(size*1.5);return L.divIcon({className:'',html:'<svg width="'+size+'" height="'+h+'" viewBox="0 0 30 46" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 3px rgba(15,23,42,.25))"><line x1="15" y1="18" x2="15" y2="44" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/><circle cx="15" cy="14" r="13" fill="'+color+'" stroke="#fff" stroke-width="2"/><circle cx="19" cy="9" r="3" fill="rgba(255,255,255,.55)"/></svg>',iconSize:[size,h],iconAnchor:[size/2,h],popupAnchor:[0,-h+4]});}const h=Math.round(size*1.38);return L.divIcon({className:'',html:'<svg width="'+size+'" height="'+h+'" viewBox="0 0 42 56" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 4px rgba(15,23,42,.3))"><path d="M21 1C10.2 1 1.5 9.7 1.5 20.5C1.5 34.3 15.3 48.6 21 55C26.7 48.6 40.5 34.3 40.5 20.5C40.5 9.7 31.8 1 21 1Z" fill="'+color+'" stroke="#fff" stroke-width="2.5"/><circle cx="21" cy="20.5" r="7" fill="#fff"/></svg>',iconSize:[size,h],iconAnchor:[size/2,h],popupAnchor:[0,-h+6]});}
  L.marker([${Number(lat)},${Number(lng)}],{icon:roundIcon('#16a34a','D')}).addTo(map).bindPopup('Destino');
  ${isValidCoord(userLat) && isValidCoord(userLng) ? `L.marker([${Number(userLat)},${Number(userLng)}],{icon:roundIcon('#2563eb','U')}).addTo(map).bindPopup('Usuario');` : ""}
  ${isValidCoord(selectedLat) && isValidCoord(selectedLng) ? `L.marker([${Number(selectedLat)},${Number(selectedLng)}],{icon:roundIcon('#dc2626','X')}).addTo(map).bindPopup('Punto seleccionado');` : ""}
  const spots=${JSON.stringify(spots)};const markers=[];function draw(){markers.forEach(m=>map.removeLayer(m));markers.length=0;const icon=parkingIcon(sizeForZoom(map.getZoom()));spots.forEach(s=>{const m=L.marker([s.lat,s.lng],{icon}).addTo(map).bindPopup('<strong>'+s.alias+'</strong><br>'+s.lat.toFixed(6)+', '+s.lng.toFixed(6));markers.push(m);});}draw();map.on('zoomend',draw);
  map.on('click',e=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-press',lat:Number(e.latlng.lat),lng:Number(e.latlng.lng),latitude:Number(e.latlng.lat),longitude:Number(e.latlng.lng)})));
  </script></body></html>`;
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "map-press" && typeof onMapPress === "function")
        onMapPress(data);
    } catch (error) {
      console.warn("[StoreMapPreview.native] Mensaje inválido:", error);
    }
  };
  return (
    <WebView
      source={{ html }}
      style={{ flex: 1 }}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      originWhitelist={["*"]}
    />
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_MAP_TILE_STYLE, getMapTileConfig } from "./mapTiles";

const DEFAULT_LAT = 43.5322;
const DEFAULT_LNG = -5.6611;
const DEFAULT_ZOOM = 15;
const DEFAULT_MIN_ZOOM = 13;
const DEFAULT_MAX_ZOOM = 21;
const DEFAULT_FIT_MAX_ZOOM = 18;

function isValidCoords(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizePoint(point) {
  const lat = Number(point?.location?.lat ?? point?.lat ?? point?.latitude);
  const lng = Number(point?.location?.lng ?? point?.lng ?? point?.longitude);
  if (!isValidCoords(lat, lng)) return null;
  return { ...point, lat, lng };
}

function markerSizeForZoom(zoom, baseSize, enabled) {
  if (!enabled) return baseSize;
  if (zoom <= 13) return Math.max(18, Math.round(baseSize * 0.68));
  if (zoom <= 15) return Math.max(22, Math.round(baseSize * 0.82));
  if (zoom <= 17) return baseSize;
  if (zoom <= 19) return Math.round(baseSize * 1.15);
  return Math.round(baseSize * 1.28);
}

function createRoundIcon({ color, label, size = 34 }) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.32);display:flex;align-items:center;justify-content:center;color:#fff;font:900 ${Math.max(11, Math.round(size * 0.38))}px system-ui">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createParkingIcon({ style, color, size }) {
  if (style === "circle-stick") {
    const width = size;
    const height = Math.round(size * 1.5);
    return L.divIcon({
      className: "",
      html: `<svg width="${width}" height="${height}" viewBox="0 0 30 46" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 3px 3px rgba(15,23,42,.25))"><line x1="15" y1="18" x2="15" y2="44" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/><circle cx="15" cy="14" r="13" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="19" cy="9" r="3" fill="rgba(255,255,255,.55)"/></svg>`,
      iconSize: [width, height],
      iconAnchor: [width / 2, height],
      popupAnchor: [0, -height + 4],
    });
  }

  if (style === "circle") {
    return createRoundIcon({ color, label: "P", size });
  }

  const width = size;
  const height = Math.round(size * 1.38);
  return L.divIcon({
    className: "",
    html: `<svg width="${width}" height="${height}" viewBox="0 0 42 56" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 4px 4px rgba(15,23,42,.3))"><path d="M21 1C10.2 1 1.5 9.7 1.5 20.5C1.5 34.3 15.3 48.6 21 55C26.7 48.6 40.5 34.3 40.5 20.5C40.5 9.7 31.8 1 21 1Z" fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="21" cy="20.5" r="7" fill="#fff"/></svg>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 6],
  });
}

function MapClickHandler({ onMapPress }) {
  useMapEvents({
    click(event) {
      if (typeof onMapPress !== "function") return;
      const lat = Number(event?.latlng?.lat);
      const lng = Number(event?.latlng?.lng);
      if (!isValidCoords(lat, lng)) return;
      onMapPress({ lat, lng, latitude: lat, longitude: lng });
    },
  });
  return null;
}

function ZoomObserver({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

function MapAutoFit({ points, defaultZoom, fitMaxZoom }) {
  const map = useMap();
  const key = points
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
    .join("|");
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        map.invalidateSize(false);
        if (!points.length) return;
        if (points.length === 1) {
          map.setView([points[0].lat, points[0].lng], defaultZoom, {
            animate: false,
          });
          return;
        }
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        if (bounds.isValid())
          map.fitBounds(bounds, {
            padding: [34, 34],
            maxZoom: fitMaxZoom,
            animate: false,
          });
      } catch (error) {
        console.warn(
          "[StoreMapPreview.web] Error ajustando mapa:",
          error?.message || error,
        );
      }
    });
    return () => cancelAnimationFrame(id);
  }, [map, key, points.length, defaultZoom, fitMaxZoom]);
  return null;
}

export default function StoreMapPreview({
  lat,
  lng,
  centerLat,
  centerLng,
  userLat,
  userLng,
  parkingSpots = [],
  mapStyle = DEFAULT_MAP_TILE_STYLE,

  onMapPress,
  selectedLat,
  selectedLng,
  defaultZoom = DEFAULT_ZOOM,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  fitMaxZoom = DEFAULT_FIT_MAX_ZOOM,
  zoomControlsEnabled = true,
  zoomGesturesEnabled = false,
  preserveViewportOnMarkerChange = false,
  parkingMarkerStyle = "traditional-pin",
  parkingMarkerColor = "#ef4444",
  parkingMarkerBaseSize = 32,
  markerSizeByZoom = true,
}) {
  const [zoom, setZoom] = useState(defaultZoom);
  const destinationPoint = useMemo(
    () => normalizePoint({ lat, lng }),
    [lat, lng],
  );
  const requestedCenter = useMemo(
    () => normalizePoint({ lat: centerLat, lng: centerLng }),
    [centerLat, centerLng],
  );
  const userPoint = useMemo(
    () => normalizePoint({ lat: userLat, lng: userLng }),
    [userLat, userLng],
  );
  const selectedPoint = useMemo(
    () => normalizePoint({ lat: selectedLat, lng: selectedLng }),
    [selectedLat, selectedLng],
  );
  const parkingPoints = useMemo(
    () =>
      Array.isArray(parkingSpots)
        ? parkingSpots.map(normalizePoint).filter(Boolean)
        : [],
    [parkingSpots],
  );
  const initialCenter = requestedCenter ||
    destinationPoint ||
    userPoint ||
    selectedPoint || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  const tile = useMemo(() => getMapTileConfig(mapStyle), [mapStyle]);
  const parkingSize = markerSizeForZoom(
    zoom,
    parkingMarkerBaseSize,
    markerSizeByZoom,
  );
  const parkingIcon = useMemo(
    () =>
      createParkingIcon({
        style: parkingMarkerStyle,
        color: parkingMarkerColor,
        size: parkingSize,
      }),
    [parkingMarkerStyle, parkingMarkerColor, parkingSize],
  );
  const destinationIcon = useMemo(
    () => createRoundIcon({ color: "#16a34a", label: "D", size: 34 }),
    [],
  );
  const userIcon = useMemo(
    () => createRoundIcon({ color: "#2563eb", label: "U", size: 34 }),
    [],
  );
  const selectedIcon = useMemo(
    () => createRoundIcon({ color: "#dc2626", label: "X", size: 34 }),
    [],
  );
  const allPoints = [
    destinationPoint,
    userPoint,
    selectedPoint,
    ...parkingPoints,
  ].filter(Boolean);

  return (
    <View style={styles.container}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={defaultZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        dragging
        zoomControl={zoomControlsEnabled}
        scrollWheelZoom={zoomGesturesEnabled}
        touchZoom={zoomGesturesEnabled}
        doubleClickZoom={zoomGesturesEnabled}
        boxZoom={zoomGesturesEnabled}
        keyboard={zoomGesturesEnabled}
        style={styles.map}
      >
        <TileLayer
          key={`tiles-${tile.id}`}
          attribution={tile.attribution}
          url={tile.url}
          minZoom={minZoom}
          maxZoom={maxZoom}
          maxNativeZoom={tile.maxNativeZoom}
        />
        <MapClickHandler onMapPress={onMapPress} />
        <ZoomObserver onZoom={setZoom} />
        {!preserveViewportOnMarkerChange ? (
          <MapAutoFit
            points={allPoints}
            defaultZoom={defaultZoom}
            fitMaxZoom={fitMaxZoom}
          />
        ) : null}
        {destinationPoint ? (
          <Marker
            position={[destinationPoint.lat, destinationPoint.lng]}
            icon={destinationIcon}
          >
            <Popup>
              <strong>Destino</strong>
              <br />
              {destinationPoint.lat.toFixed(6)},{" "}
              {destinationPoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        ) : null}
        {userPoint ? (
          <Marker position={[userPoint.lat, userPoint.lng]} icon={userIcon}>
            <Popup>
              <strong>Usuario</strong>
              <br />
              {userPoint.lat.toFixed(6)}, {userPoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        ) : null}
        {selectedPoint ? (
          <Marker
            position={[selectedPoint.lat, selectedPoint.lng]}
            icon={selectedIcon}
          >
            <Popup>
              <strong>Punto seleccionado</strong>
              <br />
              {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
            </Popup>
          </Marker>
        ) : null}
        {parkingPoints.map((spot, index) => (
          <Marker
            key={spot.id || spot._id || `${spot.lat}-${spot.lng}-${index}`}
            position={[spot.lat, spot.lng]}
            icon={parkingIcon}
          >
            <Popup>
              <strong>{spot.alias || "Plaza"}</strong>
              <br />
              {spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 180, overflow: "hidden" },
  map: { width: "100%", height: "100%" },
});

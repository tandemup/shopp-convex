import React, { useMemo, useState } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import {
  createParkingMarkerIcon,
  getMarkerSizeForZoom,
} from "./parkingMarkerIcons.web";

export default function DynamicParkingMarker({
  spot,
  markerStyle = "traditional-pin",
  markerColor = "#dc2626",
  scaleByZoom = true,
  minSize = 18,
  maxSize = 38,
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const size = scaleByZoom
    ? getMarkerSizeForZoom(zoom, minSize, maxSize)
    : Math.round((minSize + maxSize) / 2);

  const icon = useMemo(
    () =>
      createParkingMarkerIcon({
        style: markerStyle,
        color: markerColor,
        size,
      }),
    [markerStyle, markerColor, size],
  );

  return (
    <Marker position={[spot.lat, spot.lng]} icon={icon}>
      <Popup>
        <strong>{spot.alias || "Plaza de aparcamiento"}</strong>
        <br />
        {spot.lat.toFixed(6)}, {spot.lng.toFixed(6)}
      </Popup>
    </Marker>
  );
}

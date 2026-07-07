// src/components/features/maps/StoreMapPreview.web.js

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

/*
 * Fix necesario en muchos proyectos React/Expo Web para que Leaflet
 * encuentre correctamente las imágenes de los marcadores.
 */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER = {
  lat: 43.5322,
  lng: -5.6611,
};

function isValidCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function buildLatLng(lat, lng) {
  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
    return null;
  }

  return [lat, lng];
}

function MapAutoFit({
  destinationLat,
  destinationLng,
  userLat,
  userLng,
  parkingSpots,
}) {
  const map = useMap();

  const points = useMemo(() => {
    const nextPoints = [];

    const destinationPoint = buildLatLng(destinationLat, destinationLng);
    const userPoint = buildLatLng(userLat, userLng);

    if (destinationPoint) {
      nextPoints.push(destinationPoint);
    }

    if (userPoint) {
      nextPoints.push(userPoint);
    }

    if (Array.isArray(parkingSpots)) {
      parkingSpots.forEach((spot) => {
        const spotPoint = buildLatLng(spot?.lat, spot?.lng);

        if (spotPoint) {
          nextPoints.push(spotPoint);
        }
      });
    }

    return nextPoints;
  }, [destinationLat, destinationLng, userLat, userLng, parkingSpots]);

  useEffect(() => {
    if (!map || points.length === 0) {
      return;
    }

    /*
     * Esperamos un frame para que Leaflet ya tenga calculado el tamaño real
     * del contenedor. Esto evita mapas desplazados o mal centrados en web.
     */
    requestAnimationFrame(() => {
      map.invalidateSize();

      if (points.length === 1) {
        map.setView(points[0], 16, {
          animate: true,
        });

        return;
      }

      const bounds = L.latLngBounds(points);

      map.fitBounds(bounds, {
        padding: [36, 36],
        maxZoom: 16,
        animate: true,
      });
    });
  }, [map, points]);

  return null;
}

function UserMarker({ lat, lng }) {
  const position = buildLatLng(lat, lng);

  if (!position) {
    return null;
  }

  return (
    <Marker
      position={position}
      title="Tu ubicación actual"
      alt="Tu ubicación actual"
    />
  );
}

function DestinationMarker({ lat, lng }) {
  const position = buildLatLng(lat, lng);

  if (!position) {
    return null;
  }

  return (
    <Marker
      position={position}
      title="Destino seleccionado"
      alt="Destino seleccionado"
    />
  );
}

function ParkingSpotMarkers({ parkingSpots }) {
  if (!Array.isArray(parkingSpots) || parkingSpots.length === 0) {
    return null;
  }

  return parkingSpots.map((spot) => {
    const position = buildLatLng(spot?.lat, spot?.lng);

    if (!position) {
      return null;
    }

    return (
      <Marker
        key={spot.id || `${spot.lat}-${spot.lng}`}
        position={position}
        title={spot.revealedBy || "Plaza disponible"}
        alt={spot.revealedBy || "Plaza disponible"}
      />
    );
  });
}

export default function StoreMapPreview({
  lat,
  lng,
  userLat,
  userLng,
  parkingSpots = [],
}) {
  const destinationPoint = buildLatLng(lat, lng);
  const userPoint = buildLatLng(userLat, userLng);

  const initialCenter = userPoint ||
    destinationPoint || [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  return (
    <View style={styles.wrapper}>
      <MapContainer
        center={initialCenter}
        zoom={15}
        scrollWheelZoom
        zoomControl={false}
        style={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="topleft" />

        <MapAutoFit
          destinationLat={lat}
          destinationLng={lng}
          userLat={userLat}
          userLng={userLng}
          parkingSpots={parkingSpots}
        />

        <DestinationMarker lat={lat} lng={lng} />
        <UserMarker lat={userLat} lng={userLng} />
        <ParkingSpotMarkers parkingSpots={parkingSpots} />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },

  map: {
    width: "100%",
    height: "100%",
  },
});

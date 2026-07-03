// utils/maps/haversineDistance.js

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine.
 * Devuelve la distancia en kilómetros.
 */
export function haversineDistance(from, to) {
  if (!from || !to) return null;

  const lat1 = from.lat;
  const lon1 = from.lng;
  const lat2 = to.lat;
  const lon2 = to.lng;

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const R = 6371; // Radio de la Tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

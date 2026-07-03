// utils/formatDistance.js

/**
 * Formatea una distancia en metros a texto legible.
 *
 * @param {number} meters
 * @returns {string}
 */
export const formatDistance = (meters) => {
  if (meters == null || isNaN(meters)) return "";

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

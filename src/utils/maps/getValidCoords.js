export function getValidCoords(store) {
  const lat = store?.location?.lat;
  const lng = store?.location?.lng;

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }

  return null;
}

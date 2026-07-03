import fs from "fs";

/* ----------------------------------
   ID hash: name + city + zipcode
---------------------------------- */
function generateStoreId({ name, city, zipcode }) {
  const input = `${name}${city}${zipcode}`.toLowerCase();

  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }

  return (hash >>> 0).toString(36).slice(0, 8);
}

/* ----------------------------------
   Location normalizer
---------------------------------- */
function normalizeLocation(location) {
  if (!location) return null;

  // legacy format
  if (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  ) {
    return {
      lat: location.latitude,
      lng: location.longitude,
      source: "manual",
    };
  }

  // already normalized
  if (typeof location.lat === "number" && typeof location.lng === "number") {
    return {
      lat: location.lat,
      lng: location.lng,
      source: location.source ?? "manual",
    };
  }

  return null;
}

/* ----------------------------------
   Run
---------------------------------- */
const stores = JSON.parse(fs.readFileSync("stores.json", "utf8"));

const updated = stores.map((store) => ({
  ...store,
  id: generateStoreId(store),
  location: normalizeLocation(store.location),
}));

fs.writeFileSync("stores.json", JSON.stringify(updated, null, 2));
console.log("✅ IDs y location normalizados correctamente");

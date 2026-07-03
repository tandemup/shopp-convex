import { getItem, setItem } from "../storage";
import { getDistanceKm, distanceMetersBetween } from "../math/distance";

const KEY = "stores_distance_cache";

export const getCachedStoreDistance = async (storeId) => {
  const cache = (await getItem(KEY)) || {};
  return cache[storeId] ?? null;
};

export const setCachedStoreDistance = async (storeId, distanceKm) => {
  const cache = (await getItem(KEY)) || {};
  cache[storeId] = distanceKm;
  await setItem(KEY, cache);
};

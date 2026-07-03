import { useEffect, useMemo, useState } from "react";
import { useStores } from "@/src/context/StoresContext";
import {
  getCurrentLocation,
  haversineDistance,
} from "@/src/utils/helpers/locationHelpers";
import {
  loadStoresDistance,
  saveStoresDistance,
} from "@/src/utils/helpers/storesDistanceCache";

export function useStoresWithDistance() {
  const { stores, ready } = useStores();

  const [sortedStores, setSortedStores] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  const storesSignature = useMemo(() => {
    return stores.map((store) => store.id).join("|");
  }, [stores]);

  useEffect(() => {
    if (!ready) return;

    init();
  }, [ready, storesSignature]);

  const init = async () => {
    setLoading(true);

    if (!Array.isArray(stores) || stores.length === 0) {
      setSortedStores([]);
      setUserLocation(null);
      setHasLocation(false);
      setLoading(false);
      return;
    }

    try {
      const cached = await loadStoresDistance();

      if (cached?.stores && Array.isArray(cached.stores)) {
        const cachedIds = cached.stores.map((store) => store.id).join("|");

        if (cachedIds === storesSignature) {
          setSortedStores(cached.stores);
          setUserLocation(cached.userLocation || null);
          setHasLocation(Boolean(cached.userLocation));
          setLoading(false);
          return;
        }
      }

      const location = await getCurrentLocation();

      if (!location) {
        setSortedStores(stores);
        setUserLocation(null);
        setHasLocation(false);
        setLoading(false);
        return;
      }

      const updated = stores
        .map((store) => ({
          ...store,
          distance: haversineDistance(location, store.location),
        }))
        .sort((a, b) => a.distance - b.distance);

      await saveStoresDistance({
        userLocation: location,
        stores: updated,
      });

      setSortedStores(updated);
      setUserLocation(location);
      setHasLocation(true);
    } catch (error) {
      console.warn("Error loading stores with distance", error);
      setSortedStores(stores);
      setUserLocation(null);
      setHasLocation(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    sortedStores,
    userLocation,
    hasLocation,
    loading,
  };
}

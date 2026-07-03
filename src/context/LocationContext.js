/**
 * LocationContext
 *
 * Contexto encargado de gestionar la localización del usuario.
 * Proporciona coordenadas actuales y utilidades relacionadas con la ubicación,
 * utilizadas principalmente para calcular distancias y buscar tiendas cercanas.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizePosition = useCallback((pos) => {
    if (!pos?.coords) return null;

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }, []);

  const getCurrentLocation = useCallback(async () => {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const nextLocation = normalizePosition(pos);
    setLocation(nextLocation);
    return nextLocation;
  }, [normalizePosition]);

  const refreshLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === "web") {
        setLoading(false);
        return null;
      }

      const currentPermission = await Location.getForegroundPermissionsAsync();

      setPermission(currentPermission);

      if (!currentPermission.granted) {
        setError("Permiso de ubicación no concedido");
        return null;
      }

      return await getCurrentLocation();
    } catch (e) {
      const message = e?.message || "No se pudo obtener la ubicación actual";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation]);

  const requestLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === "web") {
        setError(
          "En web, solicita la ubicación desde la pantalla de permisos o desde el navegador.",
        );
        return null;
      }

      const nextPermission = await Location.requestForegroundPermissionsAsync();

      setPermission(nextPermission);

      if (!nextPermission.granted) {
        setError("Permiso de ubicación denegado");
        return null;
      }

      return await getCurrentLocation();
    } catch (e) {
      const message = e?.message || "No se pudo solicitar la ubicación";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation]);

  useEffect(() => {
    let mounted = true;

    const checkInitialPermission = async () => {
      try {
        setLoading(true);
        setError(null);

        if (Platform.OS === "web") {
          if (mounted) {
            setPermission({
              granted: false,
              status: "undetermined",
              canAskAgain: true,
            });
            setLoading(false);
          }

          return;
        }

        const currentPermission =
          await Location.getForegroundPermissionsAsync();

        if (!mounted) return;

        setPermission(currentPermission);

        if (!currentPermission.granted) {
          setError("Permiso de ubicación no concedido");
          setLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        setLocation(normalizePosition(pos));
      } catch (e) {
        if (!mounted) return;

        const message = e?.message || "No se pudo comprobar la ubicación";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkInitialPermission();

    return () => {
      mounted = false;
    };
  }, [normalizePosition]);

  const value = useMemo(
    () => ({
      location,
      permission,
      loading,
      error,
      refreshLocation,
      requestLocation,
      clearLocationError: () => setError(null),
    }),
    [location, permission, loading, error, refreshLocation, requestLocation],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);

  if (!ctx) {
    throw new Error("useLocation debe usarse dentro de LocationProvider");
  }

  return ctx;
}

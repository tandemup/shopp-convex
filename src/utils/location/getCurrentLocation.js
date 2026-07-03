// utils/location/getCurrentLocation.js
import * as Location from "expo-location";

/**
 * Obtiene la ubicación actual del usuario.
 * Devuelve { lat, lng } o null si no está disponible.
 */
export async function getCurrentLocation() {
  try {
    // 1️⃣ Pedir permisos
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Location permission not granted");
      return null;
    }

    // 2️⃣ Obtener ubicación (usa cache del sistema si existe)
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (!location?.coords) return null;

    const { latitude, longitude } = location.coords;

    // 3️⃣ Normalizar al formato estándar
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return null;
    }

    return {
      lat: latitude,
      lng: longitude,
    };
  } catch (err) {
    console.warn("getCurrentLocation error:", err);
    return null;
  }
}

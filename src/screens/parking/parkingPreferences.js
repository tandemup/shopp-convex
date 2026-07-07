import AsyncStorage from "@react-native-async-storage/async-storage";

export const PARKING_PREFERENCES_KEY = "shopp_parking_preferences_v1";

export const DEFAULT_PARKING_CITY = "gijon";
export const DEFAULT_PARKING_DESTINATION = "palacio-deportes";
export const DEFAULT_PARKING_ALIAS = "anonymous";

function normalizeAlias(value) {
  const alias = String(value || "").trim();
  return alias || DEFAULT_PARKING_ALIAS;
}

export async function loadParkingPreferences() {
  try {
    const rawValue = await AsyncStorage.getItem(PARKING_PREFERENCES_KEY);

    if (!rawValue) {
      return {
        activeDestination: DEFAULT_PARKING_DESTINATION,
        parkingAlias: DEFAULT_PARKING_ALIAS,
      };
    }

    const parsedValue = JSON.parse(rawValue);

    // Compatibilidad con versiones anteriores: antes se guardaba como activeUserId.
    const alias = parsedValue?.parkingAlias || parsedValue?.activeUserId;

    return {
      activeDestination:
        parsedValue?.activeDestination || DEFAULT_PARKING_DESTINATION,
      parkingAlias: normalizeAlias(alias),
    };
  } catch (error) {
    console.error("Error cargando preferencias de parking:", error);

    return {
      activeDestination: DEFAULT_PARKING_DESTINATION,
      parkingAlias: DEFAULT_PARKING_ALIAS,
    };
  }
}

export async function saveParkingPreferences({
  activeDestination,
  parkingAlias,
  activeUserId,
}) {
  const cleanAlias = normalizeAlias(parkingAlias || activeUserId);

  try {
    const cleanPreferences = {
      activeDestination: activeDestination || DEFAULT_PARKING_DESTINATION,
      parkingAlias: cleanAlias,
    };

    await AsyncStorage.setItem(
      PARKING_PREFERENCES_KEY,
      JSON.stringify(cleanPreferences),
    );

    return cleanPreferences;
  } catch (error) {
    console.error("Error guardando preferencias de parking:", error);

    return {
      activeDestination: activeDestination || DEFAULT_PARKING_DESTINATION,
      parkingAlias: cleanAlias,
    };
  }
}

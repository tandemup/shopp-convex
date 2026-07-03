import AsyncStorage from "@react-native-async-storage/async-storage";

export const PARKING_PREFERENCES_KEY = "shopp_parking_preferences_v1";

export const DEFAULT_PARKING_CITY = "gijon";
export const DEFAULT_PARKING_DESTINATION = "palacio-deportes";
export const DEFAULT_PARKING_USER_ID = "anonymous";

export async function loadParkingPreferences() {
  try {
    const rawValue = await AsyncStorage.getItem(PARKING_PREFERENCES_KEY);

    if (!rawValue) {
      return {
        activeDestination: DEFAULT_PARKING_DESTINATION,
        activeUserId: DEFAULT_PARKING_USER_ID,
      };
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      activeDestination:
        parsedValue?.activeDestination || DEFAULT_PARKING_DESTINATION,
      activeUserId: parsedValue?.activeUserId || DEFAULT_PARKING_USER_ID,
    };
  } catch (error) {
    console.error("Error cargando preferencias de parking:", error);

    return {
      activeDestination: DEFAULT_PARKING_DESTINATION,
      activeUserId: DEFAULT_PARKING_USER_ID,
    };
  }
}

export async function saveParkingPreferences({
  activeDestination,
  activeUserId,
}) {
  try {
    const cleanPreferences = {
      activeDestination: activeDestination || DEFAULT_PARKING_DESTINATION,
      activeUserId: activeUserId?.trim() || DEFAULT_PARKING_USER_ID,
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
      activeUserId: activeUserId?.trim() || DEFAULT_PARKING_USER_ID,
    };
  }
}

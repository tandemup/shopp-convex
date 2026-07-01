import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocation } from "@/context/LocationContext";
import StoreMapPreview from "@/components/features/maps/StoreMapPreview";
import { ROUTES } from "@/navigation/ROUTES";
import {
  DEFAULT_PARKING_DESTINATION,
  DEFAULT_PARKING_USER_ID,
  loadParkingPreferences,
  saveParkingPreferences,
} from "@/utils/parkingPreferences";

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const DEFAULT_CITY = "gijon";
const DEFAULT_DESTINATION = "palacio-deportes";
const DEFAULT_USER_ID = "anonymous";

const DESTINATION_OPTIONS = [
  {
    id: "palacio-deportes",
    label: "Palacio de los Deportes",
    category: "Deporte",
    address: "Paseo del Doctor Fleming, 929, 33203 Gijón, Asturias",
    latitude: 43.53502,
    longitude: -5.63586,
  },
  {
    id: "el-corte-ingles",
    label: "El Corte Inglés",
    category: "Centro comercial",
    address: "C/ Ramón Areces, 2, 33211 Gijón, Asturias",
    latitude: 43.5361,
    longitude: -5.6844,
  },
  {
    id: "los-fresnos",
    label: "C.C. Los Fresnos",
    category: "Centro comercial",
    address: "C. Río de Oro, 3, Centro, 33209 Gijón, Asturias",
    latitude: 43.5321,
    longitude: -5.6619,
  },
  {
    id: "el-molinon",
    label: "El Molinón",
    category: "Estadio",
    address: "C/ Luis Adaro Falcó, 33203 Gijón, Asturias",
    latitude: 43.536329,
    longitude: -5.637417,
  },
  {
    id: "hospital-cabuenes",
    label: "Hospital de Cabueñes",
    category: "Hospital",
    address: "Calle Los Prados, 395, 33203 Gijón, Asturias",
    latitude: 43.525186,
    longitude: -5.606614,
  },
  {
    id: "playa-san-lorenzo",
    label: "Playa de San Lorenzo",
    category: "Ocio",
    address: "Avda. Rufo García Rendueles, Paseo Marítimo, Gijón, Asturias",
    latitude: 43.541062,
    longitude: -5.650062,
  },
  {
    id: "nuevayork",
    label: "New York",
    category: "City",
    address: "",
    latitude: 40.712778,
    longitude: -74.006111,
  },
];

export default function ParkingSettingsScreen({ navigation, route }) {
  const [selectedDestination, setSelectedDestination] = useState(
    route?.params?.activeDestination || DEFAULT_PARKING_DESTINATION,
  );

  const [draftUserId, setDraftUserId] = useState(
    route?.params?.activeUserId || DEFAULT_PARKING_USER_ID,
  );

  const { location } = useLocation();

  const touchParkingPresence = useMutation(api.parking.touchParkingPresence);

  const userCoords =
    location?.lat != null && location?.lng != null
      ? {
          lat: location.lat,
          lng: location.lng,
        }
      : null;

  const activeDestinationData = useMemo(() => {
    return (
      DESTINATION_OPTIONS.find((destination) => {
        return destination.id === selectedDestination;
      }) || DESTINATION_OPTIONS[0]
    );
  }, [selectedDestination]);

  const activeParkingSpotsResult = useQuery(
    api.parking.listActiveParkingSpots,
    {
      city: DEFAULT_CITY,
      zone: selectedDestination,
      limit: 20,
    },
  );

  const destinationPresenceResult = useQuery(
    api.parking.listDestinationPresence,
    {
      city: DEFAULT_CITY,
      zone: selectedDestination,
      limit: 50,
    },
  );

  const activeParkingSpots = Array.isArray(activeParkingSpotsResult)
    ? activeParkingSpotsResult
    : [];

  const destinationPresence = Array.isArray(destinationPresenceResult)
    ? destinationPresenceResult
    : [];

  const cleanDraftUserId = draftUserId.trim() || DEFAULT_USER_ID;

  const activeFriendsCount = destinationPresence.filter((item) => {
    return item.userId !== cleanDraftUserId;
  }).length;

  const mapCenter = {
    lat: activeDestinationData?.latitude || 43.5453,
    lng: activeDestinationData?.longitude || -5.6615,
  };

  function getTrafficLevel(activeUsersCount) {
    if (activeUsersCount <= 0) {
      return {
        label: "Sin actividad",
        advice: "No hay señales de congestión colaborativa.",
      };
    }

    if (activeUsersCount <= 2) {
      return {
        label: "Tráfico bajo",
        advice: "Parece razonable ir ahora.",
      };
    }

    if (activeUsersCount <= 5) {
      return {
        label: "Tráfico medio",
        advice: "Puede haber más competencia por aparcar.",
      };
    }

    return {
      label: "Tráfico alto",
      advice: "Quizá conviene esperar o elegir otro destino.",
    };
  }

  const trafficInfo = getTrafficLevel(activeFriendsCount);

  async function handleSave() {
    const cleanUserId = draftUserId.trim() || DEFAULT_PARKING_USER_ID;

    const nextSettings = {
      userId: cleanUserId,
      destinationId: selectedDestination,
      destinationName: activeDestinationData.label,
      destinationAddress: activeDestinationData.address,
      destinationLatitude: activeDestinationData.latitude,
      destinationLongitude: activeDestinationData.longitude,
      customDestination: "",
    };

    await AsyncStorage.setItem(
      PARKING_SETTINGS_STORAGE_KEY,
      JSON.stringify(nextSettings),
    );

    await saveParkingPreferences({
      activeDestination: selectedDestination,
      activeUserId: cleanUserId,
    });

    await touchParkingPresence({
      city: "gijon",
      zone: selectedDestination,
      userId: cleanUserId,
      status: "heading",
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      locationSource: "destination",
    });

    navigation.navigate(ROUTES.PARKING_SCREEN, {
      activeDestination: selectedDestination,
      activeUserId: cleanUserId,
    });
  }
  function formatSpotTimeLeft(expiresAt) {
    if (!expiresAt) {
      return "";
    }

    const diff = expiresAt - Date.now();

    if (diff <= 0) {
      return "expirada";
    }

    const minutes = Math.max(1, Math.ceil(diff / 60000));

    if (minutes === 1) {
      return "válida 1 min";
    }

    return `válida ${minutes} min`;
  }

  function renderDestinationButton(destination) {
    const selected = destination.id === selectedDestination;

    return (
      <Pressable
        key={destination.id}
        onPress={() => setSelectedDestination(destination.id)}
        style={({ pressed }) => [
          styles.destinationButton,
          selected && styles.destinationButtonSelected,
          pressed && styles.selectorButtonPressed,
        ]}
      >
        <View style={styles.destinationButtonIcon}>
          <Ionicons
            name={selected ? "navigate-circle" : "navigate-circle-outline"}
            size={20}
            color={selected ? "#ffffff" : "#15803d"}
          />
        </View>

        <View style={styles.destinationButtonTextBlock}>
          <Text
            style={[
              styles.destinationButtonText,
              selected && styles.destinationButtonTextSelected,
            ]}
          >
            {destination.label}
          </Text>

          <Text
            style={[
              styles.destinationButtonMeta,
              selected && styles.destinationButtonMetaSelected,
            ]}
          >
            {destination.category}
          </Text>

          <Text
            style={[
              styles.destinationAddress,
              selected && styles.destinationAddressSelected,
            ]}
            numberOfLines={2}
          >
            {destination.address}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderActiveSpots() {
    if (!activeParkingSpots.length) {
      return (
        <View style={styles.freeSpotsEmpty}>
          <Ionicons name="leaf-outline" size={18} color="#6b7280" />

          <Text style={styles.freeSpotsEmptyText}>
            No hay plazas libres reveladas ahora mismo.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.freeSpotsBlock}>
        <Text style={styles.freeSpotsTitle}>Plazas libres reveladas</Text>

        {activeParkingSpots.map((spot) => {
          return (
            <View key={spot._id} style={styles.freeSpotRow}>
              <View style={styles.freeSpotBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#15803d" />

                <View style={styles.freeSpotTextBlock}>
                  <Text style={styles.freeSpotTitle}>
                    Libre · {formatSpotTimeLeft(spot.expiresAt)}
                  </Text>

                  <Text style={styles.freeSpotCoords}>
                    {Number.isFinite(spot.lat) ? spot.lat.toFixed(5) : "-"},{" "}
                    {Number.isFinite(spot.lng) ? spot.lng.toFixed(5) : "-"}
                  </Text>
                </View>
              </View>

              <Text style={styles.freeSpotMeta}>
                Avisó: {spot.revealedBy || "anonymous"}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateSettings() {
      const preferences = await loadParkingPreferences();

      if (!isMounted) {
        return;
      }

      if (!route?.params?.activeDestination) {
        setSelectedDestination(preferences.activeDestination);
      }

      if (!route?.params?.activeUserId) {
        setDraftUserId(preferences.activeUserId);
      }
    }

    hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, [route?.params?.activeDestination, route?.params?.activeUserId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenShell}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#14532d" />

              <Text style={styles.backButtonText}>Parking</Text>
            </Pressable>

            <Text style={styles.title}>Ajustes</Text>

            <Text style={styles.subtitle}>
              Elige destino y revisa las plazas recientes antes de volver al
              chat.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Destino</Text>

              <View style={styles.destinationGrid}>
                {DESTINATION_OPTIONS.map(renderDestinationButton)}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>User ID</Text>

              <TextInput
                value={draftUserId}
                onChangeText={setDraftUserId}
                placeholder="anonymous"
                placeholderTextColor="#888"
                style={styles.usernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
              />
            </View>

            <View style={styles.trafficCard}>
              <View style={styles.trafficIcon}>
                <Ionicons name="people-outline" size={22} color="#14532d" />
              </View>

              <View style={styles.trafficTextBlock}>
                <Text style={styles.trafficTitle}>
                  {activeFriendsCount} amigos activos en este destino
                </Text>

                <Text style={styles.trafficLabel}>{trafficInfo.label}</Text>

                <Text style={styles.trafficAdvice}>{trafficInfo.advice}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.mapHeader}>
                <View style={styles.mapTitleBlock}>
                  <Text style={styles.mapTitle}>Aparcamientos recientes</Text>

                  <Text style={styles.mapSubtitle}>
                    {activeDestinationData.label}
                  </Text>

                  <Text style={styles.mapAddress} numberOfLines={2}>
                    {activeDestinationData.address}
                  </Text>
                </View>
              </View>

              <View style={styles.mapContainer}>
                <StoreMapPreview
                  key={`parking-settings-map-${selectedDestination}-${mapCenter.lat}-${mapCenter.lng}`}
                  lat={mapCenter.lat}
                  lng={mapCenter.lng}
                  userLat={userCoords?.lat}
                  userLng={userCoords?.lng}
                  parkingSpots={activeParkingSpots}
                />
              </View>

              {renderActiveSpots()}
            </View>

            <Text style={styles.roomHint}>
              Canal: parking · destino: {selectedDestination}
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.footerButtonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.footerButtonPressed,
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />

              <Text style={styles.saveButtonText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e9e9e9",
  },

  screenShell: {
    flex: 1,
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: Platform.OS === "web" ? 16 : 0,
    paddingVertical: Platform.OS === "web" ? 16 : 0,
    backgroundColor: Platform.OS === "web" ? "#e9e9e9" : "#f8fafc",
  },

  container: {
    flex: 1,
    width: Platform.OS === "web" ? "100%" : undefined,
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    maxHeight: Platform.OS === "web" ? 860 : undefined,
    borderRadius: Platform.OS === "web" ? 26 : 0,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 10,
    minHeight: 34,
    paddingRight: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },

  backButtonPressed: {
    opacity: 0.75,
  },

  backButtonText: {
    color: "#14532d",
    fontSize: 14,
    fontWeight: "900",
  },

  title: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 14,
    paddingBottom: 24,
    gap: 14,
  },

  card: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 10,
  },

  fieldLabel: {
    color: "#14532d",
    fontSize: 13,
    fontWeight: "800",
  },

  selectorButtonPressed: {
    opacity: 0.75,
  },

  destinationGrid: {
    gap: 8,
  },

  destinationButton: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  destinationButtonSelected: {
    borderColor: "#15803d",
    backgroundColor: "#14532d",
  },

  destinationButtonIcon: {
    width: 28,
    alignItems: "center",
  },

  destinationButtonTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  destinationButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  destinationButtonTextSelected: {
    color: "#ffffff",
  },

  destinationButtonMeta: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "800",
  },

  destinationButtonMetaSelected: {
    color: "#dcfce7",
  },

  destinationAddress: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },

  destinationAddressSelected: {
    color: "#f0fdf4",
  },

  usernameInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 15,
  },

  trafficCard: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#86efac",
    flexDirection: "row",
    gap: 10,
  },

  trafficIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  trafficTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  trafficTitle: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "900",
  },

  trafficLabel: {
    marginTop: 2,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  trafficAdvice: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  mapHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  mapTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  mapTitle: {
    color: "#14532d",
    fontSize: 17,
    fontWeight: "900",
  },

  mapSubtitle: {
    marginTop: 2,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  mapAddress: {
    marginTop: 3,
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  mapContainer: {
    height: 240,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },

  freeSpotsBlock: {
    marginTop: 2,
    gap: 8,
  },

  freeSpotsTitle: {
    color: "#14532d",
    fontSize: 14,
    fontWeight: "900",
  },

  freeSpotRow: {
    gap: 4,
  },

  freeSpotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  freeSpotTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  freeSpotTitle: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "900",
  },

  freeSpotCoords: {
    marginTop: 2,
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "800",
  },

  freeSpotMeta: {
    marginLeft: 4,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
  },

  freeSpotsEmpty: {
    marginTop: 2,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  freeSpotsEmptyText: {
    flex: 1,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  roomHint: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "900",
  },

  saveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  footerButtonPressed: {
    opacity: 0.8,
  },
});

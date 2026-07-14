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
import { useLocation } from "@/src/context/LocationContext";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";
import { ROUTES } from "@/src/navigation/ROUTES";
import {
  DEFAULT_PARKING_DESTINATION,
  DEFAULT_PARKING_ALIAS,
  loadParkingPreferences,
  saveParkingPreferences,
} from "@/src/screens/parking/parkingPreferences";

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const DEFAULT_CITY = "gijon";
const DEFAULT_DESTINATION = "palacio-deportes";

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
    id: "iglesia-san-julian",
    label: "Iglesia de San Julian",
    category: "Iglesia",
    address:
      "Iglesia de San Julián de Somió, Av. Dionisio Cifuentes, 19, Periurbano - Rural, 33203 Gijón, Asturias",
    latitude: 43.535538,
    longitude: -5.62342,
  },
];

const CABUENES_TEST_SPOTS = [
  {
    id: "cabuenes-test-01",
    alias: "Cabueñes prueba 01",
    location: { lat: 43.525374, lng: -5.607285, accuracy: 5, source: "test" },
  },
  {
    id: "cabuenes-test-02",
    alias: "Cabueñes prueba 02",
    location: { lat: 43.525733, lng: -5.606851, accuracy: 6, source: "test" },
  },
  {
    id: "cabuenes-test-03",
    alias: "Cabueñes prueba 03",
    location: { lat: 43.525958, lng: -5.606294, accuracy: 4, source: "test" },
  },
  {
    id: "cabuenes-test-04",
    alias: "Cabueñes prueba 04",
    location: { lat: 43.525823, lng: -5.605612, accuracy: 7, source: "test" },
  },
  {
    id: "cabuenes-test-05",
    alias: "Cabueñes prueba 05",
    location: { lat: 43.525464, lng: -5.605117, accuracy: 5, source: "test" },
  },
  {
    id: "cabuenes-test-06",
    alias: "Cabueñes prueba 06",
    location: { lat: 43.52497, lng: -5.604745, accuracy: 8, source: "test" },
  },
  {
    id: "cabuenes-test-07",
    alias: "Cabueñes prueba 07",
    location: { lat: 43.524476, lng: -5.605055, accuracy: 6, source: "test" },
  },
  {
    id: "cabuenes-test-08",
    alias: "Cabueñes prueba 08",
    location: { lat: 43.524116, lng: -5.605612, accuracy: 5, source: "test" },
  },
  {
    id: "cabuenes-test-09",
    alias: "Cabueñes prueba 09",
    location: { lat: 43.523892, lng: -5.606232, accuracy: 7, source: "test" },
  },
  {
    id: "cabuenes-test-10",
    alias: "Cabueñes prueba 10",
    location: { lat: 43.524072, lng: -5.606913, accuracy: 4, source: "test" },
  },
  {
    id: "cabuenes-test-11",
    alias: "Cabueñes prueba 11",
    location: { lat: 43.524521, lng: -5.607471, accuracy: 6, source: "test" },
  },
  {
    id: "cabuenes-test-12",
    alias: "Cabueñes prueba 12",
    location: { lat: 43.525015, lng: -5.607719, accuracy: 5, source: "test" },
  },
];

function normalizeParkingSpotForMap(spot) {
  const lat = spot?.location?.lat ?? spot?.lat;
  const lng = spot?.location?.lng ?? spot?.lng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    ...spot,
    _id: spot?._id || spot?.id,
    id: spot?.id || String(spot?._id || ""),
    lat,
    lng,
    accuracy: spot?.location?.accuracy ?? spot?.accuracy ?? null,
    locationSource: spot?.location?.source ?? spot?.locationSource ?? "unknown",
  };
}

function blurActiveElement() {
  if (Platform.OS !== "web") return;

  if (
    typeof document !== "undefined" &&
    document.activeElement &&
    typeof document.activeElement.blur === "function"
  ) {
    document.activeElement.blur();
  }
}

export default function ParkingSettingsScreen({ navigation, route }) {
  const [selectedDestination, setSelectedDestination] = useState(
    route?.params?.activeDestination || DEFAULT_PARKING_DESTINATION,
  );
  const [destinationPickerVisible, setDestinationPickerVisible] =
    useState(false);
  const [draftParkingAlias, setDraftParkingAlias] = useState(
    route?.params?.activeParkingAlias ||
      route?.params?.activeUserId ||
      DEFAULT_PARKING_ALIAS,
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

  const activeParkingSpots = useMemo(() => {
    const spots = Array.isArray(activeParkingSpotsResult)
      ? activeParkingSpotsResult
      : [];

    return spots.map(normalizeParkingSpotForMap).filter(Boolean);
  }, [activeParkingSpotsResult]);

  const cabuenesTestParkingSpots = useMemo(() => {
    if (selectedDestination !== "hospital-cabuenes") {
      return [];
    }

    return CABUENES_TEST_SPOTS.map((spot) =>
      normalizeParkingSpotForMap({
        ...spot,
        _id: spot.id,
        city: DEFAULT_CITY,
        zone: "hospital-cabuenes",
        status: "free",
        isTest: true,
        testGroup: "cabuenes-test",
        ownerAlias: "Pruebas Cabueñes",
        parkingAlias: "cabuenes-test",
        destinationName: "Hospital de Cabueñes",
      }),
    ).filter(Boolean);
  }, [selectedDestination]);

  const destinationPresence = Array.isArray(destinationPresenceResult)
    ? destinationPresenceResult
    : [];

  const activeFriendsCount = destinationPresence.filter((item) => {
    return item.isOwnUser !== true;
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
    blurActiveElement();

    const cleanParkingAlias = draftParkingAlias.trim() || DEFAULT_PARKING_ALIAS;

    const nextSettings = {
      parkingAlias: cleanParkingAlias,
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
      parkingAlias: cleanParkingAlias,
    });

    await touchParkingPresence({
      city: "gijon",
      zone: selectedDestination,
      alias: cleanParkingAlias,
      status: "heading",
      lat: userCoords?.lat,
      lng: userCoords?.lng,
      locationSource: userCoords ? "gps" : "settings",
    });

    navigation.navigate(ROUTES.PARKING_SCREEN, {
      activeDestination: selectedDestination,
      parkingAlias: cleanParkingAlias,
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
        onPress={() => {
          blurActiveElement();
          setSelectedDestination(destination.id);
          setDestinationPickerVisible(false);
        }}
        style={({ pressed }) => [
          styles.destinationButton,
          selected && styles.destinationButtonSelected,
          pressed && styles.selectorButtonPressed,
        ]}
      >
        <View style={styles.destinationButtonIcon}>
          <Ionicons
            name={selected ? "checkmark-circle" : "navigate-circle-outline"}
            size={22}
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
            {destination.address || "Sin dirección definida"}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderSelectedDestinationCard() {
    return (
      <View style={styles.selectedDestinationCard}>
        <View style={styles.selectedDestinationIcon}>
          <Ionicons name="navigate-circle" size={24} color="#15803d" />
        </View>

        <View style={styles.selectedDestinationTextBlock}>
          <Text style={styles.selectedDestinationLabel}>
            {activeDestinationData.label}
          </Text>

          <Text style={styles.selectedDestinationCategory}>
            {activeDestinationData.category}
          </Text>

          <Text style={styles.selectedDestinationAddress} numberOfLines={2}>
            {activeDestinationData.address || "Sin dirección definida"}
          </Text>
        </View>
      </View>
    );
  }

  function renderDestinationPickerScreen() {
    if (!destinationPickerVisible) {
      return null;
    }

    return (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Pressable
              onPress={() => {
                blurActiveElement();
                setDestinationPickerVisible(false);
              }}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#14532d" />
              <Text style={styles.backButtonText}>Ajustes</Text>
            </Pressable>

            <Text style={styles.pickerTitle}>Elegir destino</Text>

            <Text style={styles.pickerSubtitle}>
              Selecciona el lugar al que vas para revisar actividad y plazas
              recientes.
            </Text>
          </View>

          <ScrollView
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {DESTINATION_OPTIONS.map(renderDestinationButton)}
          </ScrollView>
        </View>
      </View>
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

      if (!route?.params?.activeParkingAlias && !route?.params?.activeUserId) {
        setDraftParkingAlias(preferences.parkingAlias);
      }
    }

    hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, [
    route?.params?.activeDestination,
    route?.params?.activeParkingAlias,
    route?.params?.activeUserId,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenShell}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                blurActiveElement();
                navigation.goBack();
              }}
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
              <View style={styles.destinationHeader}>
                <Text style={styles.fieldLabel}>Destino</Text>

                <Pressable
                  onPress={() => {
                    blurActiveElement();
                    setDestinationPickerVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.changeDestinationButton,
                    pressed && styles.selectorButtonPressed,
                  ]}
                >
                  <Text style={styles.changeDestinationButtonText}>
                    Cambiar
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#15803d" />
                </Pressable>
              </View>

              {renderSelectedDestinationCard()}
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Alias público</Text>

              <TextInput
                value={draftParkingAlias}
                onChangeText={setDraftParkingAlias}
                placeholder="Ej. 4104-BZG"
                placeholderTextColor="#888"
                style={styles.usernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
              />

              <Text style={styles.fieldHelp}>
                Este alias se muestra a otros usuarios. El identificador real de
                Convex Auth queda oculto y solo se usa internamente.
              </Text>
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

            {selectedDestination === "hospital-cabuenes" ? (
              <View style={styles.card}>
                <View style={styles.mapHeader}>
                  <View style={styles.mapTitleBlock}>
                    <Text style={styles.mapTitle}>parkingSpots de prueba</Text>

                    <Text style={styles.mapSubtitle}>Hospital de Cabueñes</Text>

                    <Text style={styles.mapAddress} numberOfLines={2}>
                      {cabuenesTestParkingSpots.length} muestras sintéticas para
                      comprobar marcadores, encuadre y proximidad. No
                      representan plazas reales.
                    </Text>
                  </View>
                </View>

                <View style={styles.mapContainer}>
                  <StoreMapPreview
                    key={`parking-settings-test-map-cabuenes-${cabuenesTestParkingSpots.length}`}
                    lat={43.525186}
                    lng={-5.606614}
                    userLat={userCoords?.lat}
                    userLng={userCoords?.lng}
                    parkingSpots={cabuenesTestParkingSpots}
                  />
                </View>

                <View style={styles.testSpotsSummary}>
                  <Ionicons name="flask-outline" size={17} color="#1d4ed8" />
                  <Text style={styles.testSpotsSummaryText}>
                    Marcadores locales de prueba · source: test · grupo:
                    cabuenes-test
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.roomHint}>
              Canal: parking · destino: {selectedDestination}
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                blurActiveElement();
                navigation.goBack();
              }}
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
      {renderDestinationPickerScreen()}
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

  fieldHelp: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
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

  testSpotsSummary: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  testSpotsSummaryText: {
    flex: 1,
    color: "#1e3a8a",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
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

  destinationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  changeDestinationButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  changeDestinationButtonText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "900",
  },

  selectedDestinationCard: {
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  selectedDestinationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDestinationTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  selectedDestinationLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },

  selectedDestinationCategory: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
  },

  selectedDestinationAddress: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f8fafc",
    zIndex: 50,
  },

  pickerContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  pickerHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },

  pickerTitle: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "900",
  },

  pickerSubtitle: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  pickerScroll: {
    flex: 1,
  },

  pickerScrollContent: {
    padding: 14,
    paddingBottom: 32,
    gap: 10,
  },
});

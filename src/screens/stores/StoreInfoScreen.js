import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

export default function StoreInfoScreen() {
  const navigation = useNavigation();

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Información de tiendas",
        preset: "light",
      }),
    [],
  );

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.content}>
          <View style={styles.iconBox}>
            <Ionicons
              name="information-circle-outline"
              size={34}
              color="#111827"
            />
          </View>

          <Text style={styles.title}>Información de tiendas</Text>

          <Text style={styles.subtitle}>
            Aquí podrás consultar información general de las tiendas: horarios,
            direcciones, estado, favoritos y datos relacionados con tiendas
            cercanas.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado actual</Text>

            <Text style={styles.cardText}>
              La información de tiendas se obtiene de los datos locales de la
              aplicación. Más adelante puedes conectar esta pantalla con una
              ficha detallada, mapas o datos remotos.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },
});

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import LogoutButton from "@/src/screens/auth/LogoutButton";

function getGrantedPermissionMessage() {
  if (Platform.OS === "web") {
    return "El permiso ya está concedido. Para volver a preguntar, revócalo desde los permisos del sitio: pulsa el icono junto a la URL, cambia el permiso a bloquear o preguntar, y recarga la página.";
  }

  return "El permiso ya está concedido. Android/iOS no permiten anularlo desde la app para volver a mostrar el diálogo del sistema. Puedes revocarlo manualmente desde Ajustes y después volver a tocar esta opción.";
}

async function handlePermissionPress(permission, requestPermission, label) {
  if (permission?.granted) {
    safeAlert(
      `${label} concedido`,
      getGrantedPermissionMessage(),
      getOpenSettingsButtons(),
    );
    return;
  }

  if (permission?.canAskAgain === false) {
    safeAlert(
      "Permiso bloqueado",
      getBlockedPermissionMessage(),
      getOpenSettingsButtons(),
    );
    return;
  }

  await requestPermission();
}

export default function MenuScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Menú</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <Text style={styles.description}>
          Desde aquí puedes cerrar la sesión actual de Shopp.
        </Text>
        <LogoutButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 16,
  },
});

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ROUTES } from "@/src/navigation/ROUTES";

import MenuScreen from "@/src/screens/settings/MenuScreen";
import SearchEngines from "@/src/screens/settings/SearchEngines";
import BarcodeSettingsScreen from "@/src/screens/settings/BarcodeSettingsScreen";
import ProfileScreen from "@/src/screens/profile/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function MenuStack() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.MENU}
      screenOptions={{
        headerTitleAlign: "center",
        headerTitleStyle: { fontSize: 20, fontWeight: "700" },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name={ROUTES.MENU}
        component={MenuScreen}
        options={{ title: "Menú" }}
      />

      <Stack.Screen
        name={ROUTES.SEARCH_ENGINE_SETTINGS}
        component={SearchEngines}
        options={{ title: "Motor de búsqueda" }}
      />

      <Stack.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{ title: "Mi perfil" }}
      />

      <Stack.Screen
        name={ROUTES.SEARCH_ENGINES}
        component={SearchEngines}
        options={{ title: "Motor de búsqueda" }}
      />

      <Stack.Screen
        name={ROUTES.BARCODE_SETTINGS}
        component={BarcodeSettingsScreen}
        options={{ title: "Código de barras" }}
      />
    </Stack.Navigator>
  );
}

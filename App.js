import React from "react";
import { Platform } from "react-native";

import { ConvexProvider, ConvexReactClient } from "convex/react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

/* -----------------------------
   Context Providers
------------------------------ */
import { StoresProvider } from "./context/StoresContext";
import { ListsProvider } from "./context/ListsContext";
import { PurchasesProvider } from "./context/PurchasesContext";
import { LocationProvider } from "./context/LocationContext";
import { ProductSuggestionsProvider } from "./context/ProductSuggestionsContext";
import { ProductLearningProvider } from "./context/ProductLearningContext";

/* -----------------------------
   Screens
------------------------------ */
import SplashScreen from "./screens/system/SplashScreen";
/* -----------------------------
   Navigation
------------------------------ */
import MainTabs from "./navigation/MainTabs";
/* -----------------------------
   Alert host
------------------------------ */
import DialogHost from "./components/ui/alert/DialogHost";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn("Falta EXPO_PUBLIC_CONVEX_URL en el .env");
}

const convex = new ConvexReactClient(convexUrl || "");

const RootStack = createNativeStackNavigator();

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <StoresProvider>
          <ListsProvider>
            <PurchasesProvider>
              <LocationProvider>
                <ProductLearningProvider>
                  <ProductSuggestionsProvider>
                    <NavigationContainer>
                      <StatusBar
                        style="light"
                        translucent={false}
                        backgroundColor={
                          Platform.OS === "android" ? "#2563EB" : undefined
                        }
                      />
                      <RootStack.Navigator
                        screenOptions={{ headerShown: false }}
                      >
                        <RootStack.Screen
                          name="Splash"
                          component={SplashScreen}
                        />
                        <RootStack.Screen name="Main" component={MainTabs} />
                      </RootStack.Navigator>
                      <DialogHost />
                    </NavigationContainer>
                  </ProductSuggestionsProvider>
                </ProductLearningProvider>
              </LocationProvider>
            </PurchasesProvider>
          </ListsProvider>
        </StoresProvider>
      </SafeAreaProvider>
    </ConvexProvider>
  );
}

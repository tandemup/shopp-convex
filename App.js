import React, { useState } from "react";
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
import AuthStack from "./navigation/AuthStack";
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

/* -----------------------------
   App Providers
------------------------------ */
function AppProviders({ children }) {
  return (
    <ConvexProvider client={convex}>
      <SafeAreaProvider>
        <StoresProvider>
          <ListsProvider>
            <PurchasesProvider>
              <LocationProvider>
                <ProductLearningProvider>
                  <ProductSuggestionsProvider>
                    {children}
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

/* -----------------------------
   Status Bar
------------------------------ */
function AppStatusBar() {
  return (
    <StatusBar
      style="light"
      translucent={false}
      backgroundColor={Platform.OS === "android" ? "#2563EB" : undefined}
    />
  );
}

/* -----------------------------
   Auth / Main Selector
------------------------------ */
function AppShell({ isLoggedIn, setIsLoggedIn }) {
  if (isLoggedIn) {
    return <MainTabs setIsLoggedIn={setIsLoggedIn} />;
  }

  return <AuthStack setIsLoggedIn={setIsLoggedIn} />;
}

/* -----------------------------
   Root Navigator
------------------------------ */
function RootNavigator({ isLoggedIn, setIsLoggedIn }) {
  return (
    <NavigationContainer>
      <AppStatusBar />

      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <RootStack.Screen name="Splash" component={SplashScreen} />

        <RootStack.Screen name="Main">
          {() => (
            <AppShell isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>

      <DialogHost />
    </NavigationContainer>
  );
}

/* -----------------------------
   App
------------------------------ */
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <AppProviders>
      <RootNavigator isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
    </AppProviders>
  );
}

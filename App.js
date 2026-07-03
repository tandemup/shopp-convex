import React from "react";
import { Platform } from "react-native";

import {
  Authenticated,
  AuthLoading,
  ConvexReactClient,
  Unauthenticated,
} from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

/* -----------------------------
   Context Providers
------------------------------ */
import { StoresProvider } from "@/src/context/StoresContext";
import { ListsProvider } from "@/src/context/ListsContext";
import { PurchasesProvider } from "@/src/context/PurchasesContext";
import { LocationProvider } from "@/src/context/LocationContext";
import { ProductSuggestionsProvider } from "@/src/context/ProductSuggestionsContext";
import { ProductLearningProvider } from "@/src/context/ProductLearningContext";

/* -----------------------------
   Screens
------------------------------ */
import SplashScreen from "@/src/screens/system/SplashScreen";

/* -----------------------------
   Navigation
------------------------------ */
import AuthStack from "@/src/navigation/AuthStack";
import MainTabs from "@/src/navigation/MainTabs";

/* -----------------------------
   Alert host
------------------------------ */
import DialogHost from "@/src/components/ui/alert/DialogHost";

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
    <ConvexAuthProvider client={convex}>
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
    </ConvexAuthProvider>
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
function AppShell() {
  return (
    <>
      <AuthLoading>
        <SplashScreen />
      </AuthLoading>

      <Unauthenticated>
        <AuthStack />
      </Unauthenticated>

      <Authenticated>
        <MainTabs />
      </Authenticated>
    </>
  );
}

/* -----------------------------
   Root Navigator
------------------------------ */
function RootNavigator() {
  return (
    <NavigationContainer>
      <AppStatusBar />

      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <RootStack.Screen name="Main" component={AppShell} />
      </RootStack.Navigator>

      <DialogHost />
    </NavigationContainer>
  );
}

/* -----------------------------
   App
------------------------------ */
export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

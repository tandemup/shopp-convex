import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

import AppNavigator from "@/src/navigation/AppNavigator";

import { ListsProvider } from "@/src/context/ListsContext";
import { StoresProvider } from "@/src/context/StoresContext";
import DialogHost from "@/src/components/ui/alert/DialogHost";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL. Define EXPO_PUBLIC_CONVEX_URL in your .env file.",
  );
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export default function App() {
  return (
    <ConvexAuthProvider client={convex}>
      <ListsProvider>
        <StoresProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>

          <DialogHost />
        </StoresProvider>
      </ListsProvider>
    </ConvexAuthProvider>
  );
}

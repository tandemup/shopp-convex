import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

import { LocationProvider } from "@/src/context/LocationContext";
import { ListsProvider } from "@/src/context/ListsContext";
import { StoresProvider } from "@/src/context/StoresContext";
import DialogHost from "@/src/components/ui/alert/DialogHost";
import AppNavigator from "@/src/navigation/AppNavigator";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

export default function App() {
  return (
    <ConvexAuthProvider client={convex}>
      <ListsProvider>
        <StoresProvider>
          <LocationProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <DialogHost />
          </LocationProvider>
        </StoresProvider>
      </ListsProvider>
    </ConvexAuthProvider>
  );
}

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ROUTES } from "./ROUTES";

import PurchaseHistoryScreen from "@/screens/history/PurchaseHistoryScreen";
import PurchaseDetailScreen from "@/screens/history/PurchaseDetailScreen";

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerTitleStyle: { fontSize: 20, fontWeight: "700" },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name={ROUTES.PURCHASE_HISTORY}
        component={PurchaseHistoryScreen}
      />
      <Stack.Screen
        name={ROUTES.PURCHASE_DETAIL}
        component={PurchaseDetailScreen}
      />
    </Stack.Navigator>
  );
}

/*
      <Stack.Screen
        name={ROUTES.ITEM_DETAIL}
        component={ItemDetailScreen}
        options={{ title: "Detalle" }}
      />
*/

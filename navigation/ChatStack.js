import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ROUTES } from "@/navigation/ROUTES";
import ChatScreen from "@/screens/chat/ChatScreen";
import ChatScreenResponsive from "@/screens/chat/ChatScreenResponsive";

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
        name={ROUTES.CHAT_SCREEN_RESPONSIVE}
        component={ChatScreenResponsive}
        options={{
          title: "Chat responsive",
        }}
      />
      <Stack.Screen
        name={ROUTES.CHAT_SCREEN}
        component={ChatScreen}
        options={{
          title: "Chat",
        }}
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

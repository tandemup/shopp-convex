import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ROUTES } from "@/navigation/ROUTES";
import ChatScreen from "@/screens/chat/ChatScreen";
import ChatScreenResponsive from "@/screens/chat/ChatScreenResponsive";
import ParkingScreen from "@/screens/chat/ParkingScreen";
import ParkingSettingsScreen from "@/screens/chat/ParkingSettingsScreen";
import YesterdayNewsScreen from "@/screens/chat/YesterdayNewsScreen";

const Stack = createNativeStackNavigator();

export default function ChatStack() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.CHAT_SCREEN}
      screenOptions={{
        headerTitleAlign: "center",
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: "700",
        },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name={ROUTES.CHAT_SCREEN}
        component={ChatScreen}
        options={{
          title: "Chat",
          headerShown: false,
        }}
      />

      <Stack.Screen
        name={ROUTES.CHAT_SCREEN_RESPONSIVE}
        component={ChatScreenResponsive}
        options={{
          title: "Chat responsive",
          headerShown: false,
        }}
      />

      <Stack.Screen
        name={ROUTES.YESTERDAY_NEWS_SCREEN}
        component={YesterdayNewsScreen}
        options={{
          title: "Yesterday News",
        }}
      />

      <Stack.Screen
        name={ROUTES.PARKING_SCREEN}
        component={ParkingScreen}
        options={{
          title: "Parking",
          headerShown: false,
        }}
      />

      <Stack.Screen
        name={ROUTES.PARKING_SETTINGS}
        component={ParkingSettingsScreen}
        options={{
          title: "Ajustes de parking",
          presentation: "card",
          headerShown: false,
          contentStyle: {
            backgroundColor: "#f8fafc",
          },
        }}
      />
    </Stack.Navigator>
  );
}

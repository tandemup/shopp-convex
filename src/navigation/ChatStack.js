import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ROUTES } from "@/src/navigation/ROUTES";
import ChatScreen from "@/src/screens/chat/ChatScreen";
import ChatScreenResponsive from "@/src/screens/chat/ChatScreenResponsive";
import YesterdayNewsScreen from "@/src/screens/chat/YesterdayNewsScreen";
import ParkingScreen from "@/src/screens/parking/ParkingScreen";
import ParkingSettingsScreen from "@/src/screens/parking/ParkingSettingsScreen";
import ParkingGpsDebugScreen from "@/src/screens/parking/ParkingGpsDebugScreen";

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
      <Stack.Screen
        name={ROUTES.PARKING_GPS_DEBUG}
        component={ParkingGpsDebugScreen}
        options={{
          title: "GPS Debug",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

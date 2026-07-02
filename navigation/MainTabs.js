import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";

import { ROUTES } from "@/navigation/ROUTES";
import ShoppingStack from "@/navigation/ShoppingStack";
import StoresStack from "@/navigation/StoresStack";
import ChatStack from "@/navigation/ChatStack";
import ScannerStack from "@/navigation/ScannerStack";
import MenuStack from "@/navigation/MenuStack";

const Tab = createBottomTabNavigator();

const SCREEN_BACKGROUND = "#f8fafc";
const TAB_BAR_HEIGHT = Platform.OS === "web" ? 64 : 72;

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        sceneStyle: {
          flex: 1,
          backgroundColor: SCREEN_BACKGROUND,
          paddingBottom: 0,
        },

        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",

        tabBarStyle: {
          height: TAB_BAR_HEIGHT,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 18 : 8,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name={ROUTES.SHOPPING_TAB}
        component={ShoppingStack}
        options={{
          title: "Shopping",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.STORES_TAB}
        component={StoresStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();

            navigation.navigate(ROUTES.STORES_TAB, {
              screen: ROUTES.STORES_HOME,
            });
          },
        })}
        options={{
          title: "Tiendas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.CHAT_TAB}
        component={ChatStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();

            navigation.navigate(ROUTES.CHAT_TAB, {
              screen: ROUTES.CHAT_SCREEN,
            });
          },
        })}
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbox-ellipses-sharp" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.SCANNER_TAB}
        component={ScannerStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();

            navigation.navigate(ROUTES.SCANNER_TAB, {
              screen: ROUTES.SCANNER_HOME,
            });
          },
        })}
        options={{
          title: "Scanner",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barcode" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.MENU_TAB}
        component={MenuStack}
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";

import { ROUTES } from "./ROUTES";
import ShoppingStack from "./ShoppingStack";
import StoresStack from "./StoresStack";
import ChatStack from "./ChatStack";
import ScannerStack from "./ScannerStack";
import MenuStack from "./MenuStack";

const Tab = createBottomTabNavigator();

const SCREEN_BACKGROUND = "#f8fafc";

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: SCREEN_BACKGROUND,
        },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          borderTopWidth: StyleSheet.hairlineWidth,
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

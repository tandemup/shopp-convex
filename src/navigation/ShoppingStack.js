import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { HeaderBackButton } from "@react-navigation/elements";

import { ROUTES } from "./ROUTES";

import ShoppingListsScreen from "@/src/screens/lists/ShoppingListsScreen";
import ShoppingListScreen from "@/src/screens/lists/ShoppingListScreen";
import ItemDetailScreen from "@/src/screens/lists/ItemDetailScreen";
import StoreSelectScreen from "@/src/screens/stores/StoreSelectScreen";
import ArchivedListsScreen from "@/src/screens/lists/ArchivedListsScreen";
import StoresScreen from "@/src/screens/stores/StoresBrowseScreen";
import PurchaseHistoryScreen from "@/src/screens/history/PurchaseHistoryScreen";
import PurchaseDetailScreen from "@/src/screens/history/PurchaseDetailScreen";

import ScannedHistoryScreen from "@/src/screens/scanner/ScannedHistoryScreen";
import EditScannedItemScreen from "@/src/screens/scanner/EditScannedItemScreen";
import StoreMapScreen from "@/src/screens/stores/StoreMapScreen";
import MenuScreen from "@/src/screens/settings/MenuScreen";

import CarrefourTestScreen from "@/src/screens/CarrefourTestScreen";
import MusicPlayerScreen from "@/src/screens/music/MusicPlayerScreen";

const Stack = createNativeStackNavigator();
export default function ShoppingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "papayawhip",
        },
        headerTitleAlign: "center",
        headerTitleStyle: { fontSize: 20, fontWeight: "700" },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name={ROUTES.SHOPPING_LISTS}
        component={ShoppingListsScreen}
      />

      <Stack.Screen
        name={ROUTES.SHOPPING_LIST}
        component={ShoppingListScreen}
      />
      <Stack.Screen name={ROUTES.ITEM_DETAIL} component={ItemDetailScreen} />

      <Stack.Screen name={ROUTES.STORES_HOME} component={StoresScreen} />

      <Stack.Screen name={ROUTES.STORE_SELECT} component={StoreSelectScreen} />

      <Stack.Screen name={ROUTES.STORE_MAP} component={StoreMapScreen} />

      <Stack.Screen
        name={ROUTES.ARCHIVED_LISTS}
        component={ArchivedListsScreen}
      />
      <Stack.Screen
        name={ROUTES.PURCHASE_HISTORY}
        component={PurchaseHistoryScreen}
      />
      <Stack.Screen
        name={ROUTES.PURCHASE_DETAIL}
        component={PurchaseDetailScreen}
      />

      <Stack.Screen
        name={ROUTES.SCANNED_HISTORY}
        component={ScannedHistoryScreen}
      />

      <Stack.Screen
        name={ROUTES.EDIT_SCANNED_ITEM}
        component={EditScannedItemScreen}
      />

      <Stack.Screen name={ROUTES.MENU} component={MenuScreen} />

      <Stack.Screen
        name={ROUTES.CARREFOUR_TEST}
        component={CarrefourTestScreen}
        options={{
          title: "Catálogo Carrefour",
        }}
      />
      <Stack.Screen
        name={ROUTES.MUSIC_PLAYER}
        component={MusicPlayerScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

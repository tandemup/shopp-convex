import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ROUTES } from "@/src/navigation/ROUTES";

import MenuScreen from "@/src/screens/settings/MenuScreen";
import SearchEngines from "@/src/screens/settings/SearchEngines";
import BarcodeSettingsScreen from "@/src/screens/settings/BarcodeSettingsScreen";
import ProfileScreen from "@/src/screens/profile/ProfileScreen";
import AdminUsersScreen from "@/src/screens/admin/AdminUsersScreen";

import MusicLibraryScreen from "@/src/screens/music/MusicLibraryScreen";
import MusicPlayerScreen from "@/src/screens/music/MusicPlayerScreen";

import AdminAlbumsScreen from "@/src/screens/admin/AdminAlbumsScreen";
import AdminAlbumUploadScreen from "@/src/screens/admin/AdminAlbumUploadScreen";
import AdminAlbumEditScreen from "@/src/screens/admin/AdminAlbumEditScreen";
import AdminAlbumJsonImportScreen from "@/src/screens/admin/AdminAlbumJsonImportScreen";

const Stack = createNativeStackNavigator();

export default function MenuStack() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.MENU}
      screenOptions={{
        headerTitleAlign: "center",
        headerTitleStyle: { fontSize: 20, fontWeight: "700" },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name={ROUTES.MENU}
        component={MenuScreen}
        options={{ title: "Menú" }}
      />

      <Stack.Screen
        name={ROUTES.SEARCH_ENGINE_SETTINGS}
        component={SearchEngines}
        options={{ title: "Motor de búsqueda" }}
      />

      <Stack.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{ title: "Mi perfil" }}
      />

      <Stack.Screen
        name={ROUTES.SEARCH_ENGINES}
        component={SearchEngines}
        options={{ title: "Motor de búsqueda" }}
      />

      <Stack.Screen
        name={ROUTES.BARCODE_SETTINGS}
        component={BarcodeSettingsScreen}
        options={{ title: "Código de barras" }}
      />

      <Stack.Screen
        name={ROUTES.ADMIN_USERS}
        component={AdminUsersScreen}
        options={{ title: "Administrar usuarios" }}
      />

      <Stack.Screen
        name={ROUTES.MUSIC_LIBRARY}
        component={MusicLibraryScreen}
        options={{ title: "Música" }}
      />

      <Stack.Screen
        name={ROUTES.ADMIN_ALBUMS}
        component={AdminAlbumsScreen}
        options={{ title: "Editor de álbumes" }}
      />

      <Stack.Screen
        name={ROUTES.ADMIN_ALBUM_EDIT}
        component={AdminAlbumEditScreen}
        options={{ title: "Editar álbum" }}
      />

      <Stack.Screen
        name={ROUTES.ADMIN_ALBUM_UPLOAD}
        component={AdminAlbumUploadScreen}
        options={{ title: "Nuevo álbum" }}
      />
      <Stack.Screen
        name={ROUTES.ADMIN_ALBUM_JSON_IMPORT}
        component={AdminAlbumJsonImportScreen}
        options={{ title: "Importar álbum JSON" }}
      />

      <Stack.Screen
        name={ROUTES.MUSIC_PLAYER}
        component={MusicPlayerScreen}
        options={{ title: "Reproductor" }}
      />
    </Stack.Navigator>
  );
}

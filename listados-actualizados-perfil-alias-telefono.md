# Listados actualizados - edición de alias y teléfono
Estos archivos permiten que cuentas antiguas creen o actualicen su perfil después de iniciar sesión.

## `convex/schema.js`

```js
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,


  userProfiles: defineTable({
    userId: v.string(),
    alias: v.string(),
    phone: v.optional(v.string()),
    phoneVisible: v.optional(v.boolean()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_alias", ["alias"])
    .index("by_phone", ["phone"]),

  chatMessages: defineTable({
    userId: v.optional(v.string()),

    room: v.string(),
    text: v.string(),
    username: v.string(),
    createdAt: v.float64(),

    status: v.optional(
      v.union(v.literal("visible"), v.literal("hidden"), v.literal("blocked")),
    ),

    messageStatus: v.optional(
      v.union(
        v.literal("clean"),
        v.literal("blocked"),
        v.literal("warning"),
        v.literal("pending_url_check"),
      ),
    ),

    urls: v.optional(
      v.array(
        v.object({
          originalUrl: v.string(),
          normalizedUrl: v.union(v.string(), v.null()),
          hostname: v.union(v.string(), v.null()),
          provider: v.string(),
          reason: v.string(),
          riskScore: v.float64(),
          checkedAt: v.float64(),

          status: v.optional(
            v.union(
              v.literal("trusted"),
              v.literal("safe"),
              v.literal("pending"),
              v.literal("suspicious"),
              v.literal("malicious"),
              v.literal("blocked"),
              v.literal("unknown"),
            ),
          ),
        }),
      ),
    ),

    checkedLocallyAt: v.optional(v.float64()),
    checkedExternallyAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),
    blockedReason: v.optional(v.string()),
  })
    .index("by_room_createdAt", ["room", "createdAt"])
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingPresence: defineTable({
    userId: v.string(),

    city: v.string(),
    zone: v.string(),

    alias: v.optional(v.string()),
    destination: v.optional(v.string()),

    status: v.optional(
      v.union(
        v.literal("heading"),
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),
        v.literal("offline"),
      ),
    ),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),

    createdAt: v.optional(v.float64()),
    updatedAt: v.float64(),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_city_zone_userId", ["city", "zone", "userId"])
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_userId", ["userId"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingSpots: defineTable({
    userId: v.optional(v.string()),

    city: v.string(),
    zone: v.string(),

    status: v.optional(
      v.union(
        v.literal("free"),
        v.literal("occupied"),
        v.literal("unknown"),
        v.literal("expired"),

        // Compatibilidad con documentos antiguos.
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),
        v.literal("heading"),
        v.literal("offline"),
      ),
    ),

    alias: v.optional(v.string()),
    destination: v.optional(v.string()),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),

    revealedBy: v.optional(v.string()),
    revealedAt: v.optional(v.float64()),

    occupiedBy: v.optional(v.string()),
    occupiedAt: v.optional(v.float64()),

    sourceMessageId: v.optional(v.id("parkingMessages")),

    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_city_zone_status_expiresAt", [
      "city",
      "zone",
      "status",
      "expiresAt",
    ])
    .index("by_city_zone_status_updatedAt", [
      "city",
      "zone",
      "status",
      "updatedAt",
    ])
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_userId", ["userId"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingMessages: defineTable({
    room: v.optional(v.string()),

    city: v.optional(v.string()),
    zone: v.optional(v.string()),

    userId: v.string(),
    alias: v.optional(v.string()),
    text: v.string(),
    createdAt: v.float64(),

    status: v.optional(
      v.union(
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),

        // Compatibilidad con documentos antiguos de tipo chat.
        v.literal("visible"),
        v.literal("hidden"),
        v.literal("blocked"),
      ),
    ),

    parkingStatus: v.optional(
      v.union(v.literal("looking"), v.literal("parked"), v.literal("leaving")),
    ),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),

    destination: v.optional(
      v.object({
        id: v.string(),
        name: v.string(),
        address: v.string(),
        lat: v.float64(),
        lng: v.float64(),
      }),
    ),
  })
    .index("by_room", ["room"])
    .index("by_city", ["city"])
    .index("by_zone", ["zone"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_createdAt", ["createdAt"])
    .index("by_city_zone_createdAt", ["city", "zone", "createdAt"])
    .index("by_city_zone_status_createdAt", [
      "city",
      "zone",
      "status",
      "createdAt",
    ])
    .index("by_status_createdAt", ["status", "createdAt"]),

  stores: defineTable({
    id: v.string(),
    name: v.string(),
    address: v.string(),
    city: v.string(),

    // Campo heredado. No usarlo para favoritos de usuario.
    favorite: v.optional(v.boolean()),

    provincia: v.optional(v.string()),
    zipcode: v.optional(v.union(v.string(), v.float64())),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),
  })
    .index("by_storeId", ["id"])
    .index("by_city", ["city"])
    .index("by_name", ["name"]),

  userStoreFavorites: defineTable({
    userId: v.string(),
    storeId: v.string(),
    createdAt: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_storeId", ["userId", "storeId"])
    .index("by_storeId", ["storeId"]),

  scanHistory: defineTable({
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    source: v.optional(v.string()),
    rawData: v.optional(v.any()),

    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_barcode", ["barcode"])
    .index("by_createdAt", ["createdAt"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_barcode_updatedAt", ["barcode", "updatedAt"]),
});

```

## `convex/users.js`

```js
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function cleanText(value) {
  return String(value || "").trim();
}

function cleanAlias(value) {
  const alias = cleanText(value);
  return alias ? alias.slice(0, 40) : "anonymous";
}

function cleanPhone(value) {
  const phone = cleanText(value);
  return phone ? phone.slice(0, 30) : undefined;
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

async function getProfileByUserId(ctx, userId) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);

    if (authUserId === null) {
      return null;
    }

    const user = await ctx.db.get(authUserId);

    if (!user) {
      return null;
    }

    const userId = String(authUserId);
    const profile = await getProfileByUserId(ctx, userId);

    return {
      _id: user._id,
      _creationTime: user._creationTime,

      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,

      emailVerificationTime: user.emailVerificationTime ?? null,
      phone: profile?.phone ?? user.phone ?? null,
      phoneVerificationTime: user.phoneVerificationTime ?? null,
      isAnonymous: user.isAnonymous ?? false,

      profile: profile
        ? {
            _id: profile._id,
            alias: profile.alias,
            phone: profile.phone ?? null,
            phoneVisible: profile.phoneVisible ?? false,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : null,
    };
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, String(userId));

    if (!profile) {
      return null;
    }

    return {
      _id: profile._id,
      alias: profile.alias,
      phone: profile.phone ?? null,
      phoneVisible: profile.phoneVisible ?? false,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  },
});

export const upsertMyProfile = mutation({
  args: {
    alias: v.string(),
    phone: v.optional(v.string()),
    phoneVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();

    const alias = cleanAlias(args.alias);
    const phone = cleanPhone(args.phone);
    const phoneVisible = args.phoneVisible === true;

    const existingProfile = await getProfileByUserId(ctx, userId);

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        alias,
        phone,
        phoneVisible,
        updatedAt: now,
      });

      return {
        ok: true,
        profileId: existingProfile._id,
      };
    }

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      alias,
      phone,
      phoneVisible,
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      profileId,
    };
  },
});

```

## `src/screens/profile/ProfileScreen.js`

```js
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

function cleanText(value) {
  return String(value || "").trim();
}

function formatAccountLabel(currentUser) {
  if (!currentUser) return "Cuenta de Shopp";

  return (
    currentUser?.email ||
    currentUser?.name ||
    currentUser?._id ||
    "Cuenta de Shopp"
  );
}

export default function ProfileScreen({ navigation }) {
  const currentUser = useQuery(api.users.current);
  const profile = useQuery(api.users.getMyProfile);
  const upsertMyProfile = useMutation(api.users.upsertMyProfile);

  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  const accountLabel = useMemo(
    () => formatAccountLabel(currentUser),
    [currentUser],
  );

  useEffect(() => {
    if (profile === undefined) return;
    if (formTouched) return;

    if (profile) {
      setAlias(profile.alias || "");
      setPhone(profile.phone || "");
      setPhoneVisible(profile.phoneVisible === true);
      return;
    }

    setAlias("");
    setPhone("");
    setPhoneVisible(false);
  }, [profile, formTouched]);

  const handleChangeAlias = (value) => {
    setFormTouched(true);
    setAlias(value);
  };

  const handleChangePhone = (value) => {
    setFormTouched(true);
    setPhone(value);
  };

  const handleChangePhoneVisible = (value) => {
    setFormTouched(true);
    setPhoneVisible(value);
  };

  const handleSave = async () => {
    const cleanAlias = cleanText(alias);
    const cleanPhone = cleanText(phone);

    if (cleanAlias.length < 2) {
      safeAlert(
        "Alias obligatorio",
        "Escribe un alias público de al menos 2 caracteres.",
      );
      return;
    }

    if (cleanAlias.length > 40) {
      safeAlert(
        "Alias demasiado largo",
        "El alias público no puede tener más de 40 caracteres.",
      );
      return;
    }

    if (cleanPhone.length > 30) {
      safeAlert(
        "Teléfono demasiado largo",
        "El teléfono no puede tener más de 30 caracteres.",
      );
      return;
    }

    try {
      setSaving(true);

      await upsertMyProfile({
        alias: cleanAlias,
        phone: cleanPhone || undefined,
        phoneVisible,
      });

      setFormTouched(false);

      safeAlert(
        "Perfil actualizado",
        "Tu alias y tus preferencias de contacto se han guardado correctamente.",
      );

      navigation?.goBack?.();
    } catch (error) {
      console.warn("[ProfileScreen] save profile error", error);

      safeAlert(
        "No se pudo guardar",
        error?.message || "Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (currentUser === undefined || profile === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={30} color="#14532d" />
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.title}>Mi perfil</Text>
            <Text style={styles.subtitle}>{accountLabel}</Text>
          </View>
        </View>

        {profile ? null : (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={22} color="#166534" />
            <Text style={styles.noticeText}>
              Esta cuenta todavía no tiene perfil. Completa un alias público para
              usar Parking y Chat sin mostrar tu email.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Alias público</Text>
          <TextInput
            value={alias}
            onChangeText={handleChangeAlias}
            placeholder="Ej. 4104-BZG"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
            style={styles.input}
          />
          <Text style={styles.help}>
            Es el nombre visible para otros usuarios en Parking y Chat. No uses
            tu nombre real si quieres proteger tu privacidad.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            value={phone}
            onChangeText={handleChangePhone}
            placeholder="Ej. 600 000 000"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            maxLength={30}
            style={styles.input}
          />
          <Text style={styles.help}>
            El teléfono es opcional. Guárdalo solo si quieres usarlo como dato de
            contacto en funciones de Parking.
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>Mostrar teléfono en Parking</Text>
              <Text style={styles.helpNoMargin}>
                Por defecto queda oculto. Actívalo solo si quieres que otros
                usuarios puedan verlo.
              </Text>
            </View>

            <Switch
              value={phoneVisible}
              onValueChange={handleChangePhoneVisible}
              disabled={!cleanText(phone)}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.86}
        >
          <Ionicons name="checkmark" size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBox: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
  },
  noticeBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#14532d",
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  help: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  helpNoMargin: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  switchRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchTextBox: {
    flex: 1,
  },
  switchTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
});

```

## `src/navigation/ROUTES.js`

```js
export const ROUTES = {
  // Tabs
  SHOPPING_TAB: "ShoppingTab",
  STORES_TAB: "StoresTab",
  SCANNER_TAB: "ScannerTab",
  CHAT_TAB: "ChatTab",
  MENU_TAB: "MenuTab",

  // Shopping stack
  SHOPPING_LISTS: "Shopping Lists",
  SHOPPING_LIST: "Shopping List",
  ITEM_DETAIL: "Item Detail",

  // Stores stack
  STORES_HOME: "Stores Home",
  STORES_BROWSE: "Stores Browse",
  STORE_SELECT: "Store Select",
  STORES_FAVORITES: "Stores Favorites",
  STORE_DETAIL: "Store Detail",
  STORE_MAP: "Store Map",
  STORES_NEARBY: "Stores Nearby",
  STORE_INFO: "Store Info",

  // Archive
  ARCHIVED_LISTS: "Archived Lists",
  ARCHIVED_LIST_DETAIL: "Archived List Detail",

  // History
  PURCHASE_HISTORY: "Purchase History",
  PURCHASE_DETAIL: "Purchase Detail",
  SCANNED_HISTORY: "Scanned History",

  // Scanner stack
  SCANNER_HOME: "Scanner Home",

  // Scanner básico heredado
  PRODUCT_BARCODE_SCANNER: "ProductBarcodeScanner",

  // Scanner principal
  NEW_PRODUCT_SCANNER2: "NewProductScanner2",

  // Pantalla para mostrar información obtenida del producto escaneado
  PRODUCT_INFO: "ProductInfo",

  // Scanner auxiliares / existentes
  SCANNER_SCREEN: "Scanner Screen",
  QUICK_SCANNER_SCREEN: "QuickScanner Screen",
  DETAILED_SCANNER_SCREEN: "DetailedScanner Screen",
  SHELF_LABEL_SCANNER: "Shelf Label Scanner",
  EDIT_SCANNED_ITEM: "Edit Scanned Item",

  // Search settings
  SEARCH_ENGINES: "Search Engines",
  SEARCH_ENGINE_SETTINGS: "SearchEngine Settings Screen",

  // Menu / Settings
  MENU: "Menu",
  PROFILE: "Profile",
  SETTINGS: "Settings Screen",
  BARCODE_SETTINGS: "Barcode Settings Screen",
  CONFIRM_DELETE: "Confirm Delete Screen",

  // Chat stack
  CHAT_SCREEN: "Chat",
  CHAT_SCREEN_RESPONSIVE: "Chat Responsive",
  PARKING_SCREEN: "Parking",
  PARKING_SETTINGS: "ParkingSettings",
  YESTERDAY_NEWS_SCREEN: "Yesterday News",

  // Debug
  PRODUCT_LEARNING_DEBUG: "Product Learning Debug",
};

```

## `src/navigation/MenuStack.js`

```js
// navigation/MenuStack.js

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ROUTES } from "@/src/navigation/ROUTES";

import MenuScreen from "@/src/screens/settings/MenuScreen";
import SearchEngines from "@/src/screens/settings/SearchEngines";
import BarcodeSettingsScreen from "@/src/screens/settings/BarcodeSettingsScreen";
import ProfileScreen from "@/src/screens/profile/ProfileScreen";

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
    </Stack.Navigator>
  );
}

```

## `src/screens/settings/MenuScreen.js`

```js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  getSearchSettings,
  DEFAULT_SEARCH_SETTINGS,
} from "@/src/storage/settingsStorage";

import { SEARCH_ENGINES } from "@/src/constants/searchEngines";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";

import { ROUTES } from "@/src/navigation/ROUTES";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

import {
  clearActiveLists,
  clearArchivedLists,
  clearPurchaseHistory,
  clearStorage,
} from "@/src/storage";

import { clearScannedHistory } from "@/src/services/scannerHistory";
import { useLists } from "@/src/context/ListsContext";
import { useStores } from "@/src/context/StoresContext";

const USER_EXPORT_VERSION = 1;

const EXPORT_STORAGE_KEYS = {
  userProfile: "user_profile",
  shoppingLists: "shopping_lists",
  archivedLists: "archived_lists",
  purchaseHistory: "purchase_history",
  scanHistory: "scanned_history",
};

const CAMERA_GRANTED_STORAGE_KEY = "shopp:web-camera-access-granted";

function buildProductSearchEngineSubtitle(settings) {
  const engineId =
    settings?.selectedProductEngine ||
    settings?.generalEngine ||
    DEFAULT_SEARCH_SETTINGS?.selectedProductEngine ||
    DEFAULT_SEARCH_SETTINGS?.generalEngine ||
    "google";

  const engine = SEARCH_ENGINES?.[engineId];

  const engineLabel = engine?.label || engine?.name || engineId;

  return `Motor activo: ${engineLabel}`;
}

function getPermissionLabel(permission) {
  if (!permission) return "Comprobando...";

  if (permission.granted) return "Concedido";
  if (permission.canAskAgain === false) return "Bloqueado";
  if (permission.status === "denied") return "Denegado";

  return "No solicitado";
}

function getPermissionColor(permission) {
  if (!permission) return "#64748b";

  if (permission.granted) return "#16a34a";
  if (permission.canAskAgain === false) return "#dc2626";
  if (permission.status === "denied") return "#f97316";

  return "#64748b";
}

function safeJsonParse(value, fallbackValue) {
  try {
    if (!value) return fallbackValue;
    return JSON.parse(value);
  } catch (error) {
    console.warn("[MenuScreen] JSON parse error", error);
    return fallbackValue;
  }
}

async function getStoredJson(key, fallbackValue) {
  const rawValue = await AsyncStorage.getItem(key);
  return safeJsonParse(rawValue, fallbackValue);
}

function buildExportFilename() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `shopp-user-export-${yyyy}${mm}${dd}-${hh}${min}.json`;
}

function downloadJsonOnWeb(filename, jsonString) {
  if (typeof document === "undefined") {
    throw new Error("document is not available");
  }

  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportUserDataToJsonFile() {
  const [
    userProfile,
    shoppingLists,
    archivedLists,
    purchaseHistory,
    scanHistory,
  ] = await Promise.all([
    getStoredJson(EXPORT_STORAGE_KEYS.userProfile, {}),
    getStoredJson(EXPORT_STORAGE_KEYS.shoppingLists, []),
    getStoredJson(EXPORT_STORAGE_KEYS.archivedLists, []),
    getStoredJson(EXPORT_STORAGE_KEYS.purchaseHistory, []),
    getStoredJson(EXPORT_STORAGE_KEYS.scanHistory, []),
  ]);

  const exportData = {
    app: "Shopp",
    type: "user-data-export",
    version: USER_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),

    user: {
      id: userProfile?.id ?? null,
      username: userProfile?.username ?? null,
      city: userProfile?.city ?? null,
      zones: Array.isArray(userProfile?.zones) ? userProfile.zones : [],
      raw: userProfile ?? {},
    },

    data: {
      purchaseHistory,
      shoppingLists,
      archivedLists,
      scanHistory,
    },

    meta: {
      platform: Platform.OS,
      storageKeys: EXPORT_STORAGE_KEYS,
    },
  };

  const filename = buildExportFilename();
  const jsonString = JSON.stringify(exportData, null, 2);

  if (Platform.OS === "web") {
    downloadJsonOnWeb(filename, jsonString);

    return {
      ok: true,
      filename,
      platform: "web",
      shared: false,
      fileUri: null,
    };
  }

  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      dialogTitle: "Exportar datos de Shopp",
      UTI: "public.json",
    });
  }

  return {
    ok: true,
    filename,
    platform: Platform.OS,
    shared: canShare,
    fileUri,
  };
}

function getGrantedPermissionMessage() {
  if (Platform.OS === "web") {
    return "El permiso ya está concedido. Para volver a preguntar, revócalo desde los permisos del sitio: pulsa el icono junto a la URL, cambia el permiso a bloquear o preguntar, y recarga la página.";
  }

  return "El permiso ya está concedido. Android/iOS no permiten anularlo desde la app para volver a mostrar el diálogo del sistema. Puedes revocarlo manualmente desde Ajustes y después volver a tocar esta opción.";
}

function getBlockedPermissionMessage() {
  if (Platform.OS === "web") {
    return "El permiso está bloqueado en el navegador. Para cambiarlo, pulsa el icono de permisos junto a la URL y habilita el acceso desde los ajustes del sitio.";
  }

  return "El permiso está bloqueado para Shopp. Para cambiarlo, abre los ajustes del sistema y habilita el permiso manualmente.";
}

function getOpenSettingsButtons() {
  if (Platform.OS === "web") {
    return [];
  }

  return [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Abrir ajustes",
      onPress: async () => {
        await Linking.openSettings();
      },
    },
  ];
}

function showDestructiveConfirm(title, message, confirmText, onConfirm) {
  safeAlert(title, message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: confirmText,
      style: "destructive",
      onPress: onConfirm,
    },
  ]);
}

async function handlePermissionPress(permission, requestPermission, label) {
  if (permission?.granted) {
    safeAlert(
      `${label} concedido`,
      getGrantedPermissionMessage(),
      getOpenSettingsButtons(),
    );
    return;
  }

  if (permission?.canAskAgain === false) {
    safeAlert(
      "Permiso bloqueado",
      getBlockedPermissionMessage(),
      getOpenSettingsButtons(),
    );
    return;
  }

  await requestPermission();
}

function PermissionRow({ icon, title, description, permission, onPress }) {
  const label = getPermissionLabel(permission);
  const color = getPermissionColor(permission);

  return (
    <Pressable style={styles.permissionRow} onPress={onPress}>
      <View style={styles.permissionIconBox}>
        <Ionicons name={icon} size={22} color="#0f172a" />
      </View>

      <View style={styles.permissionTextBox}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>

      <View style={[styles.permissionBadge, { borderColor: color }]}>
        <Text style={[styles.permissionBadgeText, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  danger = false,
  disabled = false,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        danger && styles.dangerCard,
        disabled && styles.disabledCard,
        pressed && !disabled && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.cardIconBox, danger && styles.dangerIconBox]}>
          <Ionicons
            name={icon}
            size={22}
            color={danger ? "#dc2626" : "#0f172a"}
          />
        </View>

        <View style={styles.cardTextBox}>
          <Text
            style={[styles.cardTitle, danger && styles.dangerText]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.cardRight}>
        {badge ? (
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{badge}</Text>
          </View>
        ) : null}

        <Ionicons
          name={danger ? "warning-outline" : "chevron-forward"}
          size={20}
          color={danger ? "#dc2626" : "#94a3b8"}
        />
      </View>
    </Pressable>
  );
}

function UserAccountCard({ user }) {
  const isLoading = user === undefined;

  const displayName =
    user?.name || user?.email || user?._id || "Usuario autenticado";

  const displayEmail = user?.email || "Email no disponible";

  return (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Ionicons name="person-outline" size={26} color="#2563eb" />
      </View>

      <View style={styles.userTextBox}>
        <Text style={styles.userName} numberOfLines={1}>
          {isLoading ? "Cargando usuario..." : displayName}
        </Text>

        <Text style={styles.userEmail} numberOfLines={1}>
          {isLoading ? "Obteniendo datos de Convex Auth" : displayEmail}
        </Text>

        {!isLoading && user?._id ? (
          <Text style={styles.userId} numberOfLines={1}>
            ID: {String(user._id)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

async function getWebCameraPermissionStatus() {
  if (Platform.OS !== "web") {
    return null;
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      granted: false,
      status: "denied",
      canAskAgain: false,
    };
  }

  if (!navigator.permissions?.query) {
    const remembered =
      window.localStorage.getItem(CAMERA_GRANTED_STORAGE_KEY) === "true";

    return {
      granted: remembered,
      status: remembered ? "granted" : "undetermined",
      canAskAgain: true,
    };
  }

  try {
    const permission = await navigator.permissions.query({
      name: "camera",
    });

    return {
      granted: permission.state === "granted",
      status:
        permission.state === "granted"
          ? "granted"
          : permission.state === "denied"
            ? "denied"
            : "undetermined",
      canAskAgain: permission.state !== "denied",
    };
  } catch (error) {
    const remembered =
      window.localStorage.getItem(CAMERA_GRANTED_STORAGE_KEY) === "true";

    return {
      granted: remembered,
      status: remembered ? "granted" : "undetermined",
      canAskAgain: true,
    };
  }
}

async function requestWebCameraPermission() {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      granted: false,
      status: "denied",
      canAskAgain: false,
    };
  }

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment",
        },
      },
      audio: false,
    });

    window.localStorage.setItem(CAMERA_GRANTED_STORAGE_KEY, "true");

    return {
      granted: true,
      status: "granted",
      canAskAgain: true,
    };
  } catch (error) {
    window.localStorage.removeItem(CAMERA_GRANTED_STORAGE_KEY);

    const blocked =
      error?.name === "NotAllowedError" || error?.name === "SecurityError";

    return {
      granted: false,
      status: blocked ? "denied" : "undetermined",
      canAskAgain: !blocked,
    };
  } finally {
    stream?.getTracks?.().forEach((track) => {
      track.stop();
    });
  }
}

export default function MenuScreen({ navigation }) {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.current);

  const [nativeCameraPermission, requestNativeCameraPermission] =
    useCameraPermissions();

  const [webCameraPermission, setWebCameraPermission] = useState(null);

  const [locationPermission, setLocationPermission] = useState(null);
  const [exportingUserData, setExportingUserData] = useState(false);
  const [productSearchEngineSubtitle, setProductSearchEngineSubtitle] =
    useState("Motor activo: Google");

  const { clearActiveListsState, clearArchivedListsState, clearAllListsState } =
    useLists();

  const tabBarHeight = useBottomTabBarHeight();
  const { reloadStoresFromSeed } = useStores();

  const handleSignOut = () => {
    safeAlert("Cerrar sesión", "¿Quieres cerrar tu sesión de Shopp?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const headerConfig = useMemo(
    () =>
      buildHeaderConfig({
        title: "Settings",
        preset: "light",
      }),
    [],
  );

  const cameraPermission =
    Platform.OS === "web" ? webCameraPermission : nativeCameraPermission;

  useEffect(() => {
    let mounted = true;

    async function loadWebCameraPermission() {
      if (Platform.OS !== "web") {
        return;
      }

      const result = await getWebCameraPermissionStatus();

      if (mounted) {
        setWebCameraPermission(result);
      }
    }

    loadWebCameraPermission();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useEffect(() => {
    let mounted = true;

    async function loadLocationPermission() {
      try {
        if (Platform.OS === "web") {
          if (
            typeof navigator !== "undefined" &&
            navigator.permissions?.query
          ) {
            const result = await navigator.permissions.query({
              name: "geolocation",
            });

            if (!mounted) return;

            setLocationPermission({
              granted: result.state === "granted",
              status:
                result.state === "granted"
                  ? "granted"
                  : result.state === "denied"
                    ? "denied"
                    : "undetermined",
              canAskAgain: result.state !== "denied",
            });

            return;
          }

          if (mounted) {
            setLocationPermission({
              granted: false,
              status: "undetermined",
              canAskAgain: true,
            });
          }

          return;
        }

        const result = await Location.getForegroundPermissionsAsync();

        if (mounted) {
          setLocationPermission(result);
        }
      } catch (error) {
        console.warn("[MenuScreen] location permission error", error);

        if (mounted) {
          setLocationPermission({
            granted: false,
            status: "undetermined",
            canAskAgain: true,
          });
        }
      }
    }

    loadLocationPermission();

    return () => {
      mounted = false;
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === "web") {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          setLocationPermission({
            granted: false,
            status: "denied",
            canAskAgain: false,
          });

          safeAlert(
            "Ubicación no disponible",
            "Este navegador no permite usar geolocalización.",
          );

          return;
        }

        const result = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              resolve({
                granted: true,
                status: "granted",
                canAskAgain: true,
              });
            },
            (error) => {
              const blocked = error?.code === 1;

              resolve({
                granted: false,
                status: blocked ? "denied" : "undetermined",
                canAskAgain: !blocked,
              });
            },
            {
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 60000,
            },
          );
        });

        setLocationPermission(result);
        return;
      }

      const result = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(result);
    } catch (error) {
      console.warn("[MenuScreen] request location permission error", error);

      setLocationPermission({
        granted: false,
        status: "undetermined",
        canAskAgain: true,
      });
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === "web") {
      const result = await requestWebCameraPermission();

      setWebCameraPermission(result);

      return result;
    }

    return requestNativeCameraPermission();
  };

  const goToProfile = () => {
    navigation.navigate(ROUTES.PROFILE);
  };

  const goToProductSearchEngines = () => {
    navigation.navigate(ROUTES.SEARCH_ENGINE_SETTINGS, {
      type: "product",
    });
  };

  const goToBookSearchEngines = () => {
    navigation.navigate(ROUTES.SEARCH_ENGINE_SETTINGS, {
      type: "book",
    });
  };

  const goToBarcodeSettings = () => {
    navigation.navigate(ROUTES.BARCODE_SETTINGS);
  };

  const goToScannedHistory = () => {
    navigation.navigate(ROUTES.SCANNER_TAB, {
      screen: ROUTES.SCANNED_HISTORY,
    });
  };

  const goToShoppingLists = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: ROUTES.SHOPPING_TAB,
          params: { screen: ROUTES.SHOPPING_LISTS },
        },
      ],
    });
  };

  const handleExportUserData = async () => {
    if (exportingUserData) return;

    try {
      setExportingUserData(true);

      const result = await exportUserDataToJsonFile();
      const exportMessage = result.shared
        ? `Se ha generado el fichero ${result.filename}.`
        : result.platform === "web"
          ? `Se ha descargado el fichero ${result.filename}.`
          : `Se ha guardado el fichero ${result.filename} en el almacenamiento local de la app.`;

      safeAlert("Exportación completada", exportMessage);
    } catch (error) {
      console.warn("[MenuScreen] export user data error", error);

      safeAlert(
        "Error al exportar",
        "No se pudieron exportar los datos del usuario y el historial de compras.",
      );
    } finally {
      setExportingUserData(false);
    }
  };

  const handleClearActiveLists = async () => {
    await clearActiveLists();
    clearActiveListsState();
    goToShoppingLists();
  };

  const handleClearArchivedLists = async () => {
    await clearArchivedLists();
    clearArchivedListsState();
    goToShoppingLists();
  };

  const handleClearPurchaseHistory = async () => {
    await clearPurchaseHistory();
    goToShoppingLists();
  };

  const handleClearScannedHistory = async () => {
    await clearScannedHistory();
    goToScannedHistory();
  };

  const handleReloadStores = () => {
    safeAlert(
      "Recargar tiendas",
      "Se eliminarán los cambios locales en tiendas y se volverán a cargar desde los datos iniciales. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recargar",
          style: "destructive",
          onPress: async () => {
            await reloadStoresFromSeed();
            goToShoppingLists();
          },
        },
      ],
    );
  };

  const handleClearAllStorage = () => {
    safeAlert(
      "Borrar almacenamiento",
      "¿Seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: async () => {
            await clearStorage();
            clearAllListsState();
            await clearScannedHistory();
            await reloadStoresFromSeed();
            goToShoppingLists();
          },
        },
      ],
    );
  };

  const loadProductSearchEngineSubtitle = useCallback(async () => {
    try {
      const settings = await getSearchSettings();
      const subtitle = buildProductSearchEngineSubtitle(settings);

      setProductSearchEngineSubtitle(subtitle);
    } catch (error) {
      console.warn("[MenuScreen] product search settings error", error);

      const fallbackSubtitle = buildProductSearchEngineSubtitle(
        DEFAULT_SEARCH_SETTINGS,
      );

      setProductSearchEngineSubtitle(fallbackSubtitle);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProductSearchEngineSubtitle();
    }, [loadProductSearchEngineSubtitle]),
  );

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: tabBarHeight + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>Shopp</Text>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.headerIconBox}>
              <Ionicons name="settings-outline" size={26} color="#0f172a" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>

            <UserAccountCard user={currentUser} />

            <SettingsCard
              icon="person-circle-outline"
              title="Mi perfil"
              subtitle="Editar alias público, teléfono y privacidad de Parking"
              onPress={goToProfile}
            />

            <SettingsCard
              icon="log-out-outline"
              title="Cerrar sesión"
              subtitle="Salir de tu cuenta de Shopp en este dispositivo"
              danger
              onPress={handleSignOut}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Búsqueda</Text>

            <SettingsCard
              icon="search-outline"
              title="Product Search Engines"
              subtitle={productSearchEngineSubtitle}
              onPress={goToProductSearchEngines}
            />

            <SettingsCard
              icon="book-outline"
              title="Book Search Engines"
              subtitle="Google Books, Open Library..."
              onPress={goToBookSearchEngines}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escáner</Text>

            <SettingsCard
              icon="barcode-outline"
              title="Configuración del código de barras"
              subtitle="Formatos admitidos: EAN-13, EAN-8..."
              onPress={goToBarcodeSettings}
            />

            <SettingsCard
              icon="time-outline"
              title="Historial de escaneos"
              subtitle="Consulta los códigos escaneados recientemente"
              onPress={goToScannedHistory}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos</Text>

            <SettingsCard
              icon="download-outline"
              title="Exportar datos a JSON"
              subtitle="Genera un fichero con datos del usuario, listas, historial de compras e historial de escaneos"
              badge={exportingUserData ? "..." : "JSON"}
              disabled={exportingUserData}
              onPress={handleExportUserData}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permisos</Text>

            <View style={styles.permissionsCard}>
              <View style={styles.permissionsHeader}>
                <View style={styles.permissionsHeaderTextBox}>
                  <Text style={styles.permissionsTitle}>
                    Accesos del dispositivo
                  </Text>

                  <Text style={styles.permissionsSubtitle}>
                    Cámara, micrófono, ubicación y permisos necesarios para la
                    app
                  </Text>
                </View>

                <Ionicons
                  name="shield-checkmark-outline"
                  size={24}
                  color="#0f172a"
                />
              </View>

              <PermissionRow
                icon="camera-outline"
                title="Cámara"
                description="Necesaria para escanear códigos de barras."
                permission={cameraPermission}
                onPress={() =>
                  handlePermissionPress(
                    cameraPermission,
                    requestCameraPermission,
                    "Cámara",
                  )
                }
              />

              {Platform.OS !== "web" ? (
                <PermissionRow
                  icon="mic-outline"
                  title="Micrófono"
                  description="Necesario solo si grabas vídeo con audio."
                  permission={null}
                  onPress={() => {
                    safeAlert(
                      "Micrófono",
                      "Shopp no necesita micrófono para escanear códigos de barras.",
                    );
                  }}
                />
              ) : null}

              <PermissionRow
                icon="location-outline"
                title="Ubicación"
                description="Necesaria para tiendas cercanas y mapas."
                permission={locationPermission}
                onPress={() =>
                  handlePermissionPress(
                    locationPermission,
                    requestLocationPermission,
                    "Ubicación",
                  )
                }
              />

              {Platform.OS === "web" ? (
                <Text style={styles.permissionNote}>
                  En web, los permisos dependen del navegador, del uso de HTTPS
                  y de los ajustes del sitio.
                </Text>
              ) : (
                <Text style={styles.permissionNote}>
                  Si un permiso ya está concedido, Android/iOS no permiten
                  volver a mostrar el diálogo del sistema desde la app. Para
                  probar el flujo otra vez, revoca el permiso desde Ajustes.
                </Text>
              )}
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>

            <SettingsCard
              icon="trash-outline"
              title="Borrar listas activas"
              subtitle="Elimina las listas de compra que todavía no están archivadas"
              danger
              onPress={() =>
                showDestructiveConfirm(
                  "Borrar listas activas",
                  "¿Seguro?",
                  "Borrar",
                  handleClearActiveLists,
                )
              }
            />

            <SettingsCard
              icon="file-tray-outline"
              title="Borrar listas archivadas"
              subtitle="Elimina las listas guardadas como archivadas"
              danger
              onPress={() =>
                showDestructiveConfirm(
                  "Borrar listas archivadas",
                  "¿Seguro?",
                  "Borrar",
                  handleClearArchivedLists,
                )
              }
            />

            <SettingsCard
              icon="receipt-outline"
              title="Borrar historial de compras"
              subtitle="Limpia los registros generados a partir de compras anteriores"
              danger
              onPress={() =>
                showDestructiveConfirm(
                  "Borrar historial de compras",
                  "¿Seguro?",
                  "Borrar",
                  handleClearPurchaseHistory,
                )
              }
            />

            <SettingsCard
              icon="barcode-outline"
              title="Borrar historial de escaneos"
              subtitle="Elimina productos y códigos guardados desde el scanner"
              danger
              onPress={() =>
                showDestructiveConfirm(
                  "Borrar historial de escaneos",
                  "¿Seguro?",
                  "Borrar",
                  handleClearScannedHistory,
                )
              }
            />

            <SettingsCard
              icon="refresh-outline"
              title="Recargar tiendas"
              subtitle="Restaura las tiendas desde los datos iniciales del proyecto"
              danger
              onPress={handleReloadStores}
            />

            <SettingsCard
              icon="close-circle-outline"
              title="Borrar almacenamiento completo"
              subtitle="Elimina todos los datos locales guardados por la aplicación"
              danger
              onPress={handleClearAllStorage}
            />
          </View>

          <View style={styles.footerSpace} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  headerEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
  },

  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  card: {
    minHeight: 76,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  disabledCard: {
    opacity: 0.55,
  },

  dangerCard: {
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
  },

  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  dangerIconBox: {
    backgroundColor: "#fee2e2",
  },

  cardTextBox: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  dangerText: {
    color: "#dc2626",
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  cardBadge: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },

  cardBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0369a1",
  },

  userCard: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  userTextBox: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },

  userEmail: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  userId: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },

  permissionsCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  permissionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  permissionsHeaderTextBox: {
    flex: 1,
    paddingRight: 10,
  },

  permissionsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  permissionsSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  permissionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  permissionTextBox: {
    flex: 1,
    minWidth: 0,
  },

  permissionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },

  permissionDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: "#64748b",
  },

  permissionBadge: {
    marginLeft: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#fff",
  },

  permissionBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  permissionNote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
  },

  footerSpace: {
    height: 24,
  },
});

```

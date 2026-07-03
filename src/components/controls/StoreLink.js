import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { openExternalUrl } from "@/utils/openExternalUrl";
import { Ionicons } from "@expo/vector-icons";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function buildStoreSearchQuery({ store, queryPrefix }) {
  if (!store?.name) return "";

  const parts = [queryPrefix, store.name, store.city, store.zipcode].filter(
    Boolean,
  );

  return parts.join(" ");
}

function buildGoogleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/* -------------------------------------------------
   Component
-------------------------------------------------- */
export default function StoreLink({
  store,
  labelPrefix = "Última tienda:",
  queryPrefix = "",
  iconName = "storefront-outline",
  iconColor = "#2563EB",
  textColor = "#2563EB",
  onPress,
  numberOfLines = 1,
  style,
  textStyle,
}) {
  if (!store?.name) return null;

  const handlePress = () => {
    if (typeof onPress === "function") {
      onPress(store);
      return;
    }

    const query = buildStoreSearchQuery({ store, queryPrefix });

    if (!query) return;

    openExternalUrl(buildGoogleSearchUrl(query));
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={iconName} size={14} color={iconColor} />

      <Text
        style={[styles.text, { color: textColor }, textStyle]}
        numberOfLines={numberOfLines}
      >
        {labelPrefix ? `${labelPrefix} ${store.name}` : store.name}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },

  pressed: {
    opacity: 0.65,
  },

  text: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

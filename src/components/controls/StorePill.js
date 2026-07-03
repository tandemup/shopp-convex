import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StorePill({ store, onPressStore }) {
  const handlePressStore = () => {
    if (!store?.id) return;
    onPressStore?.(store.id);
  };

  if (!store) {
    return (
      <View style={[styles.metaPill, styles.storePill, styles.storePillMuted]}>
        <Ionicons name="location-outline" size={14} color="#9CA3AF" />

        <Text style={styles.storeMutedText} numberOfLines={1}>
          Sin tienda
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePressStore}
      disabled={!onPressStore}
      style={({ pressed }) => [
        styles.metaPill,
        styles.storePill,
        pressed && styles.storePillPressed,
        !onPressStore && styles.storePillDisabled,
      ]}
      hitSlop={6}
    >
      <Ionicons name="location-outline" size={14} color="#2563EB" />

      <Text style={styles.storeText} numberOfLines={1}>
        {store.name || "Tienda"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metaPill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  storePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  storePillPressed: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
    transform: [{ scale: 0.98 }],
  },

  storePillDisabled: {
    opacity: 0.8,
  },

  storePillMuted: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },

  storeText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },

  storeMutedText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
});

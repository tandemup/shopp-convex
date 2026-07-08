import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StorePill({
  store,
  onPressStore,
  placeholder = "Especificar tienda",
  disabled = false,
  style,
  textStyle,
}) {
  const hasStore = !!store?.id;
  const isPressable = !!onPressStore && !disabled;

  const handlePressStore = () => {
    if (!isPressable) return;

    /*
     * Enviamos la tienda completa si existe.
     * Si no existe, enviamos null.
     *
     * Esto permite usar el mismo componente para:
     * - cambiar tienda existente
     * - especificar tienda cuando todavía no hay ninguna
     */
    onPressStore(hasStore ? store : null);
  };

  return (
    <Pressable
      onPress={handlePressStore}
      disabled={!isPressable}
      style={({ pressed }) => [
        styles.metaPill,
        styles.storePill,
        !hasStore && styles.storePillMuted,
        pressed && isPressable && styles.storePillPressed,
        !isPressable && styles.storePillDisabled,
        style,
      ]}
      hitSlop={6}
    >
      <Ionicons
        name={hasStore ? "location-outline" : "add-circle-outline"}
        size={14}
        color={hasStore ? "#2563EB" : "#64748B"}
      />

      <Text
        style={[hasStore ? styles.storeText : styles.storeMutedText, textStyle]}
        numberOfLines={1}
      >
        {hasStore ? store.name || "Tienda" : placeholder}
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
    maxWidth: "100%",
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
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },

  storeText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },

  storeMutedText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
});

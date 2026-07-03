import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

/**
 * StoreFilterBadges
 *
 * Muestra un conjunto de badges con las tiendas disponibles.
 * Incluye siempre la opción "Todas".
 */
export default function StoreFilterBadges({
  stores = [],
  value = null,
  onChange,
}) {
  return (
    <View style={styles.container}>
      {/* Todas */}
      <Badge
        label="Todas"
        active={value === null}
        onPress={() => onChange(null)}
      />

      {stores.map((store) => (
        <Badge
          key={store.id}
          label={store.name}
          active={value === store.id}
          onPress={() => onChange(store.id)}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------
   Badge
-------------------------------------------------- */
function Badge({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.badge, active && styles.badgeActive]}
    >
      <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },

  badgeActive: {
    backgroundColor: "#2563EB",
  },

  badgeText: {
    fontSize: 13,
    color: "#374151",
  },

  badgeTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});

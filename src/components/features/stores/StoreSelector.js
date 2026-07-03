import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StoreSelector({
  store,
  onPress,
  onInfoPress,
  disabled = false,
}) {
  const handleInfo = (e) => {
    e?.stopPropagation?.();
    if (store && onInfoPress) {
      onInfoPress(store);
    }
  };

  const content = (
    <>
      {/* 🏬 icono tienda → abre info */}
      <TouchableOpacity onPress={handleInfo} disabled={!store} hitSlop={10}>
        <Ionicons
          name="storefront"
          size={20}
          color={disabled ? "#999" : store ? "#007bff" : "#9ca3af"}
        />
      </TouchableOpacity>

      <View style={styles.middleColumn}>
        <Text style={styles.label}>Tienda seleccionada</Text>

        <Text style={styles.name} numberOfLines={1}>
          {store?.name || "Seleccionar tienda"}
        </Text>

        {/* 🔥 mantiene altura constante */}
        <Text style={styles.address} numberOfLines={1}>
          {store?.address || " "}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#777" />
    </>
  );

  if (disabled) {
    return <View style={[styles.box, styles.disabledBox]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.box, store && { borderColor: "#007bff" }]}
      onPress={onPress}
      onLongPress={handleInfo} // 🔥 longpress → info
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center", // 🔥 clave
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 64, // 🔥 fija altura

    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  disabledBox: {
    backgroundColor: "#f9fafb",
    borderColor: "#eee",
  },

  middleColumn: {
    marginLeft: 12,
    flex: 1,
  },

  label: {
    fontSize: 11,
    color: "#9ca3af",
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  address: {
    fontSize: 12,
    color: "#6b7280",
  },
});

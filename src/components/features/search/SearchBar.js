import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Buscar…",
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={18} color="#777" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChange}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#ffffff",
    borderRadius: 12,

    paddingHorizontal: 14,
    height: 48,

    // Sombra iOS
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },

    // Sombra Android
    elevation: 3,
  },

  icon: {
    marginRight: 8,
    opacity: 0.6,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#222",
    paddingVertical: 6,
    outlineStyle: "none",
  },
});

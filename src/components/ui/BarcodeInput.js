import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BarcodeInput({
  value,
  onChangeText,
  onPressScanner,
  onPressSearch,
  placeholder = "EAN-13",
  editable = true,
  autoFocus = false,
  style,
  inputStyle,
}) {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        autoFocus={autoFocus}
        keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
        inputMode="numeric"
        clearButtonMode="while-editing"
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressScanner}
          activeOpacity={0.75}
          disabled={!editable}
        >
          <Ionicons name="barcode-outline" size={22} color="#2563EB" />
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressSearch}
          activeOpacity={0.75}
          disabled={!editable}
        >
          <Ionicons name="search-outline" size={23} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 48,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,

    paddingLeft: 14,
    paddingRight: 6,

    // Sombra iOS
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },

    // Sombra Android
    elevation: 3,
  },

  input: {
    flex: 1,
    minWidth: 0,

    height: 48,

    fontSize: 16,
    color: "#222",

    paddingVertical: 6,
    paddingRight: 8,

    outlineStyle: "none",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,

    //backgroundColor: "rgba(249, 250, 251, 0.72)",
    //borderRadius: 10,
    //borderWidth: 1,
    //borderColor: "rgba(229, 231, 235, 0.85)",

    overflow: "hidden",
  },

  iconButton: {
    width: 42,
    height: 38,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },

  separator: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(229, 231, 235, 0.9)",
  },
});

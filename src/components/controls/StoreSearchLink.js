import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openExternalUrl } from "@/utils/openExternalUrl";

export function StoreSearchLink({ store, onPressStore }) {
  if (!store) {
    return <Text style={styles.storeMutedText}>Sin tienda</Text>;
  }

  const handlePress = () => {
    if (onPressStore) {
      onPressStore(store.id);
      return;
    }

    openExternalUrl(
      `https://www.google.com/search?q=${encodeURIComponent(store.name)}`,
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.storeLink}>
      <Ionicons name="location-outline" size={16} color="#2563EB" />
      <Text style={styles.storeText} numberOfLines={1}>
        {store.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
});

// components/WebZoomResetButton.js

import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function WebZoomResetButton() {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;

    const updateZoomState = () => {
      const scale = window.visualViewport?.scale ?? 1;
      setIsZoomed(scale > 1.01);
    };

    updateZoomState();

    window.visualViewport?.addEventListener("resize", updateZoomState);
    window.visualViewport?.addEventListener("scroll", updateZoomState);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateZoomState);
      window.visualViewport?.removeEventListener("scroll", updateZoomState);
    };
  }, []);

  if (Platform.OS !== "web") return null;

  const recenterScreen = () => {
    document.activeElement?.blur?.();

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    const viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) return;

    const originalContent =
      viewport.getAttribute("content") || "width=device-width, initial-scale=1";

    viewport.setAttribute("content", "width=device-width, initial-scale=1");

    window.requestAnimationFrame(() => {
      viewport.setAttribute("content", originalContent);
      window.scrollTo(0, 0);
    });
  };

  const reloadScreen = () => {
    document.activeElement?.blur?.();
    window.location.reload();
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={recenterScreen}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isZoomed && styles.buttonHighlighted,
        ]}
      >
        <Ionicons name="contract-outline" size={18} color="#374151" />
        <Text style={styles.buttonText}>Recentrar</Text>
      </Pressable>

      {isZoomed && (
        <Pressable
          onPress={reloadScreen}
          style={({ pressed }) => [
            styles.reloadButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="refresh-outline" size={18} color="#374151" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  button: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  buttonHighlighted: {
    borderColor: "#F59E0B",
  },

  reloadButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  buttonPressed: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
});

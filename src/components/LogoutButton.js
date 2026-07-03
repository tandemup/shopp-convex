import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LogoutButton() {
  const { signOut } = useAuthActions();

  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Pressable
      style={[styles.button, submitting && styles.disabledButton]}
      onPress={handleLogout}
      disabled={submitting}
    >
      {submitting ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#dc2626",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});

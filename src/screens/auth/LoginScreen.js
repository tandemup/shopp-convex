import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuthActions } from "@convex-dev/auth/react";

import { safeAlert } from "@/src/components/ui/alert/safeAlert";

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      safeAlert(
        "Datos incompletos",
        "Introduce email y contraseña para iniciar sesión.",
      );
      return;
    }

    try {
      setBusy(true);

      const formData = new FormData();
      formData.append("email", cleanEmail);
      formData.append("password", password);
      formData.append("flow", "signIn");

      await signIn("password", formData);

      /*
        No hace falta navegar manualmente.
        App.js cambiará automáticamente a MainTabs mediante <Authenticated>.
      */
    } catch (error) {
      console.error("Error en login:", error);

      safeAlert(
        "No se pudo iniciar sesión",
        "Revisa el email y la contraseña.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.appName}>Shopp</Text>
        <Text style={styles.title}>Iniciar sesión</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="usuario@email.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!busy}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Introduce tu contraseña"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!busy}
        />

        <TouchableOpacity
          style={[styles.primaryButton, busy && styles.disabledButton]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Register")}
          activeOpacity={0.75}
          disabled={busy}
        >
          <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    padding: 20,
  },

  keyboardContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#2563EB",
    textAlign: "center",
    marginBottom: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.65,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    marginTop: 18,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});

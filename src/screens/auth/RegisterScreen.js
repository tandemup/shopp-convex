import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  const emailIsValid = normalizedEmail.includes("@");
  const passwordIsValid = password.length >= 8;

  const canSubmit = emailIsValid && passwordIsValid && !submitting;

  const handleRegister = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await signIn("password", {
        email: normalizedEmail,
        password,
        flow: "signUp",
      });
    } catch (error) {
      console.error("Register error:", error);
      setErrorMessage(
        "No se pudo crear la cuenta. Puede que el email ya esté registrado.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Crear cuenta</Text>

        <Text style={styles.subtitle}>
          Regístrate para sincronizar tus datos de Shopp.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            style={styles.input}
          />
        </View>

        <Text style={styles.helperText}>
          La contraseña debe tener al menos 8 caracteres.
        </Text>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
          onPress={handleRegister}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Crear cuenta</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>Ya tengo cuenta. Entrar.</Text>
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    color: "#0f172a",
  },
  helperText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: -6,
    marginBottom: 16,
  },
  errorText: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  linkButton: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "800",
  },
  backButton: {
    marginTop: 14,
    alignItems: "center",
  },
  backText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
  },
});

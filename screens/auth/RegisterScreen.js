import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { safeAlert } from "@/components/ui/alert/safeAlert";

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password || !repeatPassword) {
      safeAlert("Faltan datos", "Introduce email y contraseña.");
      return;
    }

    if (password.length < 8) {
      safeAlert(
        "Contraseña débil",
        "La contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }

    if (password !== repeatPassword) {
      safeAlert("Contraseñas distintas", "Las contraseñas no coinciden.");
      return;
    }

    try {
      setBusy(true);

      const formData = new FormData();
      formData.append("email", cleanEmail);
      formData.append("password", password);
      formData.append("flow", "signUp");

      await signIn("password", formData);
    } catch (error) {
      console.error(error);
      safeAlert(
        "No se pudo crear la cuenta",
        "Prueba con otro email o revisa los datos.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta en Shopp</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        placeholder="Repetir contraseña"
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        onPress={handleRegister}
        disabled={busy}
        style={[styles.button, busy && styles.buttonDisabled]}
      >
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>Crear cuenta</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Ya tengo cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    marginTop: 18,
    color: "#2563eb",
    fontWeight: "600",
  },
});

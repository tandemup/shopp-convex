import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";

const STEP_REGISTER = "register";
const STEP_VERIFY = "verify";

const VERIFICATION_CODE_LENGTH = 8;

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function extractErrorMessage(error) {
  return error?.data?.message || error?.message || String(error || "");
}

function getRegisterError(error) {
  const message = extractErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  console.error("Error completo de registro:", error);
  console.error("Mensaje de registro:", message);

  if (
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("invalidaccountid") ||
    normalizedMessage.includes("account already")
  ) {
    return "Ya existe una cuenta asociada a este correo.";
  }

  if (
    normalizedMessage.includes("invalidsecret") ||
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("contraseña")
  ) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  if (
    normalizedMessage.includes("resend") ||
    normalizedMessage.includes("sendverificationrequest") ||
    normalizedMessage.includes("no se pudo enviar")
  ) {
    return "No se pudo enviar el código de verificación.";
  }

  if (
    normalizedMessage.includes("schema") ||
    normalizedMessage.includes("validator") ||
    normalizedMessage.includes("extra field")
  ) {
    return "Los datos de la cuenta no coinciden con el esquema de Convex.";
  }

  return message || "No se pudo crear la cuenta.";
}

function getVerificationError(error) {
  const message = extractErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  console.error("Error completo de verificación:", error);
  console.error("Mensaje de verificación:", message);

  if (
    normalizedMessage.includes("invalidverificationcode") ||
    normalizedMessage.includes("invalid verification") ||
    normalizedMessage.includes("verification code") ||
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("caduc")
  ) {
    return "El código de verificación no es válido o ha caducado.";
  }

  if (
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Se han realizado demasiados intentos. Espera unos minutos.";
  }

  return message || "No se pudo verificar el correo.";
}

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuthActions();

  const upsertMyProfile = useMutation(api.users.upsertMyProfile);

  const [step, setStep] = useState(STEP_REGISTER);

  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  const validateRegisterForm = () => {
    if (!name.trim()) {
      return "Introduce tu nombre.";
    }

    if (!alias.trim()) {
      return "Introduce un alias.";
    }

    if (!normalizedEmail) {
      return "Introduce tu correo electrónico.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return "Introduce un correo electrónico válido.";
    }

    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    if (!/[A-Z]/.test(password)) {
      return "La contraseña debe contener al menos una letra mayúscula.";
    }

    if (!/[a-z]/.test(password)) {
      return "La contraseña debe contener al menos una letra minúscula.";
    }

    if (!/\d/.test(password)) {
      return "La contraseña debe contener al menos un número.";
    }

    if (password !== passwordConfirmation) {
      return "Las contraseñas no coinciden.";
    }

    return null;
  };

  const saveUserProfile = async () => {
    const profileData = {
      alias: alias.trim() || name.trim() || "anonymous",

      phoneVisible: false,
    };

    if (phone.trim()) {
      profileData.phone = phone.trim();
    }

    /*
     * Tras verificar el correo, el token de sesión puede tardar
     * un instante en propagarse al cliente Convex.
     */
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await upsertMyProfile(profileData);
        return;
      } catch (error) {
        lastError = error;

        const message = extractErrorMessage(error).toLowerCase();

        const authIsNotReady =
          message.includes("usuario no autenticado") ||
          message.includes("unauthenticated") ||
          message.includes("not authenticated");

        if (!authIsNotReady || attempt === 3) {
          throw error;
        }

        await wait(250 * attempt);
      }
    }

    throw lastError;
  };

  const handleRegister = async () => {
    const validationError = validateRegisterForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();

      formData.append("flow", "signUp");
      formData.append("email", normalizedEmail);
      formData.append("password", password);
      formData.append("name", name.trim());

      /*
       * alias y phone no se incluyen aquí porque no forman
       * parte del usuario interno gestionado por Convex Auth.
       */
      await signIn("password", formData);

      setCode("");
      setStep(STEP_VERIFY);
    } catch (error) {
      setErrorMessage(getRegisterError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const normalizedCode = code.replace(/\s/g, "").trim();

    if (!normalizedCode) {
      setErrorMessage("Introduce el código recibido por correo.");
      return;
    }

    if (
      !new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(normalizedCode)
    ) {
      setErrorMessage(
        `El código debe contener ${VERIFICATION_CODE_LENGTH} dígitos.`,
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();

      formData.append("flow", "email-verification");

      formData.append("email", normalizedEmail);

      formData.append("code", normalizedCode);

      /*
       * Verifica el correo e inicia la sesión.
       */
      await signIn("password", formData);

      /*
       * Guarda alias y teléfono en la tabla userProfiles.
       */
      await saveUserProfile();

      /*
       * Normalmente no es necesario navegar manualmente.
       * El componente raíz detectará que el usuario está autenticado.
       */
    } catch (error) {
      setErrorMessage(getVerificationError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRegister = () => {
    setCode("");
    setErrorMessage("");
    setStep(STEP_REGISTER);
  };

  const handleCancel = () => {
    setErrorMessage("");

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation?.navigate?.("AuthHome");
  };

  if (step === STEP_VERIFY) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Verifica tu correo</Text>

          <Text style={styles.description}>
            Hemos enviado un código de verificación a:
          </Text>

          <Text style={styles.email}>{normalizedEmail}</Text>

          <TextInput
            value={code}
            onChangeText={(value) => {
              const digitsOnly = value.replace(/\D/g, "");

              setCode(digitsOnly.slice(0, VERIFICATION_CODE_LENGTH));

              if (errorMessage) {
                setErrorMessage("");
              }
            }}
            placeholder={`Código de ${VERIFICATION_CODE_LENGTH} dígitos`}
            keyboardType="number-pad"
            inputMode="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={VERIFICATION_CODE_LENGTH}
            editable={!loading}
            style={styles.input}
            onSubmitEditing={handleVerifyEmail}
          />

          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

          <Pressable
            onPress={handleVerifyEmail}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading && styles.pressedButton,
              loading && styles.disabledButton,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Verificar correo</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleBackToRegister}
            disabled={loading}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !loading && styles.pressedSecondaryButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Cambiar correo</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Crear una cuenta</Text>

        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="Nombre"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
        />

        <TextInput
          value={alias}
          onChangeText={(value) => {
            setAlias(value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="Alias"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
        />

        <TextInput
          value={phone}
          onChangeText={(value) => {
            setPhone(value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="Teléfono (opcional)"
          keyboardType="phone-pad"
          inputMode="tel"
          editable={!loading}
          style={styles.input}
        />

        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="Contraseña"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
        />

        <TextInput
          value={passwordConfirmation}
          onChangeText={(value) => {
            setPasswordConfirmation(value);

            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          placeholder="Repite la contraseña"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
          onSubmitEditing={handleRegister}
        />

        <Text style={styles.passwordHelp}>
          Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </Text>

        {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !loading && styles.pressedButton,
            loading && styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Crear cuenta</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleCancel}
          disabled={loading}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !loading && styles.pressedSecondaryButton,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  container: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  description: {
    fontSize: 16,
    lineHeight: 23,
    color: "#4b5563",
  },

  email: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  input: {
    width: "100%",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#111827",
  },

  passwordHelp: {
    marginTop: -4,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },

  error: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },

  primaryButton: {
    width: "100%",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    marginTop: 4,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },

  pressedButton: {
    opacity: 0.86,
  },

  pressedSecondaryButton: {
    opacity: 0.65,
  },

  disabledButton: {
    opacity: 0.6,
  },
});

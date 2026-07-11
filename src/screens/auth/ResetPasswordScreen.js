import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";

const STEP_EMAIL = "email";
const STEP_CODE = "code";
const STEP_SUCCESS = "success";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(error) {
  const originalMessage = String(
    error?.data?.message ?? error?.data ?? error?.message ?? error ?? "",
  ).trim();

  const message = originalMessage.toLowerCase();

  console.error("Convex Auth reset error:", {
    error,
    originalMessage,
  });

  if (
    message.includes("verification code") ||
    message.includes("invalid token") ||
    message.includes("invalid code") ||
    message.includes("could not verify")
  ) {
    return "El código no es válido o ha caducado.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Has realizado demasiados intentos. Espera unos minutos.";
  }

  if (
    message.includes("missing `newpassword`") ||
    message.includes("missing newpassword")
  ) {
    return "No se ha enviado correctamente la nueva contraseña.";
  }

  if (
    message.includes("invalid password") ||
    message.includes("password requirements")
  ) {
    return (
      originalMessage ||
      "La contraseña no cumple los requisitos configurados en el servidor."
    );
  }

  if (
    message.includes("account") ||
    message.includes("user") ||
    message.includes("email")
  ) {
    return "No se ha podido completar la operación con ese correo.";
  }

  return originalMessage || "Se ha producido un error. Inténtalo de nuevo.";
}

export default function ResetPasswordScreen({ navigation, route }) {
  const { signIn } = useAuthActions();

  const initialEmail = normalizeEmail(route?.params?.email);

  const [step, setStep] = useState(STEP_EMAIL);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  const passwordChecks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      match:
        newPassword.length > 0 &&
        confirmPassword.length > 0 &&
        newPassword === confirmPassword,
    }),
    [newPassword, confirmPassword],
  );

  const canSubmitEmail = isValidEmail(normalizedEmail) && !isSubmitting;

  const canSubmitPassword =
    code.trim().length > 0 &&
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.match &&
    !isSubmitting;

  const goToLogin = () => {
    navigation?.navigate?.("Login", {
      email: normalizedEmail,
    });
  };

  const handleSendCode = async () => {
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Introduce una dirección de correo válida.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await signIn("password", {
        email: normalizedEmail,
        flow: "reset",
      });

      setEmail(normalizedEmail);
      setStep(STEP_CODE);
    } catch (error) {
      console.error("PASSWORD RESET ERROR COMPLETO:", error);

      const message =
        error instanceof Error
          ? error.message
          : String(error || "Error desconocido");

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  function validateNewPassword(password) {
    if (typeof password !== "string") {
      return "La contraseña no es válida.";
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

    return "";
  }

  const handleResetPassword = async () => {
    const passwordError = validateNewPassword(newPassword);

    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    const normalizedCode = code.trim();

    if (!normalizedCode) {
      setErrorMessage("Introduce el código recibido por correo.");
      return;
    }

    if (!passwordChecks.length) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (
      !passwordChecks.uppercase ||
      !passwordChecks.lowercase ||
      !passwordChecks.number
    ) {
      setErrorMessage(
        "La contraseña debe contener mayúsculas, minúsculas y números.",
      );
      return;
    }

    if (!passwordChecks.match) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await signIn("password", {
        email: normalizedEmail,
        code: normalizedCode,
        newPassword,
        flow: "reset-verification",
      });

      setStep(STEP_SUCCESS);
    } catch (error) {
      console.error("Password reset verification error:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (isSubmitting) {
      return;
    }

    setCode("");
    await handleSendCode();
  };

  const handleChangeEmail = () => {
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setStep(STEP_EMAIL);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>‹ Volver</Text>
            </Pressable>

            <View style={styles.card}>
              {step === STEP_EMAIL && (
                <EmailStep
                  email={email}
                  setEmail={setEmail}
                  errorMessage={errorMessage}
                  isSubmitting={isSubmitting}
                  canSubmit={canSubmitEmail}
                  onSubmit={handleSendCode}
                  onBack={goToLogin}
                />
              )}

              {step === STEP_CODE && (
                <CodeStep
                  email={normalizedEmail}
                  code={code}
                  setCode={setCode}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  passwordChecks={passwordChecks}
                  errorMessage={errorMessage}
                  isSubmitting={isSubmitting}
                  canSubmit={canSubmitPassword}
                  onSubmit={handleResetPassword}
                  onResend={handleResendCode}
                  onChangeEmail={handleChangeEmail}
                />
              )}

              {step === STEP_SUCCESS && <SuccessStep onContinue={goToLogin} />}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmailStep({
  email,
  setEmail,
  errorMessage,
  isSubmitting,
  canSubmit,
  onSubmit,
  onBack,
}) {
  return (
    <>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>🔐</Text>
      </View>

      <Text style={styles.title}>Restablecer contraseña</Text>

      <Text style={styles.description}>
        Introduce el correo asociado a tu cuenta. Te enviaremos un código para
        crear una nueva contraseña.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Correo electrónico</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="nombre@correo.com"
          placeholderTextColor="#8E96A3"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={canSubmit ? onSubmit : undefined}
          editable={!isSubmitting}
          style={styles.input}
        />
      </View>

      <ErrorBox message={errorMessage} />

      <PrimaryButton
        title="Enviar código"
        loadingTitle="Enviando código..."
        isLoading={isSubmitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />

      <Pressable
        onPress={onBack}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.textButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.textButtonLabel}>Volver al inicio de sesión</Text>
      </Pressable>
    </>
  );
}

function CodeStep({
  email,
  code,
  setCode,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  passwordChecks,
  errorMessage,
  isSubmitting,
  canSubmit,
  onSubmit,
  onResend,
  onChangeEmail,
}) {
  return (
    <>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>✉️</Text>
      </View>

      <Text style={styles.title}>Comprueba tu correo</Text>

      <Text style={styles.description}>
        Hemos enviado un código de seguridad a:
      </Text>

      <Text style={styles.emailText}>{email}</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Código de seguridad</Text>

        <TextInput
          value={code}
          onChangeText={(value) =>
            setCode(value.replace(/[^0-9]/g, "").slice(0, 8))
          }
          placeholder="00000000"
          placeholderTextColor="#8E96A3"
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          editable={!isSubmitting}
          maxLength={8}
          style={[styles.input, styles.codeInput]}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nueva contraseña</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nueva contraseña"
            placeholderTextColor="#8E96A3"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!isSubmitting}
            style={styles.passwordInput}
          />

          <Pressable
            onPress={() => setShowPassword((current) => !current)}
            disabled={isSubmitting}
            style={styles.showPasswordButton}
          >
            <Text style={styles.showPasswordText}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Repetir contraseña</Text>

        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repite la contraseña"
          placeholderTextColor="#8E96A3"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={canSubmit ? onSubmit : undefined}
          editable={!isSubmitting}
          style={styles.input}
        />
      </View>

      <PasswordRequirements checks={passwordChecks} />

      <ErrorBox message={errorMessage} />

      <PrimaryButton
        title="Guardar nueva contraseña"
        loadingTitle="Guardando contraseña..."
        isLoading={isSubmitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />

      <View style={styles.secondaryActions}>
        <Pressable
          onPress={onResend}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.textButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.textButtonLabel}>Reenviar código</Text>
        </Pressable>

        <Pressable
          onPress={onChangeEmail}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.textButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryTextButtonLabel}>Usar otro correo</Text>
        </Pressable>
      </View>
    </>
  );
}

function SuccessStep({ onContinue }) {
  return (
    <>
      <View style={[styles.iconCircle, styles.successIconCircle]}>
        <Text style={styles.iconText}>✓</Text>
      </View>

      <Text style={styles.title}>Contraseña actualizada</Text>

      <Text style={styles.description}>
        Tu contraseña se ha cambiado correctamente. Ya puedes iniciar sesión con
        la nueva contraseña.
      </Text>

      <PrimaryButton
        title="Iniciar sesión"
        loadingTitle=""
        isLoading={false}
        disabled={false}
        onPress={onContinue}
      />
    </>
  );
}

function PrimaryButton({ title, loadingTitle, isLoading, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.primaryButtonPressed,
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{loadingTitle}</Text>
        </View>
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </Pressable>
  );
}

function PasswordRequirements({ checks }) {
  return (
    <View style={styles.requirementsBox}>
      <Text style={styles.requirementsTitle}>La contraseña debe contener:</Text>

      <Requirement checked={checks.length} text="8 caracteres como mínimo" />
      <Requirement checked={checks.uppercase} text="Una letra mayúscula" />
      <Requirement checked={checks.lowercase} text="Una letra minúscula" />
      <Requirement checked={checks.number} text="Un número" />
      <Requirement checked={checks.match} text="Las contraseñas coinciden" />
    </View>
  );
}

function Requirement({ checked, text }) {
  return (
    <View style={styles.requirementRow}>
      <Text
        style={[styles.requirementIcon, checked && styles.requirementIconValid]}
      >
        {checked ? "✓" : "○"}
      </Text>

      <Text
        style={[styles.requirementText, checked && styles.requirementTextValid]}
      >
        {text}
      </Text>
    </View>
  );
}

function ErrorBox({ message }) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },

  container: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  backButtonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E6E9EF",

    ...Platform.select({
      web: {
        boxShadow: "0 12px 34px rgba(15, 23, 42, 0.10)",
      },
      ios: {
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.1,
        shadowRadius: 18,
      },
      android: {
        elevation: 5,
      },
    }),
  },

  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  successIconCircle: {
    backgroundColor: "#DCFCE7",
  },

  iconText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#15803D",
  },

  title: {
    color: "#111827",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  description: {
    color: "#667085",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 12,
  },

  emailText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },

  formGroup: {
    marginBottom: 16,
  },

  label: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 7,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#101828",
    fontSize: 16,
    outlineStyle: "none",
  },

  codeInput: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 6,
  },

  passwordContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  passwordInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#101828",
    fontSize: 16,
    outlineStyle: "none",
  },

  showPasswordButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  showPasswordText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "700",
  },

  requirementsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  requirementsTitle: {
    color: "#475467",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },

  requirementIcon: {
    width: 22,
    color: "#98A2B3",
    fontSize: 15,
    fontWeight: "800",
  },

  requirementIconValid: {
    color: "#16A34A",
  },

  requirementText: {
    flex: 1,
    color: "#667085",
    fontSize: 13,
    lineHeight: 19,
  },

  requirementTextValid: {
    color: "#15803D",
  },

  errorBox: {
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },

  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 4,
  },

  primaryButtonPressed: {
    backgroundColor: "#4338CA",
  },

  primaryButtonDisabled: {
    backgroundColor: "#A5B4FC",
    opacity: 0.8,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  textButton: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginTop: 6,
  },

  textButtonLabel: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  secondaryTextButtonLabel: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  secondaryActions: {
    marginTop: 4,
  },

  buttonPressed: {
    opacity: 0.6,
  },
});

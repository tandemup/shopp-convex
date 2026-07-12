import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
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

function PasswordRequirement({ valid, children }) {
  return (
    <View style={styles.requirementRow}>
      <Ionicons
        name={valid ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={valid ? "#16a34a" : "#94a3b8"}
      />

      <Text
        style={[styles.requirementText, valid && styles.requirementTextValid]}
      >
        {children}
      </Text>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuthActions();
  const upsertMyProfile = useMutation(api.users.upsertMyProfile);

  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 980;
  const isTablet = width >= 700 && width < 980;
  const isSmallMobile = width < 390;

  const [step, setStep] = useState(STEP_REGISTER);

  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [code, setCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const passwordIsValid = Object.values(passwordChecks).every(Boolean);

  const passwordsMatch =
    passwordConfirmation.length > 0 && password === passwordConfirmation;

  const registerFormIsValid =
    name.trim().length > 0 &&
    alias.trim().length > 0 &&
    emailIsValid &&
    passwordIsValid &&
    passwordsMatch;

  const verificationCodeIsValid = new RegExp(
    `^\\d{${VERIFICATION_CODE_LENGTH}}$`,
  ).test(code);

  const layoutStyles = useMemo(
    () => ({
      screen: [
        styles.screen,
        isDesktop && styles.screenDesktop,
        isTablet && styles.screenTablet,
      ],

      scrollContent: [
        styles.scrollContent,
        {
          minHeight: height,
        },
        isDesktop && styles.scrollContentDesktop,
        isSmallMobile && styles.scrollContentSmallMobile,
      ],

      shell: [
        styles.shell,
        isDesktop && styles.shellDesktop,
        isTablet && styles.shellTablet,
      ],

      brandPanel: [
        styles.brandPanel,
        isDesktop && styles.brandPanelDesktop,
        !isDesktop && styles.brandPanelMobile,
      ],

      formPanel: [
        styles.formPanel,
        isDesktop && styles.formPanelDesktop,
        isTablet && styles.formPanelTablet,
        isSmallMobile && styles.formPanelSmallMobile,
      ],

      title: [
        styles.title,
        isDesktop && styles.titleDesktop,
        isSmallMobile && styles.titleSmallMobile,
      ],
    }),
    [height, isDesktop, isSmallMobile, isTablet],
  );

  const clearError = () => {
    if (errorMessage) {
      setErrorMessage("");
    }
  };

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

    if (!emailIsValid) {
      return "Introduce un correo electrónico válido.";
    }

    if (!passwordChecks.length) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    if (!passwordChecks.uppercase) {
      return "La contraseña debe contener al menos una letra mayúscula.";
    }

    if (!passwordChecks.lowercase) {
      return "La contraseña debe contener al menos una letra minúscula.";
    }

    if (!passwordChecks.number) {
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

    if (!verificationCodeIsValid) {
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

      await signIn("password", formData);
      await saveUserProfile();
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

  const renderBrandPanel = () => (
    <View style={layoutStyles.brandPanel}>
      <View style={styles.logoCircle}>
        <Ionicons
          name={
            step === STEP_VERIFY ? "mail-open-outline" : "person-add-outline"
          }
          size={42}
          color="#ffffff"
        />
      </View>

      <Text style={styles.brandTitle}>Shopp</Text>

      <Text style={styles.brandSubtitle}>
        {step === STEP_VERIFY
          ? "Solo falta confirmar tu correo para activar la cuenta."
          : "Crea tu cuenta y mantén tus listas y preferencias sincronizadas."}
      </Text>

      {isDesktop ? (
        <View style={styles.desktopFeatureBox}>
          <View style={styles.featureRow}>
            <Ionicons name="cloud-done-outline" size={20} color="#bfdbfe" />

            <Text style={styles.featureText}>
              Tus datos disponibles en todos tus dispositivos.
            </Text>
          </View>

          <View style={styles.featureRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#bfdbfe"
            />

            <Text style={styles.featureText}>
              Acceso protegido mediante verificación por email.
            </Text>
          </View>

          <View style={styles.featureRow}>
            <Ionicons name="people-outline" size={20} color="#bfdbfe" />

            <Text style={styles.featureText}>
              Elige un alias para identificarte en Shopp.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderError = () =>
    errorMessage ? (
      <View style={styles.errorBox}>
        <Ionicons name="alert-circle-outline" size={20} color="#991b1b" />

        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    ) : null;

  const renderRegisterForm = () => (
    <View style={layoutStyles.formPanel}>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.pressedButton,
        ]}
        onPress={handleCancel}
        disabled={loading}
      >
        <Ionicons name="chevron-back" size={20} color="#64748b" />

        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>PASO 1 DE 2</Text>
      </View>

      <Text style={layoutStyles.title}>Crear una cuenta</Text>

      <Text style={styles.subtitle}>
        Completa tus datos para empezar a utilizar Shopp.
      </Text>

      <View style={styles.form}>
        <View style={styles.twoColumnRow}>
          <View style={[styles.field, styles.flexField]}>
            <Text style={styles.label}>Nombre</Text>

            <View style={styles.inputBox}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />

              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  clearError();
                }}
                placeholder="Tu nombre"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
                autoComplete="name"
                editable={!loading}
                style={styles.input}
              />
            </View>
          </View>

          <View style={[styles.field, styles.flexField]}>
            <Text style={styles.label}>Alias</Text>

            <View style={styles.inputBox}>
              <Ionicons
                name="at-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />

              <TextInput
                value={alias}
                onChangeText={(value) => {
                  setAlias(value);
                  clearError();
                }}
                placeholder="Tu alias"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Teléfono</Text>
            <Text style={styles.optionalLabel}>Opcional</Text>
          </View>

          <View style={styles.inputBox}>
            <Ionicons
              name="call-outline"
              size={20}
              color="#64748b"
              style={styles.inputIcon}
            />

            <TextInput
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                clearError();
              }}
              placeholder="Número de teléfono"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              inputMode="tel"
              textContentType="telephoneNumber"
              autoComplete="tel"
              editable={!loading}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>

          <View
            style={[
              styles.inputBox,
              email.length > 0 && !emailIsValid && styles.inputBoxError,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color="#64748b"
              style={styles.inputIcon}
            />

            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearError();
              }}
              placeholder="tu@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
              style={styles.input}
            />
          </View>

          {email.length > 0 && !emailIsValid ? (
            <Text style={styles.fieldHintError}>
              Introduce un email válido.
            </Text>
          ) : null}
        </View>

        <View style={styles.twoColumnRow}>
          <View style={[styles.field, styles.flexField]}>
            <Text style={styles.label}>Contraseña</Text>

            <View style={styles.inputBox}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearError();
                }}
                placeholder="Contraseña"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                editable={!loading}
                style={styles.input}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.passwordButton,
                  pressed && styles.pressedButton,
                ]}
                onPress={() => setShowPassword((current) => !current)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color="#64748b"
                />
              </Pressable>
            </View>
          </View>

          <View style={[styles.field, styles.flexField]}>
            <Text style={styles.label}>Repetir contraseña</Text>

            <View
              style={[
                styles.inputBox,
                passwordConfirmation.length > 0 &&
                  !passwordsMatch &&
                  styles.inputBoxError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />

              <TextInput
                value={passwordConfirmation}
                onChangeText={(value) => {
                  setPasswordConfirmation(value);
                  clearError();
                }}
                placeholder="Repite la contraseña"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPasswordConfirmation}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                editable={!loading}
                style={styles.input}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.passwordButton,
                  pressed && styles.pressedButton,
                ]}
                onPress={() =>
                  setShowPasswordConfirmation((current) => !current)
                }
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPasswordConfirmation
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                <Ionicons
                  name={
                    showPasswordConfirmation ? "eye-off-outline" : "eye-outline"
                  }
                  size={21}
                  color="#64748b"
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.passwordRequirementsBox}>
          <Text style={styles.requirementsTitle}>
            La contraseña debe incluir:
          </Text>

          <View style={styles.requirementsGrid}>
            <PasswordRequirement valid={passwordChecks.length}>
              8 caracteres
            </PasswordRequirement>

            <PasswordRequirement valid={passwordChecks.uppercase}>
              Una mayúscula
            </PasswordRequirement>

            <PasswordRequirement valid={passwordChecks.lowercase}>
              Una minúscula
            </PasswordRequirement>

            <PasswordRequirement valid={passwordChecks.number}>
              Un número
            </PasswordRequirement>
          </View>

          {passwordConfirmation.length > 0 ? (
            <PasswordRequirement valid={passwordsMatch}>
              Las contraseñas coinciden
            </PasswordRequirement>
          ) : null}
        </View>

        {renderError()}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            (!registerFormIsValid || loading) && styles.disabledButton,
            pressed &&
              registerFormIsValid &&
              !loading &&
              styles.primaryButtonPressed,
          ]}
          onPress={handleRegister}
          disabled={!registerFormIsValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>

              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </>
          )}
        </Pressable>

        <View style={styles.loginBox}>
          <Text style={styles.loginText}>¿Ya tienes una cuenta?</Text>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() =>
              navigation.navigate("Login", {
                email: normalizedEmail,
              })
            }
            disabled={loading}
          >
            <Text style={styles.loginLink}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderVerificationForm = () => (
    <View style={layoutStyles.formPanel}>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.pressedButton,
        ]}
        onPress={handleBackToRegister}
        disabled={loading}
      >
        <Ionicons name="chevron-back" size={20} color="#64748b" />

        <Text style={styles.backText}>Cambiar datos</Text>
      </Pressable>

      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>PASO 2 DE 2</Text>
      </View>

      <Text style={layoutStyles.title}>Verifica tu correo</Text>

      <Text style={styles.subtitle}>
        Introduce el código de {VERIFICATION_CODE_LENGTH} dígitos que acabamos
        de enviar.
      </Text>

      <View style={styles.emailDestinationBox}>
        <View style={styles.emailDestinationIcon}>
          <Ionicons name="mail-outline" size={22} color="#2563eb" />
        </View>

        <View style={styles.emailDestinationContent}>
          <Text style={styles.emailDestinationLabel}>Código enviado a</Text>

          <Text style={styles.emailDestinationValue}>{normalizedEmail}</Text>
        </View>
      </View>

      <View style={styles.verificationForm}>
        <Text style={styles.label}>Código de verificación</Text>

        <TextInput
          value={code}
          onChangeText={(value) => {
            const digitsOnly = value.replace(/\D/g, "");

            setCode(digitsOnly.slice(0, VERIFICATION_CODE_LENGTH));

            clearError();
          }}
          placeholder="00000000"
          placeholderTextColor="#cbd5e1"
          keyboardType="number-pad"
          inputMode="numeric"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={VERIFICATION_CODE_LENGTH}
          editable={!loading}
          style={styles.codeInput}
          onSubmitEditing={handleVerifyEmail}
        />

        <Text style={styles.codeHelp}>
          Revisa también las carpetas de correo no deseado o promociones.
        </Text>

        {renderError()}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            (!verificationCodeIsValid || loading) && styles.disabledButton,
            pressed &&
              verificationCodeIsValid &&
              !loading &&
              styles.primaryButtonPressed,
          ]}
          onPress={handleVerifyEmail}
          disabled={!verificationCodeIsValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                Verificar y continuar
              </Text>

              <Ionicons name="checkmark" size={21} color="#ffffff" />
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressedButton,
          ]}
          onPress={handleBackToRegister}
          disabled={loading}
        >
          <Ionicons name="create-outline" size={18} color="#2563eb" />

          <Text style={styles.secondaryButtonText}>
            Cambiar correo electrónico
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={layoutStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={layoutStyles.scrollContent}
      >
        <View style={layoutStyles.shell}>
          {renderBrandPanel()}

          {step === STEP_VERIFY
            ? renderVerificationForm()
            : renderRegisterForm()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  screenDesktop: {
    backgroundColor: "#e2e8f0",
  },

  screenTablet: {
    backgroundColor: "#eef2ff",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },

  scrollContentDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 48,
  },

  scrollContentSmallMobile: {
    paddingHorizontal: 14,
    paddingVertical: 20,
  },

  shell: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },

  shellDesktop: {
    maxWidth: 1180,
    minHeight: 720,
    flexDirection: "row",
  },

  shellTablet: {
    maxWidth: 680,
  },

  brandPanel: {
    backgroundColor: "#2563eb",
  },

  brandPanelDesktop: {
    width: "38%",
    paddingHorizontal: 44,
    paddingVertical: 52,
    justifyContent: "center",
  },

  brandPanelMobile: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 26,
    alignItems: "center",
  },

  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },

  brandTitle: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
  },

  brandSubtitle: {
    marginTop: 12,
    maxWidth: 350,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#dbeafe",
    textAlign: "center",
  },

  desktopFeatureBox: {
    marginTop: 34,
    gap: 17,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  featureText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "#eff6ff",
  },

  formPanel: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },

  formPanelDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 42,
  },

  formPanelTablet: {
    paddingHorizontal: 36,
    paddingVertical: 36,
  },

  formPanelSmallMobile: {
    paddingHorizontal: 18,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingVertical: 6,
    paddingRight: 10,
  },

  backText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  stepBadge: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#dbeafe",
  },

  stepBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#1d4ed8",
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#0f172a",
  },

  titleDesktop: {
    fontSize: 34,
    lineHeight: 40,
  },

  titleSmallMobile: {
    fontSize: 25,
    lineHeight: 31,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: "#64748b",
  },

  form: {
    marginTop: 26,
  },

  verificationForm: {
    marginTop: 26,
  },

  twoColumnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  flexField: {
    flexGrow: 1,
    flexBasis: 230,
  },

  field: {
    marginBottom: 16,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  optionalLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },

  inputBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
  },

  inputBoxError: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff7f7",
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    color: "#0f172a",
    outlineStyle: "none",
  },

  passwordButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
  },

  fieldHintError: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#dc2626",
  },

  passwordRequirementsBox: {
    marginTop: -2,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 15,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  requirementsTitle: {
    marginBottom: 9,
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },

  requirementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 18,
    rowGap: 7,
  },

  requirementRow: {
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  requirementText: {
    marginLeft: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#64748b",
  },

  requirementTextValid: {
    color: "#15803d",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#991b1b",
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2563eb",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 4,
  },

  primaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },

  disabledButton: {
    opacity: 0.5,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryButton: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563eb",
  },

  loginBox: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  loginText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },

  loginButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  loginLink: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2563eb",
  },

  emailDestinationBox: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  emailDestinationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },

  emailDestinationContent: {
    flex: 1,
    marginLeft: 12,
  },

  emailDestinationLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

  emailDestinationValue: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
    color: "#1e3a8a",
  },

  codeInput: {
    width: "100%",
    minHeight: 70,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 8,
    textAlign: "center",
    color: "#0f172a",
    outlineStyle: "none",
  },

  codeHelp: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 19,
    color: "#64748b",
    textAlign: "center",
  },

  pressedButton: {
    opacity: 0.65,
  },
});

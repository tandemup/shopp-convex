import React, { useEffect, useMemo, useState } from "react";
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
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";

function getLoginErrorMessage(error) {
  const originalMessage =
    error instanceof Error ? error.message : String(error || "");

  const message = originalMessage.toLowerCase();

  if (
    message.includes("invalid credentials") ||
    message.includes("invalid password") ||
    message.includes("incorrect password") ||
    message.includes("invalidaccountid")
  ) {
    return "El email o la contraseña no son correctos.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection")
  ) {
    return "No se pudo conectar con el servidor. Comprueba tu conexión.";
  }

  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export default function LoginScreen({ navigation, route }) {
  const { signIn } = useAuthActions();

  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 900;
  const isTablet = width >= 700 && width < 900;
  const isSmallMobile = width < 390;

  const [email, setEmail] = useState(() =>
    String(route?.params?.email || "")
      .trim()
      .toLowerCase(),
  );

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showPasswordChangedMessage, setShowPasswordChangedMessage] = useState(
    route?.params?.passwordChanged === true,
  );

  useEffect(() => {
    const routeEmail = String(route?.params?.email || "")
      .trim()
      .toLowerCase();

    if (routeEmail) {
      setEmail(routeEmail);
    }

    if (route?.params?.passwordChanged) {
      navigation.setParams({
        passwordChanged: undefined,
      });
    }
  }, [navigation, route?.params?.email, route?.params?.passwordChanged]);

  const normalizedEmail = email.trim().toLowerCase();

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const passwordIsValid = password.length > 0;

  const canSubmit = emailIsValid && passwordIsValid && !submitting;

  const layoutStyles = useMemo(() => {
    return {
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

      subtitle: [
        styles.subtitle,
        isDesktop && styles.subtitleDesktop,
        isSmallMobile && styles.subtitleSmallMobile,
      ],
    };
  }, [height, isDesktop, isTablet, isSmallMobile]);

  const handleEmailChange = (value) => {
    setEmail(value);
    setErrorMessage("");
    setShowPasswordChangedMessage(false);
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setErrorMessage("");
    setShowPasswordChangedMessage(false);
  };

  const handleForgotPassword = () => {
    setErrorMessage("");

    navigation.navigate("ResetPassword", {
      email: emailIsValid ? normalizedEmail : "",
    });
  };

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await signIn("password", {
        email: normalizedEmail,
        password,
        flow: "signIn",
      });
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

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
          <View style={layoutStyles.brandPanel}>
            <View style={styles.logoCircle}>
              <Ionicons name="cart-outline" size={42} color="#ffffff" />
            </View>

            <Text style={styles.brandTitle}>Shopp</Text>

            <Text style={styles.brandSubtitle}>
              Listas, tiendas, historial, escáner y parking en una sola app.
            </Text>

            {isDesktop ? (
              <View style={styles.desktopFeatureBox}>
                <View style={styles.featureRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#bfdbfe"
                  />

                  <Text style={styles.featureText}>
                    Sincroniza tus listas de compra.
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons name="barcode-outline" size={20} color="#bfdbfe" />

                  <Text style={styles.featureText}>
                    Guarda productos escaneados.
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons
                    name="storefront-outline"
                    size={20}
                    color="#bfdbfe"
                  />

                  <Text style={styles.featureText}>
                    Consulta tiendas y preferencias.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={layoutStyles.formPanel}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressedButton,
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="#64748b" />

              <Text style={styles.backText}>Volver</Text>
            </Pressable>

            <Text style={layoutStyles.title}>Entrar en Shopp</Text>

            <Text style={layoutStyles.subtitle}>
              Accede con tu email y contraseña para continuar.
            </Text>

            {showPasswordChangedMessage ? (
              <View style={styles.successBox}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#166534"
                />

                <Text style={styles.successText}>
                  La contraseña se ha cambiado correctamente. Ya puedes iniciar
                  sesión.
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
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
                    onChangeText={handleEmailChange}
                    placeholder="tu@email.com"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="next"
                    editable={!submitting}
                    style={styles.input}
                  />
                </View>

                {email.length > 0 && !emailIsValid ? (
                  <Text style={styles.fieldHintError}>
                    Introduce un email válido.
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
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
                    onChangeText={handlePasswordChange}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!submitting}
                    style={styles.input}
                  />

                  <Pressable
                    style={({ pressed }) => [
                      styles.passwordVisibilityButton,
                      pressed && styles.pressedButton,
                    ]}
                    onPress={() => setShowPassword((current) => !current)}
                    disabled={submitting}
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

              <Pressable
                style={({ pressed }) => [
                  styles.forgotPasswordButton,
                  pressed && styles.pressedButton,
                ]}
                onPress={handleForgotPassword}
                disabled={submitting}
              >
                <Text style={styles.forgotPasswordText}>
                  ¿Has olvidado tu contraseña?
                </Text>
              </Pressable>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#991b1b"
                  />

                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  !canSubmit && styles.disabledButton,
                  pressed && canSubmit && styles.primaryButtonPressed,
                ]}
                onPress={handleLogin}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Entrar</Text>

                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </Pressable>

              <View style={styles.registerBox}>
                <Text style={styles.registerText}>¿No tienes cuenta?</Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.registerButton,
                    pressed && styles.pressedButton,
                  ]}
                  onPress={() => navigation.navigate("Register")}
                  disabled={submitting}
                >
                  <Text style={styles.registerLink}>Crear cuenta</Text>
                </Pressable>
              </View>
            </View>
          </View>
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
    maxWidth: 440,
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
    maxWidth: 1040,
    minHeight: 620,
    flexDirection: "row",
  },

  shellTablet: {
    maxWidth: 560,
  },

  brandPanel: {
    backgroundColor: "#2563eb",
  },

  brandPanelDesktop: {
    flex: 1,
    paddingHorizontal: 46,
    paddingVertical: 48,
    justifyContent: "center",
  },

  brandPanelMobile: {
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 28,
    alignItems: "center",
  },

  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
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
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#dbeafe",
    textAlign: "center",
  },

  desktopFeatureBox: {
    marginTop: 34,
    gap: 16,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  featureText: {
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "#eff6ff",
  },

  formPanel: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },

  formPanelDesktop: {
    flex: 1,
    paddingHorizontal: 52,
    paddingVertical: 48,
    justifyContent: "center",
  },

  formPanelTablet: {
    paddingHorizontal: 34,
    paddingVertical: 36,
  },

  formPanelSmallMobile: {
    paddingHorizontal: 18,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    paddingVertical: 6,
    paddingRight: 10,
  },

  backText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "left",
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

  subtitleDesktop: {
    fontSize: 16,
    lineHeight: 24,
  },

  subtitleSmallMobile: {
    fontSize: 14,
    lineHeight: 20,
  },

  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  successText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#166534",
  },

  form: {
    marginTop: 28,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
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

  passwordVisibilityButton: {
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

  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: -10,
    marginBottom: 18,
    paddingVertical: 6,
    paddingLeft: 12,
  },

  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563eb",
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
    opacity: 0.55,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  registerBox: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  registerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },

  registerButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  registerLink: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2563eb",
  },

  pressedButton: {
    opacity: 0.65,
  },
});

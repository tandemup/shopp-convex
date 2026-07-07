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
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuthActions();
  const upsertMyProfile = useMutation(api.users.upsertMyProfile);

  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 900;
  const isTablet = width >= 700 && width < 900;
  const isSmallMobile = width < 390;

  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedAlias = alias.trim();
  const normalizedPhone = phone.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const aliasIsValid = normalizedAlias.length >= 3;
  const emailIsValid = normalizedEmail.includes("@");
  const passwordIsValid = password.length >= 8;

  const canSubmit =
    aliasIsValid && emailIsValid && passwordIsValid && !submitting;

  const layoutStyles = useMemo(() => {
    return {
      screen: [
        styles.screen,
        isDesktop && styles.screenDesktop,
        isTablet && styles.screenTablet,
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
  }, [isDesktop, isTablet, isSmallMobile]);

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

      try {
        await upsertMyProfile({
          alias: normalizedAlias,
          phone: normalizedPhone || undefined,
          phoneVisible: false,
        });
      } catch (profileError) {
        console.warn("Profile creation after sign up failed:", profileError);
      }
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
      style={layoutStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: height,
          },
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        <View style={layoutStyles.shell}>
          <View style={layoutStyles.brandPanel}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add-outline" size={42} color="#ffffff" />
            </View>

            <Text style={styles.brandTitle}>Shopp</Text>

            <Text style={styles.brandSubtitle}>
              Crea tu cuenta para sincronizar listas, tiendas, escaneos,
              historial y preferencias.
            </Text>

            {isDesktop ? (
              <View style={styles.desktopFeatureBox}>
                <View style={styles.featureRow}>
                  <Ionicons
                    name="cloud-done-outline"
                    size={20}
                    color="#bfdbfe"
                  />
                  <Text style={styles.featureText}>
                    Guarda tus datos de forma sincronizada.
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons name="cart-outline" size={20} color="#bfdbfe" />
                  <Text style={styles.featureText}>
                    Recupera tus listas desde otros dispositivos.
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#bfdbfe"
                  />
                  <Text style={styles.featureText}>
                    Accede con tu email y contraseña.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={layoutStyles.formPanel}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="#64748b" />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>

            <Text style={layoutStyles.title}>Crear cuenta</Text>

            <Text style={layoutStyles.subtitle}>
              Regístrate para sincronizar tus datos de Shopp.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Alias público</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={alias}
                    onChangeText={setAlias}
                    placeholder="Ej. 4104-BZG"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="nickname"
                    maxLength={40}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.fieldHelp}>
                  Se mostrará en Chat y Parking. No uses tu nombre real si no
                  quieres identificarte.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Teléfono móvil opcional</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Solo si quieres añadir contacto"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    maxLength={30}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.fieldHelp}>
                  Se guarda privado. En Parking no se muestra salvo que lo
                  actives expresamente más adelante.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    style={styles.input}
                  />
                </View>
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
                    onChangeText={setPassword}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.passwordHintBox}>
                <Ionicons
                  name={
                    passwordIsValid
                      ? "checkmark-circle-outline"
                      : "information-circle-outline"
                  }
                  size={18}
                  color={passwordIsValid ? "#16a34a" : "#64748b"}
                />

                <Text
                  style={[
                    styles.helperText,
                    passwordIsValid && styles.helperTextValid,
                  ]}
                >
                  La contraseña debe tener al menos 8 caracteres.
                </Text>
              </View>

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
                style={[
                  styles.primaryButton,
                  !canSubmit && styles.disabledButton,
                ]}
                onPress={handleRegister}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Crear cuenta</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </Pressable>

              <View style={styles.loginBox}>
                <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>

                <Pressable onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Entrar</Text>
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
    maxWidth: 360,
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

  fieldHelp: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#64748b",
  },

  passwordHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -6,
    marginBottom: 18,
  },

  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#64748b",
  },

  helperTextValid: {
    color: "#16a34a",
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

  disabledButton: {
    opacity: 0.55,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  loginBox: {
    marginTop: 22,
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

  loginLink: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2563eb",
  },
});

import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export default function AuthHomeScreen({ navigation }) {
  const { width } = useWindowDimensions();

  const isLaptop = width >= 900;
  const isTablet = width >= 700 && width < 900;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.page,
          isLaptop && styles.pageLaptop,
          isTablet && styles.pageTablet,
        ]}
      >
        {isLaptop ? (
          <View style={styles.heroPanel}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Shopp</Text>
            </View>

            <Text style={styles.heroTitle}>
              Organiza tus compras, tiendas, historial y parking desde una sola
              app.
            </Text>

            <Text style={styles.heroSubtitle}>
              Guarda tus listas, consulta tus tiendas habituales, revisa compras
              anteriores y configura tus preferencias con una experiencia
              preparada para móvil, tablet y escritorio.
            </Text>

            <View style={styles.heroBullets}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Listas sincronizadas</Text>
              </View>

              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Historial de productos</Text>
              </View>

              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Tiendas y preferencias</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.card,
            isLaptop && styles.cardLaptop,
            isTablet && styles.cardTablet,
          ]}
        >
          <Text style={[styles.logo, isLaptop && styles.logoLaptop]}>
            Shopp
          </Text>

          <Text style={[styles.title, isLaptop && styles.titleLaptop]}>
            Tu lista de la compra inteligente
          </Text>

          <Text style={[styles.subtitle, isLaptop && styles.subtitleLaptop]}>
            Inicia sesión para guardar tus listas, historial, tiendas, parking y
            preferencias.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.primaryButtonText}>Entrar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.resetPasswordButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate("ResetPassword")}
            >
              <Text style={styles.resetPasswordButtonText}>
                ¿Has olvidado tu contraseña?
              </Text>
            </Pressable>
          </View>
          <Text style={styles.footerText}>
            Accede con tu cuenta para mantener tus datos guardados.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  page: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },

  pageTablet: {
    maxWidth: 620,
    paddingHorizontal: 32,
  },

  pageLaptop: {
    maxWidth: 1120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    paddingHorizontal: 48,
    paddingVertical: 48,
  },

  heroPanel: {
    flex: 1,
    maxWidth: 560,
    padding: 32,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },

  heroBadgeText: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "900",
  },

  heroTitle: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 18,
    letterSpacing: -0.8,
  },

  heroSubtitle: {
    fontSize: 17,
    lineHeight: 27,
    color: "#475569",
    maxWidth: 520,
  },

  heroBullets: {
    marginTop: 28,
    gap: 14,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  bulletDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: "#2563eb",
  },

  bulletText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "700",
  },

  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  cardTablet: {
    padding: 32,
  },

  cardLaptop: {
    width: 420,
    padding: 34,
    borderRadius: 28,
  },

  logo: {
    fontSize: 42,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.6,
  },

  logoLaptop: {
    fontSize: 46,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 28,
  },

  titleLaptop: {
    fontSize: 24,
    lineHeight: 31,
  },

  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },

  subtitleLaptop: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },

  actions: {
    gap: 12,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  secondaryButtonText: {
    color: "#1d4ed8",
    fontSize: 16,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  footerText: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 18,
    color: "#94a3b8",
    textAlign: "center",
  },
  resetPasswordButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  resetPasswordButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

function cleanText(value) {
  return String(value || "").trim();
}

function formatAccountLabel(currentUser) {
  if (!currentUser) return "Cuenta de Shopp";

  return (
    currentUser?.email ||
    currentUser?.name ||
    currentUser?._id ||
    "Cuenta de Shopp"
  );
}

export default function ProfileScreen({ navigation }) {
  const currentUser = useQuery(api.users.current);
  const profile = useQuery(api.users.getMyProfile);
  const upsertMyProfile = useMutation(api.users.upsertMyProfile);

  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [scanHistorySyncEnabled, setScanHistorySyncEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  const accountLabel = useMemo(
    () => formatAccountLabel(currentUser),
    [currentUser],
  );

  useEffect(() => {
    if (profile === undefined) return;
    if (formTouched) return;

    if (profile) {
      setAlias(profile.alias || "");
      setPhone(profile.phone || "");
      setPhoneVisible(profile.phoneVisible === true);
      setScanHistorySyncEnabled(profile.scanHistorySyncEnabled === true);
      return;
    }

    setAlias("");
    setPhone("");
    setPhoneVisible(false);
    setScanHistorySyncEnabled(false);
  }, [profile, formTouched]);

  const handleChangeAlias = (value) => {
    setFormTouched(true);
    setAlias(value);
  };

  const handleChangePhone = (value) => {
    setFormTouched(true);
    setPhone(value);
  };

  const handleChangePhoneVisible = (value) => {
    setFormTouched(true);
    setPhoneVisible(value);
  };

  const handleChangeScanHistorySync = (value) => {
    setFormTouched(true);
    setScanHistorySyncEnabled(value);
  };

  const handleSave = async () => {
    const cleanAlias = cleanText(alias);
    const cleanPhone = cleanText(phone);

    if (cleanAlias.length < 2) {
      safeAlert(
        "Alias obligatorio",
        "Escribe un alias público de al menos 2 caracteres.",
      );
      return;
    }

    if (cleanAlias.length > 40) {
      safeAlert(
        "Alias demasiado largo",
        "El alias público no puede tener más de 40 caracteres.",
      );
      return;
    }

    if (cleanPhone.length > 30) {
      safeAlert(
        "Teléfono demasiado largo",
        "El teléfono no puede tener más de 30 caracteres.",
      );
      return;
    }

    try {
      setSaving(true);

      await upsertMyProfile({
        alias: cleanAlias,
        phone: cleanPhone || undefined,
        phoneVisible,
        scanHistorySyncEnabled,
      });

      setFormTouched(false);

      safeAlert(
        "Perfil actualizado",
        "Tu alias y tus preferencias de contacto se han guardado correctamente.",
      );

      navigation?.goBack?.();
    } catch (error) {
      console.warn("[ProfileScreen] save profile error", error);

      safeAlert(
        "No se pudo guardar",
        error?.message || "Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (currentUser === undefined || profile === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={30} color="#14532d" />
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.title}>Mi perfil</Text>
            <Text style={styles.subtitle}>{accountLabel}</Text>
          </View>
        </View>

        {profile ? null : (
          <View style={styles.noticeBox}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#166534"
            />
            <Text style={styles.noticeText}>
              Esta cuenta todavía no tiene perfil. Completa un alias público
              para usar Parking y Chat sin mostrar tu email.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Alias público</Text>
          <TextInput
            value={alias}
            onChangeText={handleChangeAlias}
            placeholder="Ej. 4104-BZG"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
            style={styles.input}
          />
          <Text style={styles.help}>
            Es el nombre visible para otros usuarios en Parking y Chat. No uses
            tu nombre real si quieres proteger tu privacidad.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            value={phone}
            onChangeText={handleChangePhone}
            placeholder="Ej. 600 000 000"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            maxLength={30}
            style={styles.input}
          />
          <Text style={styles.help}>
            El teléfono es opcional. Guárdalo solo si quieres usarlo como dato
            de contacto en funciones de Parking.
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>
                Mostrar teléfono en Parking
              </Text>
              <Text style={styles.helpNoMargin}>
                Por defecto queda oculto. Actívalo solo si quieres que otros
                usuarios puedan verlo.
              </Text>
            </View>

            <Switch
              value={phoneVisible}
              onValueChange={handleChangePhoneVisible}
              disabled={!cleanText(phone)}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>
                Sincronizar historial de escaneos
              </Text>
              <Text style={styles.helpNoMargin}>
                Si está activado, los productos escaneados se guardan en Convex
                para tu cuenta. Si está desactivado, se guardan solo en este
                navegador o teléfono.
              </Text>
            </View>

            <Switch
              value={scanHistorySyncEnabled}
              onValueChange={handleChangeScanHistorySync}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.86}
        >
          <Ionicons name="checkmark" size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBox: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
  },
  noticeBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#14532d",
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  help: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  helpNoMargin: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  switchRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchTextBox: {
    flex: 1,
  },
  switchTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
});

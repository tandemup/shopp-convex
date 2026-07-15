import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

function UserCard({ user, busy, onChangeRole }) {
  const isAdmin = user.role === "admin";
  const label = user.email || user.name || String(user._id);

  return (
    <View style={styles.card}>
      <View style={styles.userIcon}>
        <Ionicons
          name={isAdmin ? "shield-checkmark" : "person-outline"}
          size={23}
          color={isAdmin ? "#15803d" : "#475569"}
        />
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {label}
        </Text>
        {user.name && user.email ? (
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.name}
          </Text>
        ) : null}
        <Text style={styles.userId} numberOfLines={1}>
          {String(user._id)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => onChangeRole(user)}
        style={({ pressed }) => [
          styles.roleButton,
          isAdmin ? styles.adminButton : styles.userButton,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#0f172a" />
        ) : (
          <Text style={isAdmin ? styles.adminText : styles.userText}>
            {isAdmin ? "Admin" : "Usuario"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function AdminUsersScreen() {
  const currentUser = useQuery(api.users.current);
  const users = useQuery(
    api.users.listForAdmin,
    currentUser?.isAdmin ? {} : "skip",
  );
  const setRole = useMutation(api.users.setRole);
  const [busyUserId, setBusyUserId] = useState(null);

  const changeRole = (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const label = user.email || user.name || "este usuario";

    safeAlert(
      nextRole === "admin" ? "Conceder permisos" : "Retirar permisos",
      nextRole === "admin"
        ? `¿Quieres convertir a ${label} en administrador?`
        : `¿Quieres convertir a ${label} en usuario normal?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setBusyUserId(user._id);
              await setRole({ userId: user._id, role: nextRole });
            } catch (error) {
              safeAlert(
                "No se pudo cambiar el rol",
                error?.message || "Se ha producido un error.",
              );
            } finally {
              setBusyUserId(null);
            }
          },
        },
      ],
    );
  };

  if (currentUser === undefined || (currentUser?.isAdmin && users === undefined)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  if (!currentUser?.isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={42} color="#dc2626" />
        <Text style={styles.deniedTitle}>Acceso restringido</Text>
        <Text style={styles.deniedText}>
          Esta pantalla solo está disponible para administradores.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Usuarios registrados</Text>
        <Text style={styles.summaryText}>
          {users.length} {users.length === 1 ? "usuario" : "usuarios"}
        </Text>
      </View>

      {users.map((user) => (
        <UserCard
          key={user._id}
          user={user}
          busy={busyUserId === user._id}
          onChangeRole={changeRole}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  loadingText: { marginTop: 12, color: "#64748b" },
  deniedTitle: { marginTop: 12, fontSize: 20, fontWeight: "800", color: "#0f172a" },
  deniedText: { marginTop: 6, textAlign: "center", color: "#64748b" },
  summary: {
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#dbeafe",
  },
  summaryTitle: { fontSize: 18, fontWeight: "800", color: "#1e3a8a" },
  summaryText: { marginTop: 3, color: "#1d4ed8" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  userIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  userEmail: { marginTop: 2, fontSize: 13, color: "#475569" },
  userId: { marginTop: 3, fontSize: 11, color: "#94a3b8" },
  roleButton: {
    minWidth: 76,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
  },
  adminButton: { borderColor: "#86efac", backgroundColor: "#dcfce7" },
  userButton: { borderColor: "#cbd5e1", backgroundColor: "#f8fafc" },
  adminText: { fontWeight: "800", color: "#15803d" },
  userText: { fontWeight: "700", color: "#475569" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});

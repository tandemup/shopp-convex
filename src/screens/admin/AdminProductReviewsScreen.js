import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

const EMPTY_FORM = {
  barcode: "",
  name: "",
  brand: "",
  category: "",
  imageUrl: "",
  productUrl: "",
  reviewNote: "",
};

function Field({ label, value, onChangeText, multiline = false }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        placeholder={label}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function AdminProductReviewsScreen({ navigation }) {
  const currentUser = useQuery(api.users.current);

  const submissions = useQuery(api.productReviewSubmissions.listForAdmin, {
    status: "pending_review",
  });

  const updateSubmission = useMutation(
    api.productReviewSubmissions.updateForAdmin,
  );

  const approveSubmission = useMutation(
    api.productReviewSubmissions.approveForAdmin,
  );

  const rejectSubmission = useMutation(
    api.productReviewSubmissions.rejectForAdmin,
  );

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const isAdmin =
    currentUser?.isAdmin === true || currentUser?.role === "admin";

  const selectedSubmission = useMemo(() => {
    return submissions?.find((item) => item._id === selectedId);
  }, [submissions, selectedId]);

  useEffect(() => {
    if (!selectedSubmission) {
      return;
    }

    setForm({
      barcode: selectedSubmission.barcode || "",
      name: selectedSubmission.name || "",
      brand: selectedSubmission.brand || "",
      category: selectedSubmission.category || "",
      imageUrl: selectedSubmission.imageUrl || "",
      productUrl: selectedSubmission.productUrl || "",
      reviewNote: selectedSubmission.reviewNote || "",
    });
  }, [selectedSubmission]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const executeAction = async (action, payload) => {
    if (!selectedSubmission) {
      return;
    }

    try {
      setBusy(true);

      await action(payload);

      safeAlert("Revisión", "La operación se ha realizado correctamente.");

      setSelectedId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      safeAlert(
        "Error",
        error?.message || "No se pudo actualizar el producto.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (currentUser === undefined || submissions === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.muted}>Cargando revisiones...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={42} color="#dc2626" />

        <Text style={styles.title}>Acceso restringido</Text>

        <Text style={styles.muted}>
          Esta pantalla solo está disponible para administradores.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.headerIcon}>
          <Ionicons name="clipboard-outline" size={25} color="#2563eb" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
          <Text style={styles.title}>Productos enviados a revisión</Text>
          <Text style={styles.subtitle}>
            Revisa y valida la información aportada por los usuarios.
          </Text>
        </View>
      </View>

      {!selectedSubmission ? (
        <View>
          {submissions.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={32}
                  color="#16a34a"
                />
              </View>
              <Text style={styles.emptyTitle}>Todo está al día</Text>
              <Text style={styles.emptyText}>
                No hay productos pendientes de revisión.
              </Text>
            </View>
          ) : (
            submissions.map((submission) => (
              <Pressable
                key={submission._id}
                style={styles.card}
                onPress={() => {
                  setSelectedId(submission._id);
                }}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="barcode-outline" size={24} color="#2563eb" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{submission.name}</Text>

                  <Text style={styles.muted}>{submission.barcode}</Text>

                  <Text style={styles.small}>
                    {submission.submitterEmail || "Usuario"}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={22} color="#64748b" />
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View>
          <Pressable
            onPress={() => {
              setSelectedId(null);
              setForm(EMPTY_FORM);
            }}
          >
            <Text style={styles.back}>‹ Volver a la lista</Text>
          </Pressable>

          <View style={styles.formCard}>
            <Field
              label="Código de barras"
              value={form.barcode}
              onChangeText={(value) => updateField("barcode", value)}
            />

            <Field
              label="Nombre"
              value={form.name}
              onChangeText={(value) => updateField("name", value)}
            />

            <Field
              label="Marca"
              value={form.brand}
              onChangeText={(value) => updateField("brand", value)}
            />

            <Field
              label="Categoría"
              value={form.category}
              onChangeText={(value) => updateField("category", value)}
            />

            <Field
              label="URL de imagen"
              value={form.imageUrl}
              onChangeText={(value) => updateField("imageUrl", value)}
            />

            <Field
              label="URL del producto"
              value={form.productUrl}
              onChangeText={(value) => updateField("productUrl", value)}
            />

            <Field
              label="Nota de revisión"
              value={form.reviewNote}
              onChangeText={(value) => updateField("reviewNote", value)}
              multiline
            />

            <Pressable
              disabled={busy}
              style={[styles.primaryButton, busy && styles.disabledButton]}
              onPress={() =>
                executeAction(updateSubmission, {
                  id: selectedSubmission._id,
                  barcode: form.barcode.trim(),
                  name: form.name.trim(),
                  brand: form.brand.trim() || undefined,
                  category: form.category.trim() || undefined,
                  imageUrl: form.imageUrl.trim() || undefined,
                  productUrl: form.productUrl.trim() || undefined,
                  reviewNote: form.reviewNote.trim() || undefined,
                })
              }
            >
              <Text style={styles.primaryButtonText}>
                {busy ? "Guardando..." : "Guardar cambios"}
              </Text>
            </Pressable>

            <View style={styles.actionsRow}>
              <Pressable
                disabled={busy}
                style={[
                  styles.actionButton,
                  styles.approveButton,
                  busy && styles.disabledButton,
                ]}
                onPress={() =>
                  executeAction(approveSubmission, {
                    id: selectedSubmission._id,
                    reviewNote: form.reviewNote.trim() || undefined,
                  })
                }
              >
                <Text style={styles.actionButtonText}>Aprobar</Text>
              </Pressable>

              <Pressable
                disabled={busy}
                style={[
                  styles.actionButton,
                  styles.rejectButton,
                  busy && styles.disabledButton,
                ]}
                onPress={() =>
                  executeAction(rejectSubmission, {
                    id: selectedSubmission._id,
                    reviewNote: form.reviewNote.trim() || undefined,
                  })
                }
              >
                <Text style={styles.actionButtonText}>Rechazar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export { AdminProductReviewsScreen };

export default AdminProductReviewsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2f7",
  },

  container: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: "#f8fafc",
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  headerIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: "#e8f0ff",
  },

  headerText: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  title: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 14,
  },

  muted: {
    marginTop: 8,
    color: "#64748b",
  },

  small: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 12,
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 230,
    padding: 28,
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 18,
    backgroundColor: "#ffffff",
  },

  emptyIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    marginBottom: 14,
    borderRadius: 32,
    backgroundColor: "#dcfce7",
  },

  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    marginTop: 7,
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },

  cardIcon: {
    marginRight: 14,
  },

  cardBody: {
    flex: 1,
  },

  cardTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },

  back: {
    marginVertical: 12,
    color: "#2563eb",
    fontWeight: "700",
  },

  formCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },

  field: {
    marginBottom: 13,
  },

  label: {
    marginBottom: 6,
    color: "#334155",
    fontWeight: "700",
  },

  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  multiline: {
    minHeight: 90,
    paddingTop: 10,
    textAlignVertical: "top",
  },

  primaryButton: {
    alignItems: "center",
    marginTop: 5,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#2563eb",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  actionButton: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
  },

  approveButton: {
    backgroundColor: "#16a34a",
  },

  rejectButton: {
    backgroundColor: "#dc2626",
  },

  actionButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.6,
  },
});

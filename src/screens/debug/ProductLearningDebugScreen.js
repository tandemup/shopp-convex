import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useProductLearning } from "@/context/ProductLearningContext";

/* -------------------------------------------------
   Screen
-------------------------------------------------- */
export default function ProductLearningDebugScreen() {
  const { learning, recordSelection } = useProductLearning();

  const entries = useMemo(() => {
    return Object.entries(learning)
      .map(([name, data]) => ({
        name,
        selects: data.selects,
        lastSelect: data.lastSelect,
      }))
      .sort((a, b) => b.selects - a.selects);
  }, [learning]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🧠 Aprendizaje del sistema</Text>

      {entries.length === 0 && (
        <Text style={styles.empty}>No hay datos de aprendizaje todavía</Text>
      )}

      {entries.map((item) => (
        <View key={item.name} style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>

          <Text style={styles.meta}>🔢 Selecciones: {item.selects}</Text>

          <Text style={styles.meta}>
            🕒 Último uso:{" "}
            {item.lastSelect ? new Date(item.lastSelect).toLocaleString() : "—"}
          </Text>

          <Text style={styles.meta}>
            🧮 Boost aplicado:{" "}
            {item.selects >= 10
              ? "+5"
              : item.selects >= 5
                ? "+3"
                : item.selects >= 2
                  ? "+1"
                  : "+0"}
          </Text>

          {/* Debug helpers */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.fakeSelect}
              onPress={() => recordSelection(item.name)}
            >
              <Text style={styles.fakeSelectText}>➕ Simular selección</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Reset global (solo debug) */}
      <TouchableOpacity
        style={styles.resetAll}
        onPress={() => {
          alert(
            "Para limpiar el aprendizaje, borra AsyncStorage (@productLearning)",
          );
        }}
      >
        <Text style={styles.resetAllText}>🧹 Reset aprendizaje (manual)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* -------------------------------------------------
   Styles
-------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  empty: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "capitalize",
  },

  meta: {
    fontSize: 13,
    color: "#444",
    marginTop: 2,
  },

  actions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
  },

  fakeSelect: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
  },

  fakeSelectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369a1",
  },

  resetAll: {
    marginTop: 24,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    alignItems: "center",
  },

  resetAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
  },
});

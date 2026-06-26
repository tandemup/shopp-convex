import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ParkingScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="car-outline" size={30} color="#15803d" />
        </View>

        <Text style={styles.title}>Parking</Text>

        <Text style={styles.subtitle}>
          Chat rápido para coordinar dónde aparcar, avisar de plazas libres o
          indicar que vas a salir.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado actual</Text>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton}>
            <Ionicons name="search-outline" size={22} color="#15803d" />
            <Text style={styles.actionText}>Buscando plaza</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Ionicons name="car-sport-outline" size={22} color="#15803d" />
            <Text style={styles.actionText}>Ya aparqué</Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Ionicons name="exit-outline" size={22} color="#15803d" />
            <Text style={styles.actionText}>Voy a salir</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.chatPreview}>
        <Text style={styles.chatTitle}>Chat de parking</Text>

        <View style={styles.message}>
          <Text style={styles.messageUser}>Ana</Text>
          <Text style={styles.messageText}>
            Hay una plaza libre cerca de la entrada.
          </Text>
        </View>

        <View style={[styles.message, styles.messageMine]}>
          <Text style={styles.messageUser}>Tú</Text>
          <Text style={styles.messageText}>Voy hacia allí.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },

  header: {
    marginBottom: 20,
  },

  iconCircle: {
    width: 64,
    height: 64,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
    borderRadius: 32,
  },

  title: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 8,
    color: "#6b7280",
    fontSize: 15,
    lineHeight: 22,
  },

  card: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 18,
  },

  cardTitle: {
    marginBottom: 14,
    color: "#14532d",
    fontSize: 18,
    fontWeight: "800",
  },

  actions: {
    gap: 10,
  },

  actionButton: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
  },

  actionText: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "700",
  },

  chatPreview: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
  },

  chatTitle: {
    marginBottom: 14,
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },

  message: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
  },

  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: "#dcfce7",
  },

  messageUser: {
    marginBottom: 4,
    color: "#15803d",
    fontWeight: "800",
  },

  messageText: {
    color: "#111827",
    fontSize: 15,
  },
});

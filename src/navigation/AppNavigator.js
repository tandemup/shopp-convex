import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import AuthStack from "@/src/navigation/AuthStack";
import MainTabs from "@/src/navigation/MainTabs";

export default function AppNavigator() {
  return (
    <>
      <AuthLoading>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Cargando Shopp...</Text>
        </View>
      </AuthLoading>

      <Unauthenticated>
        <AuthStack />
      </Unauthenticated>

      <Authenticated>
        <MainTabs />
      </Authenticated>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
    fontWeight: "600",
  },
});

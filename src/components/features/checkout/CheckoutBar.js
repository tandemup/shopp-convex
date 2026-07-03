import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatCurrency } from "@/src/utils/store/prices";
import { DEFAULT_CURRENCY } from "@/src/constants/currency";
import CurrencyBadge from "@/src/components/ui/CurrencyBadge";

export default function CheckoutBar({ listName, total, currency, onCheckout }) {
  const currencyCode =
    typeof currency === "string"
      ? currency
      : (currency?.code ?? DEFAULT_CURRENCY.code);

  const formattedTotal = formatCurrency(total || 0, currencyCode);
  const hasTotal = total && total > 0;

  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={styles.listName} numberOfLines={1}>
          {listName || "Lista"}
        </Text>

        <CurrencyBadge currency={currency} size="sm" />
      </View>

      <Pressable
        style={[styles.button, !hasTotal && styles.buttonDisabled]}
        onPress={onCheckout}
        disabled={!hasTotal}
      >
        <Ionicons name="cart-outline" size={22} color="#fff" />
        <Text style={styles.buttonText}>Finalizar</Text>
        <Text style={styles.buttonSeparator}>·</Text>
        <Text style={styles.buttonTotal}>{formattedTotal}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },

  titleBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  listName: {
    flex: 1,
    minWidth: 0,
    fontStyle: "italic",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  button: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#22C55E",
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  buttonSeparator: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    fontWeight: "700",
  },

  buttonTotal: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});

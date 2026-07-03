import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DEFAULT_CURRENCY } from "@/src/constants/currency";

export default function CurrencyBadge({
  currency = DEFAULT_CURRENCY,
  size = "sm", // "sm" | "md"
  variant = "soft", // "soft" | "solid"
}) {
  if (!currency) return null;

  return (
    <View style={[styles.base, styles[size], styles[variant]]}>
      <Text
        style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}
      >
        {currency.symbol} {currency.code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ---------- Base ---------- */
  base: {
    borderRadius: 999,
    alignSelf: "flex-start",
    borderWidth: 1,
  },

  /* ---------- Sizes ---------- */
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  /* ---------- Variants ---------- */
  soft: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  solid: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  /* ---------- Text ---------- */
  text: {
    fontWeight: "700",
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 13,
  },
  text_soft: {
    color: "#3730A3",
  },
  text_solid: {
    color: "#fff",
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_LOCALE = "es-ES";

const DEFAULT_DATE_OPTIONS = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const formatDate = ({ value, fallback, locale, options }) => {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString(locale, options);
};

const DatePill = ({
  date,
  fallback = "Sin fecha",
  locale = DEFAULT_LOCALE,
  options = DEFAULT_DATE_OPTIONS,
  icon = "calendar-outline",
  iconSize = 15,
  iconColor = "#6B7280",
  style,
  textStyle,
}) => {
  const label = formatDate({
    value: date,
    fallback,
    locale,
    options,
  });

  return (
    <View style={[styles.metaPill, style]}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />

      <Text style={[styles.subInfo, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export default DatePill;

const styles = StyleSheet.create({
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },

  subInfo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
});

import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatCurrency } from "@/utils/store/formatters";
import { formatUnit } from "@/utils/pricing/unitFormat";

export default function ItemRow({ item, onToggle, onEdit }) {
  const priceInfo = item.priceInfo || {};

  const subtotal = priceInfo.total ?? 0;
  const savings = priceInfo.savings ?? 0;

  const hasPromo = Boolean(priceInfo.promo) && priceInfo.promo !== "none";

  const unit = item.unit ?? priceInfo.unit ?? "u";
  const qty = priceInfo.qty ?? 1;
  const unitPrice = priceInfo.unitPrice ?? 0;

  const categoryName = item.categoryName ?? null;
  const subcategoryName = item.subcategoryName ?? null;

  const hasCategory = Boolean(categoryName);
  const hasSubcategory = Boolean(subcategoryName);

  return (
    <View style={[styles.container, !item.checked && styles.containerInactive]}>
      <Pressable style={styles.checkbox} onPress={onToggle} hitSlop={10}>
        <Ionicons
          name={item.checked ? "checkbox-outline" : "square-outline"}
          size={22}
          color={item.checked ? "#16a34a" : "#94a3b8"}
        />
      </Pressable>

      <Pressable style={styles.content} onPress={onEdit}>
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.badges}>
            <Text style={styles.categoryBadge}>{categoryName}</Text>
            <Text style={styles.subcategoryBadge}>{subcategoryName}</Text>
          </View>
        </View>

        {hasPromo ? (
          <View style={styles.promoRow}>
            <View style={styles.promoBadge}>
              <Text style={styles.promoText}>
                {priceInfo.promoLabel || "Oferta"}
              </Text>
            </View>

            {savings > 0 ? (
              <Text style={styles.savingsInline} numberOfLines={1}>
                −{formatCurrency(savings, priceInfo.currency)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text
          style={[styles.meta, !item.checked && styles.textInactive]}
          numberOfLines={1}
        >
          {qty} {formatUnit(unit)} ×{" "}
          {formatCurrency(unitPrice, priceInfo.currency)}/{formatUnit(unit)}
        </Text>
      </Pressable>

      <Text
        style={[styles.subtotal, !item.checked && styles.subtotalInactive]}
        numberOfLines={1}
      >
        {formatCurrency(subtotal, priceInfo.currency)}
      </Text>

      <Pressable style={styles.chevron} onPress={onEdit} hitSlop={10}>
        <Ionicons name="chevron-forward" size={19} color="#94a3b8" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",

    minHeight: 84,

    marginBottom: 10,

    paddingHorizontal: 12,
    paddingVertical: 10,

    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,

    backgroundColor: "#ffffff",

    ...Platform.select({
      web: {
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.06)",
      },

      default: {
        shadowColor: "#000000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        elevation: 2,
      },
    }),
  },

  containerInactive: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },

  checkbox: {
    marginRight: 10,
  },

  content: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  firstLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    minWidth: 0,
  },

  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },

  nameInactive: {
    color: "#94a3b8",
  },

  badges: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    flexShrink: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgesInline: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 5,
  },

  categoryBadge: {
    maxWidth: 92,

    paddingHorizontal: 8,
    paddingVertical: 3,

    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,

    backgroundColor: "#eff6ff",
  },

  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",

    color: "#1d4ed8",
  },

  subcategoryBadge: {
    maxWidth: 92,

    paddingHorizontal: 8,
    paddingVertical: 3,

    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,

    backgroundColor: "#f0fdf4",
  },

  subcategoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",

    color: "#15803d",
  },

  badgeInactive: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f1f5f9",
  },

  badgeTextInactive: {
    color: "#94a3b8",
  },

  promoRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 5,

    marginTop: 6,
  },

  promoBadge: {
    flexShrink: 0,

    paddingHorizontal: 7,
    paddingVertical: 3,

    borderRadius: 999,

    backgroundColor: "#fef08a",
  },

  promoText: {
    fontSize: 10,
    fontWeight: "800",

    color: "#854d0e",
  },

  savingsInline: {
    flexShrink: 0,

    fontSize: 11,
    fontWeight: "800",

    color: "#15803d",
  },

  meta: {
    marginTop: 5,

    fontSize: 12,
    fontWeight: "500",

    color: "#64748b",
  },

  textInactive: {
    color: "#94a3b8",
  },

  subtotal: {
    marginLeft: 6,
    marginRight: 4,

    fontSize: 16,
    fontWeight: "900",

    fontVariant: ["tabular-nums"],

    color: "#15803d",
  },

  subtotalInactive: {
    color: "#94a3b8",
  },

  chevron: {
    marginLeft: 4,
    padding: 4,
  },
  firstLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    minWidth: 0,
  },

  name: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,

    fontSize: 16,
    fontWeight: "800",

    color: "#1f2937",
  },

  badgesInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    gap: 5,
  },
  firstLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    minWidth: 0,
  },

  name: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,

    fontSize: 16,
    fontWeight: "800",

    color: "#1f2937",
  },

  badgesInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    gap: 5,
  },
});

import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatCurrency } from "@/src/utils/store/formatters";
import { formatUnit } from "@/src/utils/pricing/unitFormat";

const LAYOUT_VARIANT = "compact";
// Opciones: "compact", "table", "stacked"

export default function ItemRow({ item, onToggle, onEdit }) {
  const priceInfo = item.priceInfo || {};

  const subtotal = priceInfo.total ?? 0;
  const savings = priceInfo.savings ?? 0;
  const hasPromo = Boolean(priceInfo.promo) && priceInfo.promo !== "none";

  const unit = item.unit ?? priceInfo.unit ?? "u";
  const qty = priceInfo.qty ?? item.qty ?? 1;
  const unitPrice = priceInfo.unitPrice ?? item.price ?? 0;

  const categoryName = item.categoryName ?? null;
  const subcategoryName = item.subcategoryName ?? null;

  const hasCategory = Boolean(categoryName);
  const hasSubcategory = Boolean(subcategoryName);

  const currency = priceInfo.currency;

  const offerText = hasPromo ? priceInfo.promoLabel || "Oferta" : "Sin oferta";
  const totalText = formatCurrency(subtotal, currency);
  const unitPriceText = formatCurrency(unitPrice, currency);

  return (
    <View style={[styles.container, !item.checked && styles.containerInactive]}>
      <Pressable style={styles.checkbox} onPress={onToggle} hitSlop={10}>
        <Ionicons
          name={item.checked ? "checkbox-outline" : "square-outline"}
          size={24}
          color={item.checked ? "#16a34a" : "#94a3b8"}
        />
      </Pressable>

      <Pressable style={styles.content} onPress={onEdit}>
        <View style={styles.badgesRow}>
          {hasCategory ? (
            <View
              style={[
                styles.categoryBadge,
                !item.checked && styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  !item.checked && styles.badgeTextInactive,
                ]}
                numberOfLines={1}
              >
                {categoryName}
              </Text>
            </View>
          ) : null}

          {hasSubcategory ? (
            <View
              style={[
                styles.subcategoryBadge,
                !item.checked && styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.subcategoryBadgeText,
                  !item.checked && styles.badgeTextInactive,
                ]}
                numberOfLines={1}
              >
                {subcategoryName}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.nameRow}>
          <Text
            style={[styles.name, !item.checked && styles.nameInactive]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>

        {LAYOUT_VARIANT === "compact" ? (
          <View style={styles.compactRow}>
            <View style={styles.compactInfo}>
              <View style={styles.infoLine}>
                <Text style={styles.label}>Cantidad</Text>
                <Text
                  style={[styles.value, !item.checked && styles.textInactive]}
                >
                  {qty} {formatUnit(unit)}
                </Text>
              </View>

              <View style={styles.infoLine}>
                <Text style={styles.label}>Precio/u</Text>
                <Text
                  style={[styles.value, !item.checked && styles.textInactive]}
                >
                  {unitPriceText}
                </Text>
              </View>

              <View style={styles.infoLine}>
                <Text style={styles.label}>Oferta</Text>
                <Text
                  style={[
                    hasPromo ? styles.offerValue : styles.noOfferValue,
                    !item.checked && styles.textInactive,
                  ]}
                  numberOfLines={1}
                >
                  {offerText}
                </Text>
              </View>
            </View>

            <View style={styles.totalBlock}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text
                style={[styles.total, !item.checked && styles.subtotalInactive]}
                numberOfLines={1}
              >
                {totalText}
              </Text>
            </View>
          </View>
        ) : null}

        {LAYOUT_VARIANT === "table" ? (
          <View style={styles.tableBox}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Cantidad</Text>
              <Text
                style={[
                  styles.tableValue,
                  !item.checked && styles.textInactive,
                ]}
              >
                {qty} {formatUnit(unit)}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Precio unitario</Text>
              <Text
                style={[
                  styles.tableValue,
                  !item.checked && styles.textInactive,
                ]}
              >
                {unitPriceText}/{formatUnit(unit)}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Oferta aplicable</Text>
              <Text
                style={[
                  hasPromo ? styles.offerValue : styles.noOfferValue,
                  !item.checked && styles.textInactive,
                ]}
                numberOfLines={1}
              >
                {offerText}
              </Text>
            </View>

            {hasPromo && savings > 0 ? (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Ahorro</Text>
                <Text style={styles.savingsValue}>
                  −{formatCurrency(savings, currency)}
                </Text>
              </View>
            ) : null}

            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalLabel}>TOTAL</Text>
              <Text
                style={[
                  styles.tableTotalValue,
                  !item.checked && styles.subtotalInactive,
                ]}
              >
                {totalText}
              </Text>
            </View>
          </View>
        ) : null}

        {LAYOUT_VARIANT === "stacked" ? (
          <View style={styles.stackedBox}>
            <View style={styles.stackedItem}>
              <Text style={styles.stackedLabel}>Cantidad</Text>
              <Text
                style={[
                  styles.stackedValue,
                  !item.checked && styles.textInactive,
                ]}
              >
                {qty} {formatUnit(unit)}
              </Text>
            </View>

            <View style={styles.stackedItem}>
              <Text style={styles.stackedLabel}>Precio unitario</Text>
              <Text
                style={[
                  styles.stackedValue,
                  !item.checked && styles.textInactive,
                ]}
              >
                {unitPriceText}/{formatUnit(unit)}
              </Text>
            </View>

            <View style={styles.stackedItem}>
              <Text style={styles.stackedLabel}>Oferta</Text>
              <Text
                style={[
                  hasPromo ? styles.offerValue : styles.noOfferValue,
                  !item.checked && styles.textInactive,
                ]}
              >
                {offerText}
              </Text>
            </View>

            <View style={styles.stackedTotal}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text
                style={[styles.total, !item.checked && styles.subtotalInactive]}
              >
                {totalText}
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>

      <Pressable style={styles.chevron} onPress={onEdit} hitSlop={10}>
        <Ionicons name="chevron-forward" size={21} color="#94a3b8" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",

    minHeight: 118,
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
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
    }),
  },

  containerInactive: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },

  checkbox: {
    flexShrink: 0,
    marginRight: 10,
  },

  content: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },

  badgesRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  categoryBadge: {
    maxWidth: 130,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    backgroundColor: "#eff6ff",
  },

  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1d4ed8",
  },

  subcategoryBadge: {
    maxWidth: 110,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    backgroundColor: "#f0fdf4",
  },

  subcategoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#15803d",
  },

  badgeInactive: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f1f5f9",
  },

  badgeTextInactive: {
    color: "#94a3b8",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: "900",
    color: "#1f2937",
  },

  nameInactive: {
    color: "#94a3b8",
  },

  compactRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  compactInfo: {
    flex: 1,
    minWidth: 0,
  },

  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  label: {
    width: 76,
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },

  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },

  offerValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#ea580c",
  },

  noOfferValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
  },

  totalBlock: {
    flexShrink: 0,
    alignItems: "flex-end",
  },

  totalLabel: {
    marginBottom: 2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#94a3b8",
  },

  total: {
    fontSize: 24,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: "#15803d",
  },

  tableBox: {
    gap: 4,
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  tableLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },

  tableValue: {
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },

  savingsValue: {
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "900",
    color: "#15803d",
  },

  tableTotalRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",

    marginTop: 4,
    paddingTop: 6,

    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  tableTotalLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#64748b",
  },

  tableTotalValue: {
    fontSize: 24,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: "#15803d",
  },

  stackedBox: {
    gap: 6,
  },

  stackedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  stackedLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },

  stackedValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },

  stackedTotal: {
    alignItems: "flex-end",
    marginTop: 6,
  },

  textInactive: {
    color: "#94a3b8",
  },

  subtotalInactive: {
    color: "#94a3b8",
  },

  chevron: {
    flexShrink: 0,
    marginLeft: 2,
    padding: 4,
  },
});

const styles1 = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",

    minHeight: 136,
    marginBottom: 12,

    paddingHorizontal: 14,
    paddingVertical: 12,

    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,

    backgroundColor: "#ffffff",

    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
      },
      default: {
        shadowColor: "#000000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      },
    }),
  },

  containerInactive: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    opacity: 0.82,
  },

  checkbox: {
    flexShrink: 0,
    marginRight: 12,
    alignSelf: "center",
  },

  content: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },

  badgesRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },

  categoryBadge: {
    maxWidth: 140,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    backgroundColor: "#eff6ff",
  },

  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1d4ed8",
  },

  subcategoryBadge: {
    maxWidth: 130,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    backgroundColor: "#f0fdf4",
  },

  subcategoryBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#15803d",
  },

  badgeInactive: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f1f5f9",
  },

  badgeTextInactive: {
    color: "#94a3b8",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
  },

  nameInactive: {
    color: "#94a3b8",
  },

  compactRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },

  compactInfo: {
    flex: 1,
    minWidth: 0,
  },

  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  label: {
    width: 82,
    fontSize: 13,
    fontWeight: "900",
    color: "#64748b",
  },

  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  offerValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    color: "#ea580c",
  },

  noOfferValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#94a3b8",
  },

  totalBlock: {
    flexShrink: 0,
    minWidth: 104,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },

  totalLabel: {
    marginBottom: 2,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#94a3b8",
  },

  total: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: "#15803d",
    letterSpacing: -0.6,
  },

  tableBox: {
    gap: 5,
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  tableLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#64748b",
  },

  tableValue: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  savingsValue: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "900",
    color: "#15803d",
  },

  tableTotalRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",

    marginTop: 6,
    paddingTop: 8,

    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  tableTotalLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#64748b",
  },

  tableTotalValue: {
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: "#15803d",
  },

  stackedBox: {
    gap: 7,
  },

  stackedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  stackedLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#64748b",
  },

  stackedValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  stackedTotal: {
    alignItems: "flex-end",
    marginTop: 8,
  },

  textInactive: {
    color: "#94a3b8",
  },

  subtotalInactive: {
    color: "#94a3b8",
  },

  chevron: {
    flexShrink: 0,
    marginLeft: 4,
    padding: 4,
    alignSelf: "center",
  },
});

import React, { useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function getSubcategoryId(subcategory) {
  return typeof subcategory === "string" ? subcategory : subcategory?.id;
}

function getSubcategoryName(subcategory) {
  return typeof subcategory === "string" ? subcategory : subcategory?.name;
}

export default function CategoryImageSelector({
  categories = [],
  selectedCategoryId,
  selectedSubcategoryId,
  showTitle = true,
  title = "Categoría",
  subcategoryTitle = "Subcategoría",
  onChange,
  onSubcategoryChange,
  style,
}) {
  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const subcategories = Array.isArray(selectedCategory?.subcategories)
    ? selectedCategory.subcategories
    : [];

  return (
    <View style={[styles.container, style]}>
      {showTitle ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      <View style={styles.categoriesGrid}>
        {categories.map((category) => {
          const selected = selectedCategoryId === category.id;

          return (
            <Pressable
              key={category.id}
              style={({ pressed }) => [
                styles.categoryItem,
                selected && styles.categoryItemSelected,
                pressed && styles.pressed,
              ]}
              onPress={() => onChange?.(category)}
            >
              <View
                style={[styles.imageBox, selected && styles.imageBoxSelected]}
              >
                {category.image ? (
                  <Image
                    source={category.image}
                    style={styles.categoryImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="image-outline" size={28} color="#94A3B8" />
                )}

                {selected ? (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.categoryName,
                  selected && styles.categoryNameSelected,
                ]}
                numberOfLines={2}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedCategory ? (
        <View style={styles.subcategorySection}>
          <View style={styles.subcategoryHeader}>
            <Text style={styles.subcategoryTitle}>{subcategoryTitle}</Text>

            <Text style={styles.selectedCategoryName} numberOfLines={1}>
              {selectedCategory.name}
            </Text>
          </View>

          {subcategories.length > 0 ? (
            <View style={styles.subcategoriesWrap}>
              {subcategories.map((subcategory) => {
                const id = getSubcategoryId(subcategory);
                const name = getSubcategoryName(subcategory);
                const selected = selectedSubcategoryId === id;

                return (
                  <Pressable
                    key={id}
                    style={({ pressed }) => [
                      styles.subcategoryChip,
                      selected && styles.subcategoryChipSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onSubcategoryChange?.(subcategory)}
                  >
                    <Text
                      style={[
                        styles.subcategoryChipText,
                        selected && styles.subcategoryChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>

                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#2563EB"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptySubcategories}>
              <Text style={styles.emptySubcategoriesText}>
                Esta categoría no tiene subcategorías
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptySubcategories}>
          <Text style={styles.emptySubcategoriesText}>
            Selecciona una categoría
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  header: {
    marginBottom: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  categoriesGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    rowGap: 14,
  },

  categoryItem: {
    width: "31%",
    alignItems: "center",
  },

  categoryItemSelected: {},

  imageBox: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 78,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  imageBoxSelected: {
    borderWidth: 2,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  categoryImage: {
    width: "82%",
    height: "82%",
  },

  selectedBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  categoryName: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },

  categoryNameSelected: {
    color: "#2563EB",
    fontWeight: "900",
  },

  subcategorySection: {
    marginTop: 20,
  },

  subcategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  subcategoryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  selectedCategoryName: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },

  subcategoriesWrap: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  subcategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },

  subcategoryChipSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  subcategoryChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },

  subcategoryChipTextSelected: {
    color: "#2563EB",
  },

  emptySubcategories: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptySubcategoriesText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },

  pressed: {
    opacity: 0.75,
  },
});

import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import { StatusBar } from "expo-status-bar";

import { UNITS } from "@/src/constants/unitTypes";
import { ROUTES } from "@/src/navigation/ROUTES";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";
import { getSearchSettings } from "@/src/storage/settingsStorage";
import { DEFAULT_CURRENCY } from "@/src/constants/currency";
// import { SEARCH_ENGINES } from "@/src/constants/SearchEngines";
import SearchEngines from "@/src/screens/settings/SearchEngines";
import { PRODUCT_CATEGORIES } from "@/src/constants/categories";

import { useLists } from "@/src/context/ListsContext";

import BarcodeInput from "@/src/components/ui/BarcodeInput";
import {
  closePreparedExternalWindow,
  openExternalUrl,
  prepareExternalWindow,
} from "@/src/utils/openExternalUrl";

import {
  PricingEngine,
  PROMOTIONS,
  normalizePromotion,
  validatePromotion,
} from "@/src/utils/pricing/PricingEngine";

import { validatePromotionUnit } from "@/src/utils/pricing";
import { formatCurrency } from "@/src/utils/store/prices";
import { formatUnit } from "@/src/utils/pricing/unitFormat";

import { safeAlert } from "@/src/components/ui/alert/safeAlert";

/* ────────────────────────────────────────────────
   CATEGORY HELPERS
──────────────────────────────────────────────── */

const normalizeCategoryToken = (value = "") => {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const makeCategoryTokenId = (value = "") => {
  return normalizeCategoryToken(value).replace(/\s+/g, "_");
};

const getSubcategoryName = (subcategory) => {
  if (!subcategory) {
    return null;
  }

  return typeof subcategory === "string"
    ? subcategory
    : (subcategory.name ?? subcategory.label ?? subcategory.title ?? null);
};

const getSubcategoryId = (subcategory) => {
  if (!subcategory) {
    return null;
  }

  const name = getSubcategoryName(subcategory);

  return typeof subcategory === "string"
    ? makeCategoryTokenId(subcategory)
    : (subcategory.id ?? subcategory.key ?? makeCategoryTokenId(name));
};

/* ────────────────────────────────────────────────
   PRODUCT HERO
──────────────────────────────────────────────── */

function ProductHero({ name, barcode }) {
  const title = name?.trim() || "Producto sin nombre";

  const subtitle = barcode?.trim()
    ? `EAN: ${barcode.trim()}`
    : "Edita los datos principales del producto";

  return (
    <View style={styles.productHero}>
      <View style={styles.productIconCircle}>
        <Ionicons name="cube-outline" size={24} color="#2563eb" />
      </View>

      <View style={styles.productHeroText}>
        <Text style={styles.productHeroTitle} numberOfLines={1}>
          {title}
        </Text>

        <Text style={styles.productHeroSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   SECTION TITLE
──────────────────────────────────────────────── */

function SectionTitle({ icon, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon ? <Ionicons name={icon} size={18} color="#2563eb" /> : null}

        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/* ────────────────────────────────────────────────
   BASIC / ADVANCED SELECTOR
──────────────────────────────────────────────── */

function EditViewSelector({ activeView, onChange }) {
  return (
    <View style={styles.editViewSelector}>
      <Pressable
        style={[
          styles.editViewButton,
          activeView === "basic" && styles.editViewButtonActive,
        ]}
        onPress={() => onChange("basic")}
      >
        <Ionicons
          name="create-outline"
          size={18}
          color={activeView === "basic" ? "#ffffff" : "#475569"}
        />

        <Text
          style={[
            styles.editViewButtonText,
            activeView === "basic" && styles.editViewButtonTextActive,
          ]}
        >
          Básico
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.editViewButton,
          activeView === "advanced" && styles.editViewButtonActive,
        ]}
        onPress={() => onChange("advanced")}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={activeView === "advanced" ? "#ffffff" : "#475569"}
        />

        <Text
          style={[
            styles.editViewButtonText,
            activeView === "advanced" && styles.editViewButtonTextActive,
          ]}
        >
          Más opciones
        </Text>
      </Pressable>
    </View>
  );
}

/* ────────────────────────────────────────────────
   PRODUCT AND BARCODE CARD
──────────────────────────────────────────────── */

function CardNombreBarcode({
  nameItem,
  barcodeItem,
  onChangeName,
  onChangeBarcode,
  onScanner,
  onSearch,
}) {
  return (
    <View style={styles.card}>
      <SectionTitle
        icon="pricetag-outline"
        title="Producto"
        subtitle="Nombre visible en la lista y código EAN-13"
      />

      <Text style={styles.label}>Nombre</Text>

      <TextInput
        style={styles.input}
        value={nameItem}
        onChangeText={onChangeName}
        placeholder="Nombre del producto"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.fieldGap} />

      <Text style={styles.label}>Código de barras</Text>

      <BarcodeInput
        value={barcodeItem}
        onChangeText={onChangeBarcode}
        onPressScanner={onScanner}
        onPressSearch={onSearch}
      />
    </View>
  );
}

/* ────────────────────────────────────────────────
   CATEGORY SELECTOR
──────────────────────────────────────────────── */

function CategoryBadgeSelector({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onChange,
  onSubcategoryChange,
}) {
  const selectedCategory = categories.find((category) => {
    return category.id === selectedCategoryId;
  });

  return (
    <View>
      <Text style={styles.badgeGroupTitle}>Categoria</Text>

      <View style={styles.badgeGrid}>
        {categories.map((category) => {
          const selected = category.id === selectedCategoryId;

          return (
            <Pressable
              key={category.id}
              onPress={() => {
                onChange(category);
              }}
              style={({ pressed }) => [
                styles.categoryBadge,
                selected && styles.categoryBadgeSelected,
                pressed && styles.badgePressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  selected && styles.categoryBadgeTextSelected,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedCategory ? (
        <View style={styles.subcategorySection}>
          <Text style={styles.badgeGroupTitle}>Subcategoría</Text>

          <View style={styles.badgeGrid}>
            {(selectedCategory.subcategories ?? []).map((subcategory) => {
              const subcategoryId = getSubcategoryId(subcategory);
              const subcategoryName = getSubcategoryName(subcategory);

              const selected = subcategoryId === selectedSubcategoryId;

              return (
                <Pressable
                  key={subcategoryId}
                  onPress={() => {
                    onSubcategoryChange(subcategory);
                  }}
                  style={({ pressed }) => [
                    styles.subcategoryBadge,
                    selected && styles.subcategoryBadgeSelected,
                    pressed && styles.badgePressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.subcategoryBadgeText,
                      selected && styles.subcategoryBadgeTextSelected,
                    ]}
                  >
                    {subcategoryName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ────────────────────────────────────────────────
   CATEGORIES CARD
──────────────────────────────────────────────── */

function Categorias({
  selectedCategoryId,
  selectedSubcategoryId,
  onChangeCategory,
  onChangeSubcategory,
  expanded,
  onExpandedChange,
}) {
  const selectedCategory = PRODUCT_CATEGORIES.find((category) => {
    return category.id === selectedCategoryId;
  });

  const selectedSubcategory = selectedCategory?.subcategories?.find(
    (subcategory) => {
      return getSubcategoryId(subcategory) === selectedSubcategoryId;
    },
  );

  const selectedSubcategoryName = getSubcategoryName(selectedSubcategory);

  const selectedClassification = selectedCategory
    ? selectedSubcategoryName
      ? `🏷️ ${selectedCategory.name} · ${selectedSubcategoryName}`
      : `🏷️ ${selectedCategory.name}`
    : "🏷️ Sin categoría";

  return (
    <View style={styles.card}>
      <SectionTitle
        icon="albums-outline"
        title="Categorías"
        subtitle="Clasifica el producto por categoría y subcategoría"
      />

      <Pressable
        style={styles.dropdownHeader}
        onPress={() => {
          onExpandedChange(!expanded);
        }}
      >
        <Text style={styles.dropdownLabel}>Categoria</Text>

        <View style={styles.dropdownRight}>
          <Text
            style={[
              styles.dropdownValue,
              selectedCategory && styles.dropdownValueActive,
            ]}
            numberOfLines={1}
          >
            {selectedClassification}
          </Text>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748b"
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.dropdownBody}>
          <CategoryBadgeSelector
            categories={PRODUCT_CATEGORIES}
            selectedCategoryId={selectedCategoryId}
            selectedSubcategoryId={selectedSubcategoryId}
            onChange={onChangeCategory}
            onSubcategoryChange={onChangeSubcategory}
          />
        </View>
      ) : null}
    </View>
  );
}
/* ────────────────────────────────────────────────
   PRICE AND QUANTITY CARD
──────────────────────────────────────────────── */

function CantidadPrecioCard({
  qty,
  price,
  unit,
  currencySymbol,
  onChangeQty,
  onChangePrice,
  showError,
}) {
  return (
    <View style={styles.card}>
      <SectionTitle
        icon="calculator-outline"
        title="Precio y cantidad"
        subtitle="Datos principales para calcular el importe"
      />

      <View style={styles.priceGrid}>
        <View style={styles.inlineField}>
          <Text style={styles.label}>Cantidad ({formatUnit(unit)})</Text>

          <TextInput
            keyboardType={unit === "u" ? "number-pad" : "decimal-pad"}
            inputMode={unit === "u" ? "numeric" : "decimal"}
            style={[styles.inputNum, showError && styles.inputDanger]}
            value={qty}
            onChangeText={onChangeQty}
          />

          {showError ? (
            <Text style={styles.inputError}>
              Solo enteros para unidades (u)
            </Text>
          ) : null}
        </View>

        <View style={styles.inlineField}>
          <Text style={styles.label}>
            Precio ({currencySymbol}/{formatUnit(unit)})
          </Text>

          <TextInput
            inputMode="decimal"
            keyboardType="decimal-pad"
            style={styles.inputNum}
            value={price}
            onChangeText={onChangePrice}
          />
        </View>
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   UNIT CARD
──────────────────────────────────────────────── */

function UnidadCard({ unit, onChangeUnit }) {
  const [expanded, setExpanded] = useState(false);

  const unitLabel =
    {
      u: "Unidad",
      kg: "Kilogramos",
      g: "Gramos",
      l: "Litros",
    }[unit] ?? "Unidad";

  const handleSelectUnit = (nextUnit) => {
    onChangeUnit(nextUnit);

    setExpanded(false);
  };

  return (
    <View style={styles.card}>
      <SectionTitle
        icon="scale-outline"
        title="Unidad de medida"
        subtitle="Cambia la unidad utilizada para calcular el precio"
      />

      <Pressable
        style={styles.dropdownHeader}
        onPress={() => {
          setExpanded((previous) => !previous);
        }}
      >
        <Text style={styles.dropdownLabel}>Unidad</Text>

        <View style={styles.dropdownRight}>
          <Text style={styles.dropdownValue}>{unitLabel}</Text>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748b"
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.dropdownBody}>
          <View style={styles.chipRow}>
            {UNITS.map((currentUnit) => {
              return (
                <Pressable
                  key={currentUnit}
                  style={[
                    styles.unitBtn,
                    unit === currentUnit && styles.unitBtnActive,
                  ]}
                  onPress={() => {
                    handleSelectUnit(currentUnit);
                  }}
                >
                  <Text
                    style={[
                      styles.unitText,
                      unit === currentUnit && styles.unitTextActive,
                    ]}
                  >
                    {formatUnit(currentUnit)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ────────────────────────────────────────────────
   OFFERS CARD
──────────────────────────────────────────────── */

function Ofertas({ quantity, unitPrice, selectedPromo, onSelect, unit }) {
  const [expanded, setExpanded] = useState(false);

  const qty = Number(String(quantity).replace(",", ".")) || 0;
  const price = Number(String(unitPrice).replace(",", ".")) || 0;

  const selectedPromoSafe = selectedPromo ?? "none";

  const selectedPromoNormalized = normalizePromotion(selectedPromoSafe);

  const promoValidation = validatePromotion(
    selectedPromoNormalized,
    qty,
    price,
  );

  const selectedOption = PROMOTIONS[selectedPromoSafe];

  const promoLabel =
    selectedOption?.label ??
    (selectedPromoSafe === "none" ? "Sin oferta" : String(selectedPromoSafe));

  const handleSelectPromo = (promoId) => {
    onSelect(promoId);

    setExpanded(false);
  };

  return (
    <View style={styles.card}>
      <SectionTitle
        icon="sparkles-outline"
        title="Oferta"
        subtitle="Aplica promociones compatibles con la unidad elegida"
      />

      <Pressable
        style={styles.dropdownHeader}
        onPress={() => {
          setExpanded((previous) => !previous);
        }}
      >
        <Text style={styles.dropdownLabel}>Promoción</Text>

        <View style={styles.dropdownRight}>
          <Text
            style={[
              styles.dropdownValue,
              selectedPromoSafe !== "none" && styles.dropdownValueActive,
            ]}
            numberOfLines={1}
          >
            {promoLabel}
          </Text>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748b"
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.dropdownBody}>
          <View style={styles.chipRow}>
            {Object.values(PROMOTIONS)
              .filter((option) => {
                const isMulti = option.id === "2x1" || option.id === "3x2";

                return !(isMulti && unit !== "u");
              })
              .map((option) => {
                const promo = normalizePromotion(option.id);

                const validation = validatePromotion(promo, qty, price);

                const disabled = !validation.valid;
                const selected = selectedPromoSafe === option.id;

                return (
                  <Pressable
                    key={option.id}
                    disabled={disabled}
                    onPress={() => {
                      if (!disabled) {
                        handleSelectPromo(option.id);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.promoChip,
                      selected && styles.promoChipSelected,
                      disabled && styles.promoChipDisabled,
                      pressed && !disabled && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.promoChipText,
                        selected && styles.promoChipTextSelected,
                        disabled && styles.promoChipTextDisabled,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ) : null}

      {!promoValidation.valid ? (
        <View style={styles.offerWarningBox}>
          <Ionicons name="warning-outline" size={16} color="#9a3412" />

          <Text style={styles.offerWarning}>
            {promoValidation.message ?? "Oferta no válida"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ────────────────────────────────────────────────
   SUMMARY
──────────────────────────────────────────────── */

function SummaryRow({ label, value, bold, valueStyle }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          bold && styles.summaryValueBold,
          valueStyle,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Summary({ base, savings, total }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryTitle}>Resumen</Text>

          <Text style={styles.summarySubtitle}>Importe calculado</Text>
        </View>

        <View style={styles.summaryIconCircle}>
          <Ionicons name="receipt-outline" size={20} color="#16a34a" />
        </View>
      </View>

      <View style={styles.summaryRows}>
        <SummaryRow label="Base" value={formatCurrency(base)} />

        {savings > 0 ? (
          <SummaryRow
            label="Descuento oferta"
            value={`-${formatCurrency(savings)}`}
            valueStyle={styles.summaryValueDiscount}
          />
        ) : null}

        <View style={styles.summaryDivider} />

        <SummaryRow label="Total" value={formatCurrency(total)} bold />
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   ACTION BUTTONS
──────────────────────────────────────────────── */

function BotonesAcciones({ onSave, onDelete }) {
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={onDelete}
        activeOpacity={0.75}
      >
        <Ionicons name="trash-outline" size={20} color="#dc2626" />

        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
          Borrar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.saveButton]}
        onPress={onSave}
        activeOpacity={0.75}
      >
        <Ionicons name="checkmark-outline" size={22} color="#ffffff" />

        <Text style={[styles.actionButtonText, styles.saveButtonText]}>
          Guardar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ────────────────────────────────────────────────
   SCREEN
──────────────────────────────────────────────── */

export default function ItemDetailScreen() {
  const navigation = useNavigation();

  const route = useRoute();

  const headerConfig = useMemo(() => {
    return buildHeaderConfig({
      title: "Editar producto",
      preset: "light",
    });
  }, []);

  const { listId, itemId } = route.params || {};

  const { lists, updateItem, deleteItem } = useLists();

  const list = lists.find((currentList) => {
    return currentList.id === listId;
  });

  const item = list?.items.find((currentItem) => {
    return currentItem.id === itemId;
  });

  const [activeView, setActiveView] = useState("basic");

  const [categoryExpanded, setCategoryExpanded] = useState(false);

  const [name, setName] = useState(item?.name ?? "");

  const [barcode, setBarcode] = useState(item?.barcode ?? "");

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    item?.categoryId ?? null,
  );

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(
    item?.subcategoryId ?? null,
  );

  const [pricing, setPricing] = useState({
    qty: String(item?.priceInfo?.qty ?? "1"),
    unitPrice: String(item?.priceInfo?.unitPrice ?? "0"),
    unit: item?.priceInfo?.unit ?? "u",
    promo: item?.priceInfo?.promo ?? "none",
  });

  useLayoutEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation, headerConfig]);

  useFocusEffect(
    useCallback(() => {
      const scannedBarcode = route.params?.scannedBarcode;

      if (!scannedBarcode) {
        return;
      }

      setBarcode(String(scannedBarcode));

      navigation.setParams({
        scannedBarcode: undefined,
      });
    }, [navigation, route.params?.scannedBarcode]),
  );

  const rawListCurrency = list?.currency ?? DEFAULT_CURRENCY;

  const listCurrencyCode =
    typeof rawListCurrency === "string"
      ? rawListCurrency
      : rawListCurrency?.code || DEFAULT_CURRENCY.code;

  const listCurrencySymbol =
    typeof rawListCurrency === "string"
      ? rawListCurrency
      : rawListCurrency?.symbol || DEFAULT_CURRENCY.symbol;

  const priceInfo = useMemo(() => {
    return PricingEngine.calculate({
      qty: Number(pricing.qty.replace(",", ".")) || 0,
      unit: pricing.unit,
      unitPrice: Number(pricing.unitPrice.replace(",", ".")) || 0,
      promo: pricing.promo,
      currency: listCurrencyCode,
    });
  }, [pricing, listCurrencyCode]);

  const selectedCategory = useMemo(() => {
    return (
      PRODUCT_CATEGORIES.find((category) => {
        return category.id === selectedCategoryId;
      }) ?? null
    );
  }, [selectedCategoryId]);

  const selectedSubcategory = useMemo(() => {
    if (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) {
      return null;
    }

    return (
      selectedCategory.subcategories.find((subcategory) => {
        return getSubcategoryId(subcategory) === selectedSubcategoryId;
      }) ?? null
    );
  }, [selectedCategory, selectedSubcategoryId]);

  const selectedSubcategoryName = getSubcategoryName(selectedSubcategory);

  const updatePricing = (patch) => {
    setPricing((previousPricing) => {
      return {
        ...previousPricing,
        ...patch,
      };
    });
  };

  const handleSelectView = (nextView) => {
    if (nextView === "basic") {
      setCategoryExpanded(false);
    }

    setActiveView(nextView);
  };

  const handleChangeQty = (value) => {
    if (pricing.unit === "u") {
      updatePricing({
        qty: value.replace(/[^0-9]/g, ""),
      });

      return;
    }

    updatePricing({
      qty: value,
    });
  };

  const handleChangeUnit = (nextUnit) => {
    if (nextUnit !== "u" && pricing.promo !== "none") {
      const promo = normalizePromotion(pricing.promo);

      if (promo.type === "multi") {
        updatePricing({
          unit: nextUnit,
          promo: "none",
        });

        return;
      }
    }

    updatePricing({
      unit: nextUnit,
    });
  };

  const handleChangeCategory = (category) => {
    if (!category) {
      return;
    }

    setSelectedCategoryId(category.id);

    setSelectedSubcategoryId(null);

    updateItem(listId, itemId, {
      categoryId: category.id,
      categoryName: category.name,
      subcategoryId: null,
      subcategoryName: null,
    });
  };

  const handleChangeSubcategory = (subcategory) => {
    if (!selectedCategory || !subcategory) {
      return;
    }

    const subcategoryId = getSubcategoryId(subcategory);

    const subcategoryName = getSubcategoryName(subcategory);

    setSelectedSubcategoryId(subcategoryId);

    updateItem(listId, itemId, {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      subcategoryId,
      subcategoryName,
    });

    setCategoryExpanded(false);
  };

  function hasDecimals(value) {
    const number = Number(String(value).replace(",", "."));

    if (Number.isNaN(number)) {
      return false;
    }

    return !Number.isInteger(number);
  }

  const isUnitInvalid = pricing.unit === "u" && hasDecimals(pricing.qty);

  const handleSave = () => {
    if (!name.trim()) {
      safeAlert("Nombre vacío", "El producto debe tener un nombre");

      return;
    }

    if (isUnitInvalid) {
      safeAlert(
        "Cantidad inválida",
        "Para unidades (u) la cantidad debe ser un número entero",
      );

      return;
    }

    const promoValidation = validatePromotionUnit(
      normalizePromotion(pricing.promo),
      pricing.unit,
    );

    if (!promoValidation.valid) {
      safeAlert("Oferta inválida", promoValidation.message);

      return;
    }

    updateItem(listId, itemId, {
      name: name.trim(),
      barcode: barcode.trim(),
      unit: pricing.unit,
      priceInfo,
      categoryId: selectedCategory?.id ?? null,
      categoryName: selectedCategory?.name ?? null,
      subcategoryId: selectedSubcategoryId ?? null,
      subcategoryName: selectedSubcategoryName ?? null,
    });

    navigation.goBack();
  };

  const handleDelete = () => {
    safeAlert(
      "Eliminar producto",
      `¿Seguro que quieres eliminar "${item?.name}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteItem(listId, itemId);

            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleSearch = async () => {
    const code = String(barcode ?? "").trim();

    if (!code) {
      safeAlert(
        "Código vacío",
        "Introduce o escanea un código de barras primero",
      );

      return;
    }

    /*
     * En modo web esta llamada debe producirse antes del primer await.
     * Así Safari reconoce que la pestaña procede directamente del toque.
     *
     * En Android e iOS nativos devuelve null y no realiza ninguna acción.
     */
    const preparedWindow = prepareExternalWindow();

    try {
      const settings = await getSearchSettings();

      const engineKey =
        settings?.selectedProductEngine ||
        settings?.generalEngine ||
        "google_ai";

      const engine =
        SEARCH_ENGINES[engineKey] ||
        SEARCH_ENGINES.google_ai ||
        SEARCH_ENGINES.google;

      if (!engine || typeof engine.buildUrl !== "function") {
        throw new Error(`Motor de búsqueda no válido: ${engineKey}`);
      }

      const url = engine.buildUrl(code);

      console.log("Abriendo buscador externo:", {
        engineKey,
        code,
        url,
      });

      const result = await openExternalUrl(url, {
        preparedWindow,
      });

      if (!result.ok) {
        closePreparedExternalWindow(preparedWindow);

        if (result.reason === "popup-blocked") {
          safeAlert(
            "Ventana bloqueada",
            "El navegador ha bloqueado la pestaña del buscador. Permite las ventanas emergentes para esta página e inténtalo de nuevo.",
          );

          return;
        }

        safeAlert("Error", "No se pudo abrir el buscador");
      }
    } catch (error) {
      closePreparedExternalWindow(preparedWindow);

      console.error("Error al buscar el código de barras:", error);

      safeAlert("Error", "No se pudo abrir el buscador");
    }
  };

  function handleOpenScanner() {
    navigation.navigate(ROUTES.SCANNER_TAB, {
      screen: ROUTES.NEW_PRODUCT_SCANNER2,

      params: {
        listId,

        itemId,

        /*
         * Ruta utilizada para regresar al editor
         * después de leer correctamente el EAN-13.
         */
        returnToTab: ROUTES.SHOPPING_TAB,

        returnToScreen: ROUTES.ITEM_DETAIL,

        /*
         * Modo rápido:
         * únicamente copia el EAN-13 al producto.
         *
         * No consulta información externa ni muestra
         * el menú para guardar en el historial.
         */
        captureMode: "ean13-input",

        barcodeTypes: ["ean13"],

        /*
         * Controles visibles desde el primer renderizado.
         */
        showControls: true,

        /*
         * 0 = 1x
         * 1 = 1.2x
         * 2 = 1.5x
         * 3 = 2x
         */
        initialZoomIndex: 1,

        /*
         * La linterna comienza apagada por seguridad.
         */
        initialTorchEnabled: false,

        /*
         * Muestra los badges:
         * Zoom, Luz y EAN-13.
         */
        showStatusBadges: true,
      },
    });
  }

  if (!item) {
    return (
      <View style={styles.keyboardView}>
        <StatusBar {...headerConfig.statusBar} />

        <SafeAreaView style={styles.container} edges={["left", "right"]}>
          <View style={styles.center}>
            <Text style={styles.notFoundText}>Producto no encontrado</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar {...headerConfig.statusBar} />

      <View style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
          >
            <EditViewSelector
              activeView={activeView}
              onChange={handleSelectView}
            />

            {activeView === "basic" ? (
              <>
                <ProductHero name={name} barcode={barcode} />
                <Categorias
                  selectedCategoryId={selectedCategoryId}
                  selectedSubcategoryId={selectedSubcategoryId}
                  expanded={categoryExpanded}
                  onExpandedChange={setCategoryExpanded}
                  onChangeCategory={handleChangeCategory}
                  onChangeSubcategory={handleChangeSubcategory}
                />

                <CardNombreBarcode
                  nameItem={name}
                  barcodeItem={barcode}
                  onChangeName={setName}
                  onChangeBarcode={setBarcode}
                  onScanner={handleOpenScanner}
                  onSearch={handleSearch}
                />

                <CantidadPrecioCard
                  qty={pricing.qty}
                  price={pricing.unitPrice}
                  unit={pricing.unit}
                  currencySymbol={listCurrencySymbol}
                  onChangeQty={handleChangeQty}
                  onChangePrice={(value) => {
                    updatePricing({
                      unitPrice: value,
                    });
                  }}
                  showError={isUnitInvalid}
                />
                {/* 
                <Summary
                  base={priceInfo.subtotal}
                  savings={priceInfo.savings}
                  total={priceInfo.total}
                />
                */}
              </>
            ) : (
              <>
                <UnidadCard
                  unit={pricing.unit}
                  onChangeUnit={handleChangeUnit}
                />

                <Ofertas
                  quantity={pricing.qty}
                  unitPrice={pricing.unitPrice}
                  selectedPromo={pricing.promo}
                  onSelect={(value) => {
                    updatePricing({
                      promo: value,
                    });
                  }}
                  unit={pricing.unit}
                />

                <Summary
                  base={priceInfo.subtotal}
                  savings={priceInfo.savings}
                  total={priceInfo.total}
                />
              </>
            )}

            <BotonesAcciones onSave={handleSave} onDelete={handleDelete} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

/* ────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────── */

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  screen: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  notFoundText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },

  editViewSelector: {
    flexDirection: "row",
    gap: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },

  editViewButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },

  editViewButtonActive: {
    backgroundColor: "#2563eb",
  },

  editViewButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },

  editViewButtonTextActive: {
    color: "#ffffff",
  },

  productHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 20,
    backgroundColor: "#eff6ff",
  },

  productIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },

  productHeroText: {
    flex: 1,
    minWidth: 0,
  },

  productHeroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  productHeroSubtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  fieldGap: {
    height: 12,
  },

  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    fontSize: 16,
    color: "#111827",
  },

  inputNum: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: "#111827",
  },

  inputDanger: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff7f7",
  },

  inputError: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#b91c1c",
  },

  priceGrid: {
    flexDirection: "row",
    gap: 12,
  },

  inlineField: {
    flex: 1,
  },

  compactHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  compactHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  compactIconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },

  compactTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  compactTitle: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },

  compactChipsRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  compactCategoryChip: {
    maxWidth: "58%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    backgroundColor: "#f9fafb",
  },

  compactCategoryChipActive: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },

  compactCategoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },

  compactCategoryChipTextActive: {
    color: "#1d4ed8",
  },

  compactSubcategoryChip: {
    flexShrink: 1,
    maxWidth: "42%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    backgroundColor: "#f0fdf4",
  },

  compactSubcategoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },

  compactBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  badgeGroupTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },

  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryBadge: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    backgroundColor: "#eff6ff",
  },

  categoryBadgeSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },

  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1d4ed8",
  },

  categoryBadgeTextSelected: {
    color: "#ffffff",
  },

  subcategorySection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  subcategoryBadge: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    backgroundColor: "#f0fdf4",
  },

  subcategoryBadgeSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#16a34a",
  },

  subcategoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },

  subcategoryBadgeTextSelected: {
    color: "#ffffff",
  },

  badgePressed: {
    opacity: 0.75,
  },

  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    backgroundColor: "#f9fafb",
  },

  dropdownRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginLeft: 12,
  },

  dropdownLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  dropdownValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  dropdownValueActive: {
    color: "#111827",
    fontWeight: "800",
  },

  dropdownBody: {
    marginTop: 12,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  unitBtn: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    backgroundColor: "#f9fafb",
  },

  unitBtnActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },

  unitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  unitTextActive: {
    color: "#ffffff",
  },

  promoChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    backgroundColor: "#f9fafb",
  },

  promoChipSelected: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },

  promoChipDisabled: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },

  promoChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  promoChipTextSelected: {
    color: "#ffffff",
  },

  promoChipTextDisabled: {
    color: "#9ca3af",
  },

  pressed: {
    opacity: 0.8,
  },

  offerWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: 14,
    backgroundColor: "#fff7ed",
  },

  offerWarning: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: "#9a3412",
  },

  summaryCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#dcfce7",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  summarySubtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },

  summaryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryRows: {
    gap: 8,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },

  summaryLabelBold: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: "#111827",
  },

  summaryValueBold: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  summaryValueDiscount: {
    fontWeight: "800",
    color: "#16a34a",
  },

  summaryDivider: {
    height: 1,
    marginVertical: 4,
    backgroundColor: "#e5e7eb",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "transparent",
  },

  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 10,
  },

  actionButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  deleteButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
  },

  deleteButtonText: {
    color: "#dc2626",
  },

  saveButton: {
    borderColor: "#16a34a",
    backgroundColor: "#16a34a",
  },

  saveButtonText: {
    color: "#ffffff",
  },
});

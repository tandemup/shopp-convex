import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useProductLookupWithCache } from "@/src/hooks/useProductLookupWithCache";
import {
  openGoogleProductSearch,
  openGoogleShoppingSearch,
} from "@/src/services/googleProductSearch";

import {
  getProductBrand,
  getProductCategory,
  getProductDisplayName,
  getProductImageUrl,
  getProductUrl,
} from "@/src/services/productLookup";

import {
  removeScannedItem,
  updateScannedEntry,
} from "@/src/services/scannerHistory";

function normalizeBarcode(value) {
  return String(value || "").trim();
}

function normalizeString(value) {
  return String(value || "").trim();
}

function hasUsefulProductData(product) {
  if (!product) {
    return false;
  }

  return Boolean(
    normalizeString(product.name) ||
    normalizeString(product.product_name) ||
    normalizeString(product.brand) ||
    normalizeString(product.brands) ||
    normalizeString(product.imageUrl) ||
    normalizeString(product.image_url),
  );
}

function getSourceLabel(source, created) {
  if (created) {
    return "Registro nuevo";
  }

  switch (source) {
    case "convex":
      return "Convex";
    case "internet":
      return "Internet";
    case "manual":
      return "Edición manual";
    case "scanner":
      return "Escáner";
    default:
      return "Convex";
  }
}

function ProductImage({ uri, productName }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [uri]);

  if (!uri || imageError) {
    return (
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imagePlaceholderIcon}>🛒</Text>

        <Text style={styles.imagePlaceholderTitle}>
          {imageError ? "No se pudo cargar la imagen" : "Producto sin imagen"}
        </Text>

        <Text style={styles.imagePlaceholderDescription}>
          Puedes introducir una URL de imagen en el formulario.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri }}
        style={styles.productImage}
        contentFit="contain"
        transition={180}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        accessibilityLabel={
          productName
            ? `Imagen de ${productName}`
            : "Imagen del producto escaneado"
        }
        onError={() => setImageError(true)}
      />

      <View style={styles.cacheBadge}>
        <Text style={styles.cacheBadgeText}>Imagen en caché</Text>
      </View>
    </View>
  );
}

function StatusCard({
  source,
  created,
  accessCount,
  status,
  loading,
  consultingInternet,
}) {
  let title = "Producto cargado";
  let description = "Los datos se han recuperado correctamente.";

  if (loading) {
    title = "Consultando Convex";
    description = "Buscando el código de barras en la base de datos.";
  } else if (consultingInternet) {
    title = "Buscando información";
    description =
      "El registro existe, pero estamos completando sus datos desde internet.";
  } else if (created) {
    title = "Nuevo código registrado";
    description =
      "No existía información. Se ha creado un registro mínimo en Convex.";
  } else if (status === "not_found") {
    title = "Información no encontrada";
    description =
      "El código está registrado, pero todavía no contiene datos del producto.";
  }

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIcon}>
        {loading || consultingInternet ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <Text style={styles.statusIconText}>
            {created ? "＋" : status === "not_found" ? "?" : "✓"}
          </Text>
        )}
      </View>

      <View style={styles.statusContent}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusDescription}>{description}</Text>

        <View style={styles.statusMetaRow}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>
              {getSourceLabel(source, created)}
            </Text>
          </View>

          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>
              {accessCount || 1} {accessCount === 1 ? "consulta" : "consultas"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "sentences",
  autoCorrect = true,
  keyboardType = "default",
  multiline = false,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={[styles.input, multiline && styles.multilineInput]}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

export default function EditScannedItemScreen({ route, navigation }) {
  const params = route?.params || {};

  const historyItem = params.item ?? null;
  const initialProduct = params.product ?? historyItem ?? null;

  const barcode = normalizeBarcode(
    params.barcode ||
      historyItem?.barcode ||
      params.scannedBarcode ||
      params.code ||
      params.data,
  );

  const registerAccess = useMutation(api.productCache.registerAccess);
  const saveProductData = useMutation(api.productCache.saveProductData);
  const markAsNotFound = useMutation(api.productCache.markAsNotFound);

  const {
    loading: internetLookupLoading,
    error: lookupError,
    lookupWithCache,
  } = useProductLookupWithCache();

  const initializedBarcodeRef = useRef(null);

  const [product, setProduct] = useState(initialProduct);

  const [initializing, setInitializing] = useState(true);
  const [consultingInternet, setConsultingInternet] = useState(false);

  const [recordCreated, setRecordCreated] = useState(false);
  const [accessCount, setAccessCount] = useState(0);
  const [productStatus, setProductStatus] = useState("pending");
  const [dataSource, setDataSource] = useState("scanner");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");

  const busy =
    initializing ||
    consultingInternet ||
    internetLookupLoading ||
    saving ||
    deleting;

  const visibleError = localError || lookupError;

  const resolvedName = useMemo(() => {
    return (
      normalizeString(name) ||
      getProductDisplayName(product, barcode) ||
      "Producto sin identificar"
    );
  }, [name, product, barcode]);

  const fillFormFromProduct = useCallback(
    (nextProduct) => {
      if (!nextProduct) {
        return;
      }

      setName(getProductDisplayName(nextProduct, barcode));
      setBrand(getProductBrand(nextProduct));
      setCategory(getProductCategory(nextProduct));
      setImageUrl(getProductImageUrl(nextProduct));
      setProductUrl(getProductUrl(nextProduct, barcode));
    },
    [barcode],
  );

  const applyConvexProduct = useCallback(
    (convexProduct) => {
      if (!convexProduct) {
        return;
      }

      setProduct(convexProduct);
      setAccessCount(convexProduct.accessCount || 1);
      setProductStatus(convexProduct.status || "pending");
      setDataSource(convexProduct.source || "convex");

      fillFormFromProduct(convexProduct);
    },
    [fillFormFromProduct],
  );

  /**
   * Consulta externa para completar un registro que ya existe
   * en Convex pero todavía no dispone de información.
   */
  const searchExternalProduct = useCallback(
    async ({ silent = false } = {}) => {
      if (!barcode) {
        setLocalError("No se ha recibido ningún código de barras.");
        return null;
      }

      if (!silent) {
        setLocalError(null);
      }

      setConsultingInternet(true);

      try {
        const result = await lookupWithCache(barcode);
        const externalProduct = result?.product ?? result ?? null;

        if (!externalProduct || !hasUsefulProductData(externalProduct)) {
          await markAsNotFound({ barcode });

          setProductStatus("not_found");

          if (!silent) {
            setLocalError(
              "No se encontró información. Puedes introducirla manualmente.",
            );
          }

          return null;
        }

        const nextProduct = {
          barcode,
          name: getProductDisplayName(externalProduct, barcode),
          brand: getProductBrand(externalProduct),
          category: getProductCategory(externalProduct),
          imageUrl: getProductImageUrl(externalProduct),
          productUrl: getProductUrl(externalProduct, barcode),
        };

        const savedProduct = await saveProductData({
          barcode,
          name: normalizeString(nextProduct.name) || undefined,
          brand: normalizeString(nextProduct.brand) || undefined,
          category: normalizeString(nextProduct.category) || undefined,
          imageUrl: normalizeString(nextProduct.imageUrl) || undefined,
          productUrl: normalizeString(nextProduct.productUrl) || undefined,
          source: "internet",
          status: "complete",
        });

        setRecordCreated(false);
        applyConvexProduct(savedProduct);

        return savedProduct;
      } catch (error) {
        console.error("EditScannedItemScreen external lookup error:", error);

        if (!silent) {
          setLocalError(
            error?.message ||
              "No se pudo consultar la información del producto.",
          );
        }

        return null;
      } finally {
        setConsultingInternet(false);
      }
    },
    [
      barcode,
      lookupWithCache,
      markAsNotFound,
      saveProductData,
      applyConvexProduct,
    ],
  );

  /**
   * Registro inicial:
   * - busca en Convex;
   * - incrementa accessCount;
   * - crea el registro si no existe;
   * - consulta internet únicamente si faltan datos.
   */
  useEffect(() => {
    let active = true;

    async function initializeProduct() {
      if (!barcode) {
        setLocalError("No se ha recibido ningún código de barras.");
        setInitializing(false);
        return;
      }

      if (initializedBarcodeRef.current === barcode) {
        return;
      }

      initializedBarcodeRef.current = barcode;

      setInitializing(true);
      setLocalError(null);

      try {
        const result = await registerAccess({ barcode });

        if (!active) {
          return;
        }

        const convexProduct = result?.product ?? null;

        setRecordCreated(Boolean(result?.created));
        applyConvexProduct(convexProduct);

        if (
          initialProduct &&
          hasUsefulProductData(initialProduct) &&
          !hasUsefulProductData(convexProduct)
        ) {
          fillFormFromProduct(initialProduct);
        }

        if (!hasUsefulProductData(convexProduct)) {
          await searchExternalProduct({ silent: true });
        }
      } catch (error) {
        console.error("EditScannedItemScreen initialization error:", error);

        if (active) {
          setLocalError(
            error?.message || "No se pudo registrar el acceso al producto.",
          );
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    initializeProduct();

    return () => {
      active = false;
    };
  }, [
    barcode,
    initialProduct,
    registerAccess,
    applyConvexProduct,
    fillFormFromProduct,
    searchExternalProduct,
  ]);

  const handleSave = useCallback(async () => {
    if (!barcode) {
      setLocalError("No hay código de barras para guardar.");
      return;
    }

    const normalizedName = normalizeString(name);

    if (!normalizedName) {
      setLocalError("El nombre del producto no puede estar vacío.");
      return;
    }

    setSaving(true);
    setLocalError(null);

    try {
      const savedProduct = await saveProductData({
        barcode,
        name: normalizedName,
        brand: normalizeString(brand) || undefined,
        category: normalizeString(category) || undefined,
        imageUrl: normalizeString(imageUrl) || undefined,
        productUrl: normalizeString(productUrl) || undefined,
        source: "manual",
        status: "complete",
      });

      const historyPatch = {
        barcode,
        name: normalizedName,
        brand: normalizeString(brand),
        category: normalizeString(category),
        imageUrl: normalizeString(imageUrl),
        url: normalizeString(productUrl),
        productUrl: normalizeString(productUrl),
        source: "manual",
      };

      await updateScannedEntry(barcode, historyPatch);

      setProduct(savedProduct);
      navigation.goBack();
    } catch (error) {
      console.error("EditScannedItemScreen save error:", error);

      setLocalError(
        error?.message || "No se pudo guardar la información del producto.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    barcode,
    name,
    brand,
    category,
    imageUrl,
    productUrl,
    saveProductData,
    navigation,
  ]);

  const handleDeleteFromHistory = useCallback(async () => {
    if (!barcode) {
      navigation.goBack();
      return;
    }

    setDeleting(true);
    setLocalError(null);

    try {
      /*
       * Se elimina únicamente del historial local.
       * El registro de productCache se conserva porque contiene
       * estadísticas de acceso y puede reutilizarse.
       */
      await removeScannedItem(barcode);
      navigation.goBack();
    } catch (error) {
      console.error("EditScannedItemScreen delete error:", error);

      setLocalError("No se pudo eliminar el producto del historial local.");
    } finally {
      setDeleting(false);
    }
  }, [barcode, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.eyebrow}>PRODUCTO ESCANEADO</Text>

              <Text style={styles.title} numberOfLines={3}>
                {resolvedName}
              </Text>
            </View>

            <View style={styles.scannerBadge}>
              <Text style={styles.scannerBadgeIcon}>▦</Text>
            </View>
          </View>

          <View style={styles.barcodeContainer}>
            <Text style={styles.barcodeLabel}>Código de barras</Text>
            <Text selectable style={styles.barcode}>
              {barcode || "Sin código"}
            </Text>
          </View>
        </View>
        <StatusCard
          source={dataSource}
          created={recordCreated}
          accessCount={accessCount}
          status={productStatus}
          loading={initializing}
          consultingInternet={consultingInternet || internetLookupLoading}
        />
        {visibleError ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>!</Text>
            </View>

            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}
        <View style={styles.imageCard}>
          <ProductImage uri={imageUrl} productName={resolvedName} />
        </View>
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Información del producto</Text>

              <Text style={styles.sectionDescription}>
                Los cambios se guardarán en Convex.
              </Text>
            </View>

            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Editable</Text>
            </View>
          </View>

          <FormField
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Nombre del producto"
          />

          <FormField
            label="Marca"
            value={brand}
            onChangeText={setBrand}
            placeholder="Marca o fabricante"
            autoCapitalize="words"
          />

          <FormField
            label="Categoría"
            value={category}
            onChangeText={setCategory}
            placeholder="Categoría del producto"
          />

          <FormField
            label="URL de la imagen"
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <FormField
            label="URL del producto"
            value={productUrl}
            onChangeText={setProductUrl}
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        <View style={styles.actionsCard}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressedButton,
              busy && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={busy}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonIcon}>✓</Text>
                <Text style={styles.primaryButtonText}>Guardar producto</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressedButton,
              busy && styles.disabledButton,
            ]}
            onPress={() => searchExternalProduct({ silent: false })}
            disabled={busy}
          >
            {consultingInternet || internetLookupLoading ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <>
                <Text style={styles.secondaryButtonIcon}>↻</Text>
                <Text style={styles.secondaryButtonText}>
                  Actualizar desde internet
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.separator} />

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressedButton,
              busy && styles.disabledButton,
            ]}
            onPress={handleDeleteFromHistory}
            disabled={busy}
          >
            <Text style={styles.deleteButtonText}>
              {deleting ? "Eliminando..." : "Eliminar del historial local"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => navigation.goBack()}
            disabled={saving || deleting}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
        <View style={styles.googleSearchCard}>
          <View style={styles.googleSearchHeader}>
            <View style={styles.googleSearchHeaderIcon}>
              <Text style={styles.googleSearchHeaderIconText}>⌕</Text>
            </View>

            <View style={styles.googleSearchHeaderContent}>
              <Text style={styles.googleSearchTitle}>
                Buscar más información
              </Text>

              <Text style={styles.googleSearchDescription}>
                Consulta Google usando el código de barras del producto.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar producto en Google"
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              busy && styles.disabledButton,
            ]}
            disabled={busy || !barcode}
            onPress={async () => {
              try {
                setLocalError(null);
                await openGoogleProductSearch(barcode);
              } catch (error) {
                setLocalError(
                  error?.message || "No se pudo abrir la búsqueda de Google.",
                );
              }
            }}
          >
            <View style={styles.googleLogo}>
              <Text style={styles.googleLogoText}>G</Text>
            </View>

            <View style={styles.externalButtonContent}>
              <Text style={styles.googleButtonText}>Buscar en Google</Text>

              <Text style={styles.googleButtonDescription}>
                Nombre, marca, fabricante e información general
              </Text>
            </View>

            <Text style={styles.externalButtonArrow}>›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar producto en Google Shopping"
            style={({ pressed }) => [
              styles.shoppingButton,
              pressed && styles.shoppingButtonPressed,
              busy && styles.disabledButton,
            ]}
            disabled={busy || !barcode}
            onPress={async () => {
              try {
                setLocalError(null);
                await openGoogleShoppingSearch(barcode);
              } catch (error) {
                setLocalError(
                  error?.message ||
                    "No se pudo abrir la búsqueda de Google Shopping.",
                );
              }
            }}
          >
            <View style={styles.shoppingIcon}>
              <Text style={styles.shoppingIconText}>▱</Text>
            </View>

            <View style={styles.externalButtonContent}>
              <Text style={styles.shoppingButtonText}>
                Buscar en Google Shopping
              </Text>

              <Text style={styles.shoppingButtonDescription}>
                Precios, tiendas y ofertas disponibles
              </Text>
            </View>

            <Text style={styles.shoppingButtonArrow}>›</Text>
          </Pressable>

          <View style={styles.externalSearchNotice}>
            <Text style={styles.externalSearchNoticeIcon}>↗</Text>

            <Text style={styles.externalSearchNoticeText}>
              La búsqueda se abrirá en el navegador.
            </Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Eliminarlo del historial no borra el registro de Convex ni su contador
          de accesos.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },

  scroll: {
    flex: 1,
  },

  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },

  hero: {
    backgroundColor: "#101828",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },

  heroTextContainer: {
    flex: 1,
  },

  eyebrow: {
    color: "#A8B4C7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
  },

  scannerBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#1D2939",
    alignItems: "center",
    justifyContent: "center",
  },

  scannerBadgeIcon: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },

  barcodeContainer: {
    marginTop: 18,
    backgroundColor: "#1D2939",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  barcodeLabel: {
    color: "#98A2B3",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },

  barcode: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  statusCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  statusIconText: {
    color: "#2563EB",
    fontSize: 20,
    fontWeight: "900",
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: "#101828",
    fontSize: 15,
    fontWeight: "900",
  },

  statusDescription: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },

  statusMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },

  metaBadge: {
    backgroundColor: "#F2F4F7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  metaBadgeText: {
    color: "#475467",
    fontSize: 11,
    fontWeight: "800",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F4",
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 17,
    padding: 14,
    marginBottom: 14,
  },

  errorIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#FEE4E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  errorIconText: {
    color: "#D92D20",
    fontWeight: "900",
  },

  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },

  imageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  imageContainer: {
    position: "relative",
    minHeight: 230,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },

  productImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#F8FAFC",
  },

  cacheBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(16, 24, 40, 0.82)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  cacheBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  imagePlaceholder: {
    minHeight: 210,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  imagePlaceholderIcon: {
    fontSize: 38,
    marginBottom: 10,
  },

  imagePlaceholderTitle: {
    color: "#344054",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  imagePlaceholderDescription: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 5,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },

  sectionTitle: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "900",
  },

  sectionDescription: {
    color: "#667085",
    fontSize: 13,
    marginTop: 3,
  },

  editBadge: {
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  editBadgeText: {
    color: "#027A48",
    fontSize: 11,
    fontWeight: "900",
  },

  field: {
    marginTop: 15,
  },

  label: {
    color: "#344054",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    minHeight: 48,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: "#101828",
    fontSize: 15,
  },

  multilineInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },

  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    gap: 10,
  },

  primaryButton: {
    minHeight: 52,
    backgroundColor: "#101828",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },

  primaryButtonIcon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryButton: {
    minHeight: 50,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },

  secondaryButtonIcon: {
    color: "#2563EB",
    fontSize: 19,
    fontWeight: "900",
  },

  secondaryButtonText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "900",
  },

  separator: {
    height: 1,
    backgroundColor: "#EAECF0",
    marginVertical: 3,
  },

  deleteButton: {
    minHeight: 47,
    borderRadius: 15,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  deleteButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "900",
  },

  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "800",
  },

  pressedButton: {
    opacity: 0.78,
  },

  disabledButton: {
    opacity: 0.5,
  },
  googleSearchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    gap: 11,

    ...Platform.select({
      web: {
        boxShadow: "0 8px 28px rgba(16, 24, 40, 0.06)",
      },
      default: {
        shadowColor: "#101828",
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },

  googleSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  googleSearchHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  googleSearchHeaderIconText: {
    color: "#344054",
    fontSize: 23,
    fontWeight: "900",
  },

  googleSearchHeaderContent: {
    flex: 1,
  },

  googleSearchTitle: {
    color: "#101828",
    fontSize: 17,
    fontWeight: "900",
  },

  googleSearchDescription: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  googleButton: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0D5DD",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  googleButtonPressed: {
    backgroundColor: "#F8FAFC",
    borderColor: "#4285F4",
    transform: [{ scale: 0.992 }],
  },

  googleLogo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  googleLogoText: {
    color: "#4285F4",
    fontSize: 23,
    fontWeight: "900",
  },

  externalButtonContent: {
    flex: 1,
    paddingRight: 8,
  },

  googleButtonText: {
    color: "#101828",
    fontSize: 15,
    fontWeight: "900",
  },

  googleButtonDescription: {
    color: "#667085",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  externalButtonArrow: {
    color: "#667085",
    fontSize: 29,
    lineHeight: 30,
    fontWeight: "400",
  },

  shoppingButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "#1D4ED8",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,

    ...Platform.select({
      web: {
        boxShadow: "0 6px 16px rgba(37, 99, 235, 0.18)",
      },
      default: {
        shadowColor: "#2563EB",
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.18,
        shadowRadius: 9,
        elevation: 3,
      },
    }),
  },

  shoppingButtonPressed: {
    backgroundColor: "#1D4ED8",
    transform: [{ scale: 0.992 }],
  },

  shoppingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.26)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  shoppingIconText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    transform: [{ rotate: "180deg" }],
  },

  shoppingButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  shoppingButtonDescription: {
    color: "#DBEAFE",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  shoppingButtonArrow: {
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 30,
    fontWeight: "400",
  },

  externalSearchNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },

  externalSearchNoticeIcon: {
    color: "#98A2B3",
    fontSize: 13,
    fontWeight: "900",
    marginRight: 5,
  },

  externalSearchNoticeText: {
    color: "#98A2B3",
    fontSize: 11,
    fontWeight: "700",
  },
  footerNote: {
    color: "#667085",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 12,
  },
});

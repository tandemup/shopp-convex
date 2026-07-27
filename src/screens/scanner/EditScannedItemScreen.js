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
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useProductLookupWithCache } from "@/src/hooks/useProductLookupWithCache";
import {
  openBingShoppingSearch,
  openGoogleAIMode,
  openGoogleShoppingSearch,
} from "@/src/screens/settings/SearchEngines";

import {
  getProductBrand,
  getProductCategory,
  getProductDisplayName,
  getProductImageUrl,
  getProductUrl,
} from "@/src/services/productLookup";

import { useScannedHistoryStorage } from "@/src/hooks/useScannedHistoryStorage";
import { normalizeBarcode } from "@/src/utils/barcodeNormalization";
import BarcodeLink from "@/src/components/controls/BarcodeLink";
import { ROUTES } from "@/src/navigation/ROUTES";

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
        <Text style={styles.cacheBadgeText}>Caché de imagen activa</Text>
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

  if (consultingInternet) {
    title = "Buscando información";
    description =
      "El registro existe, pero estamos completando sus datos desde internet.";
  } else if (loading) {
    title = "Consultando Convex";
    description = "Buscando el código de barras en la base de datos.";
  } else if (created) {
    title = "Nuevo código registrado";
    description =
      "No existía información. Se ha creado un registro mí­nimo en Convex.";
  } else if (status === "not_found") {
    title = "Información no encontrada";
    description =
      "El código está registrado, pero todavía no contiene datos del producto.";
  }

  const visibleAccessCount = accessCount || 1;

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
              {visibleAccessCount}{" "}
              {visibleAccessCount === 1 ? "consulta" : "consultas"}
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

function GoogleModeIA({ busy, barcode, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar producto en Google Modo IA"
      style={({ pressed }) => [
        styles.externalAction,
        pressed && styles.externalActionPressed,
        (busy || !barcode) && styles.disabledButton,
      ]}
      disabled={busy || !barcode}
      onPress={onPress}
    >
      <View style={styles.googleIcon}>
        <Text style={styles.googleIconText}>G</Text>
      </View>

      <View style={styles.externalActionContent}>
        <Text style={styles.externalActionTitle}>Google Modo IA</Text>
        <Text style={styles.externalActionDescription}>
          Respuesta generada a partir del código
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#667085" />
    </Pressable>
  );
}

function GoogleShopping({ busy, barcode, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar producto en Google Shopping"
      style={({ pressed }) => [
        styles.externalAction,
        styles.externalActionPrimary,
        pressed && styles.externalActionPrimaryPressed,
        (busy || !barcode) && styles.disabledButton,
      ]}
      disabled={busy || !barcode}
      onPress={onPress}
    >
      <View style={styles.shoppingIcon}>
        <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
      </View>

      <View style={styles.externalActionContent}>
        <Text
          style={[styles.externalActionTitle, styles.externalActionTitleLight]}
        >
          Google Shopping
        </Text>
        <Text
          style={[
            styles.externalActionDescription,
            styles.externalActionDescriptionLight,
          ]}
        >
          Precios, tiendas y ofertas
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
    </Pressable>
  );
}

function MicrosoftBing({ busy, barcode, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar producto en Bing"
      style={({ pressed }) => [
        styles.externalAction,
        styles.externalActionPrimary,
        pressed && styles.externalActionPrimaryPressed,
        (busy || !barcode) && styles.disabledButton,
      ]}
      disabled={busy || !barcode}
      onPress={onPress}
    >
      <View style={styles.shoppingIcon}>
        <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
      </View>

      <View style={styles.externalActionContent}>
        <Text
          style={[styles.externalActionTitle, styles.externalActionTitleLight]}
        >
          Bing
        </Text>
        <Text
          style={[
            styles.externalActionDescription,
            styles.externalActionDescriptionLight,
          ]}
        >
          Precios, tiendas y ofertas
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
    </Pressable>
  );
}

export default function EditScannedItemScreen({ route, navigation }) {
  const params = route?.params || {};
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 920;

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
  const submitProductReview = useMutation(api.productCache.submitProductReview);
  const currentUser = useQuery(api.users.current);
  const scanHistoryStorage = useScannedHistoryStorage();
  const userIsLoading = currentUser === undefined;
  const isAdmin = currentUser?.isAdmin === true;

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
    userIsLoading ||
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
        const result = await lookupWithCache(barcode, {
          forceRefresh: !silent,
        });
        const cachedProduct = result?.product ?? null;

        if (result?.notFound || !hasUsefulProductData(cachedProduct)) {
          setProductStatus("not_found");

          if (!silent) {
            setLocalError(
              "No se encontró información. Puedes introducirla manualmente.",
            );
          }

          return null;
        }

        setRecordCreated(false);
        applyConvexProduct(cachedProduct);

        return cachedProduct;
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
    [barcode, lookupWithCache, applyConvexProduct],
  );

  useEffect(() => {
    let active = true;

    async function initializeProduct() {
      if (userIsLoading) {
        return;
      }

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

      if (!isAdmin) {
        if (initialProduct && hasUsefulProductData(initialProduct)) {
          setProduct(initialProduct);
          setProductStatus(initialProduct.status || "pending_review");
          setDataSource(initialProduct.source || "scanner");
          fillFormFromProduct(initialProduct);
        } else {
          await searchExternalProduct({ silent: true });
        }

        if (active) {
          setInitializing(false);
        }

        return;
      }

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
    userIsLoading,
    isAdmin,
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
      if (!isAdmin) {
        await submitProductReview({
          barcode,
          name: normalizedName,
          brand: normalizeString(brand) || undefined,
          category: normalizeString(category) || undefined,
          imageUrl: normalizeString(imageUrl) || undefined,
          productUrl: normalizeString(productUrl) || undefined,
          source: "user_review",
          status: "pending_review",
        });

        const historyPatch = {
          barcode,
          name: normalizedName,
          brand: normalizeString(brand),
          category: normalizeString(category),
          imageUrl: normalizeString(imageUrl),
          url: normalizeString(productUrl),
          productUrl: normalizeString(productUrl),
          source: historyItem?.source || "scanner",
          dataSource: "pending_review",
          reviewStatus: "pending_review",
        };

        await scanHistoryStorage.updateScannedEntry(barcode, historyPatch);
        navigation.goBack();
        return;
      }

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
        source: historyItem?.source || "scanner",
        dataSource: "manual",
      };

      await scanHistoryStorage.updateScannedEntry(barcode, historyPatch);

      setProduct(savedProduct);
      navigation.goBack();
    } catch (error) {
      console.error("EditScannedItemScreen save error:", error);

      setLocalError(
        error?.message ||
          (isAdmin
            ? "No se pudo guardar la información del producto."
            : "No se pudo enviar la propuesta a revisión."),
      );
    } finally {
      setSaving(false);
    }
  }, [
    barcode,
    isAdmin,
    historyItem,
    name,
    brand,
    category,
    imageUrl,
    productUrl,
    saveProductData,
    submitProductReview,
    scanHistoryStorage,
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
      await scanHistoryStorage.removeScannedItem(barcode);
      navigation.goBack();
    } catch (error) {
      console.error("EditScannedItemScreen delete error:", error);

      setLocalError("No se pudo eliminar el producto del historial local.");
    } finally {
      setDeleting(false);
    }
  }, [barcode, navigation, scanHistoryStorage]);

  const handleShowProductInfo = useCallback(() => {
    navigation.navigate(ROUTES.PRODUCT_INFO, {
      barcode,
      product: product || null,
      fromCache: dataSource === "convex",
    });
  }, [barcode, dataSource, navigation, product]);

  const handleGoogleAIModeSearch = useCallback(async () => {
    if (!barcode) {
      setLocalError("No hay código de barras para buscar.");
      return;
    }

    try {
      setLocalError(null);
      await openGoogleAIMode(barcode);
    } catch (error) {
      setLocalError(
        error?.message || "No se pudo abrir la búsqueda de Google.",
      );
    }
  }, [barcode]);

  const handleGoogleShoppingSearch = useCallback(async () => {
    if (!barcode) {
      setLocalError("No hay código de barras para buscar.");
      return;
    }

    try {
      setLocalError(null);
      await openGoogleShoppingSearch(barcode);
    } catch (error) {
      setLocalError(
        error?.message || "No se pudo abrir la búsqueda de Google Shopping.",
      );
    }
  }, [barcode]);

  const handleBingShoppingSearch = useCallback(async () => {
    if (!barcode) {
      setLocalError("No hay código de barras para buscar.");
      return;
    }

    try {
      setLocalError(null);
      await openBingShoppingSearch(barcode);
    } catch (error) {
      setLocalError(
        error?.message || "No se pudo abrir la búsqueda de Bing Shopping.",
      );
    }
  }, [barcode]);

  if (userIsLoading) {
    return (
      <View style={styles.accessScreen}>
        <View style={styles.accessCard}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.accessTitle}>Comprobando permisos</Text>
          <Text style={styles.accessDescription}>
            Estamos verificando si tu usuario puede editar productos escaneados.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isWideLayout && styles.contentWide,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.productHeader}>
          <View style={styles.productHeaderTopRow}>
            <View style={styles.productHeaderIdentity}>
              <View style={styles.productIconContainer}>
                <Ionicons name="barcode-outline" size={26} color="#FFFFFF" />
              </View>

              <Text style={styles.productHeaderLabel}>PRODUCTO ESCANEADO</Text>
            </View>

            <View style={styles.productLocatedBadge}>
              <View
                style={[
                  styles.productLocatedDot,
                  productStatus === "not_found" &&
                    styles.productLocatedDotWarning,
                ]}
              />
              <Text style={styles.productLocatedText}>
                {productStatus === "not_found"
                  ? "Sin identificar"
                  : "Producto localizado"}
              </Text>
            </View>
          </View>

          <Text style={styles.productName} numberOfLines={3}>
            {resolvedName}
          </Text>

          <BarcodeLink barcode={barcode} style={styles.productBarcodeRow}>
            <View style={styles.productBarcodeContent}>
              <Text style={styles.productBarcodeLabel}>Código de barras</Text>
              <Text
                style={styles.productBarcodeValue}
                numberOfLines={1}
                selectable
              >
                {barcode || "Sin código"}
              </Text>
            </View>

            <View style={styles.productBarcodeTypeBadge}>
              <Text style={styles.productBarcodeTypeText}>EAN-13</Text>
            </View>
          </BarcodeLink>
        </View>

        {visibleError ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={20} color="#B42318" />
            </View>

            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}

        <View style={[styles.workspace, isWideLayout && styles.workspaceWide]}>
          <View
            style={[styles.leftColumn, isWideLayout && styles.leftColumnWide]}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardEyebrow}>VISTA PREVIA</Text>
                  <Text style={styles.cardTitle}>Imagen del producto</Text>
                </View>

                <View style={styles.softBadge}>
                  <Ionicons name="image-outline" size={15} color="#475467" />
                  <Text style={styles.softBadgeText}>Caché activa</Text>
                </View>
              </View>

              <ProductImage uri={imageUrl} productName={resolvedName} />
            </View>

            <StatusCard
              source={dataSource}
              created={recordCreated}
              accessCount={accessCount}
              status={productStatus}
              loading={initializing}
              consultingInternet={consultingInternet || internetLookupLoading}
            />

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardEyebrow}>BÚSQUEDA EXTERNA</Text>
                  <Text style={styles.cardTitle}>Buscar más información</Text>
                  <Text style={styles.cardDescription}>
                    Abre el código de barras en un buscador externo.
                  </Text>
                </View>

                <Ionicons name="open-outline" size={20} color="#667085" />
              </View>
              <GoogleModeIA
                busy={busy}
                barcode={barcode}
                onPress={handleGoogleAIModeSearch}
              />
              <GoogleShopping
                busy={busy}
                barcode={barcode}
                onPress={handleGoogleShoppingSearch}
              />
              <MicrosoftBing
                busy={busy}
                barcode={barcode}
                onPress={handleBingShoppingSearch}
              />
            </View>
          </View>

          <View
            style={[styles.rightColumn, isWideLayout && styles.rightColumnWide]}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardEyebrow}>DATOS PRINCIPALES</Text>
                  <Text style={styles.cardTitle}>Información del producto</Text>
                  <Text style={styles.cardDescription}>
                    {isAdmin
                      ? "Edita los campos y guarda la ficha consolidada en Convex."
                      : "Completa los campos y envía la propuesta para revisión."}
                  </Text>
                </View>

                <View style={styles.editBadge}>
                  <Ionicons
                    name={isAdmin ? "create-outline" : "time-outline"}
                    size={14}
                    color="#027A48"
                  />
                  <Text style={styles.editBadgeText}>
                    {isAdmin ? "Editable" : "Revisión"}
                  </Text>
                </View>
              </View>

              <FormField
                label="Nombre"
                value={name}
                onChangeText={setName}
                placeholder="Nombre del producto"
              />

              <View style={styles.formGrid}>
                <View style={styles.formGridItem}>
                  <FormField
                    label="Marca"
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="Marca o fabricante"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.formGridItem}>
                  <FormField
                    label="Categoría"
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Categoría del producto"
                  />
                </View>
              </View>

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

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardEyebrow}>ACCIONES</Text>
                  <Text style={styles.cardTitle}>Producto</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  busy && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={busy}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isAdmin ? "checkmark-circle-outline" : "send-outline"
                      }
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryButtonText}>
                      {isAdmin ? "Guardar producto" : "Enviar a revisión"}
                    </Text>
                  </>
                )}
              </Pressable>

              {isAdmin ? (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.secondaryButtonPressed,
                      busy && styles.disabledButton,
                    ]}
                    onPress={() => searchExternalProduct({ silent: false })}
                    disabled={busy}
                  >
                    {consultingInternet || internetLookupLoading ? (
                      <ActivityIndicator color="#2563EB" />
                    ) : (
                      <>
                        <Ionicons
                          name="refresh-outline"
                          size={20}
                          color="#2563EB"
                        />
                        <View style={styles.buttonTextBlock}>
                          <Text style={styles.secondaryButtonText}>
                            Actualizar desde internet
                          </Text>
                          <Text style={styles.secondaryButtonHint}>
                            Sustituye los campos con datos externos
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.secondaryButtonPressed,
                      busy && styles.disabledButton,
                    ]}
                    onPress={handleShowProductInfo}
                    disabled={busy || !barcode}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#2563EB"
                    />
                    <View style={styles.buttonTextBlock}>
                      <Text style={styles.secondaryButtonText}>
                        Ver información del producto
                      </Text>
                      <Text style={styles.secondaryButtonHint}>
                        Consulta la ficha completa del producto
                      </Text>
                    </View>
                  </Pressable>

                  <View style={styles.dangerZone}>
                    <View style={styles.dangerZoneHeader}>
                      <Ionicons
                        name="warning-outline"
                        size={18}
                        color="#B42318"
                      />
                      <View style={styles.dangerZoneText}>
                        <Text style={styles.dangerZoneTitle}>
                          Historial local
                        </Text>
                        <Text style={styles.dangerZoneDescription}>
                          El registro global de Convex no se eliminará.
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.deleteButtonPressed,
                        busy && styles.disabledButton,
                      ]}
                      onPress={handleDeleteFromHistory}
                      disabled={busy}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#B42318"
                      />
                      <Text style={styles.deleteButtonText}>
                        {deleting
                          ? "Eliminando..."
                          : "Eliminar del historial local"}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.cancelButtonPressed,
                    ]}
                    onPress={() => navigation.goBack()}
                    disabled={saving || deleting}
                  >
                    <Ionicons name="close-outline" size={18} color="#475467" />
                    <Text style={styles.cancelButtonText}>
                      Cerrar sin guardar
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    styles.deleteButtonStandalone,
                    pressed && styles.deleteButtonPressed,
                    busy && styles.disabledButton,
                  ]}
                  onPress={handleDeleteFromHistory}
                  disabled={busy}
                >
                  <Ionicons name="trash-outline" size={18} color="#B42318" />
                  <Text style={styles.deleteButtonText}>
                    {deleting
                      ? "Eliminando..."
                      : "Eliminar del historial local"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          {isAdmin
            ? "La ficha global se conserva en Convex. El historial local pertenece a este dispositivo."
            : "Tu propuesta quedará pendiente hasta que un administrador la revise."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F4F7",
  },

  accessScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F2F4F7",
  },

  accessCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 28px rgba(16, 24, 40, 0.08)",
      },
      default: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },

  accessTitle: {
    marginTop: 12,
    color: "#101828",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  accessDescription: {
    marginTop: 8,
    color: "#667085",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  scroll: {
    flex: 1,
  },

  content: {
    width: "100%",
    maxWidth: 780,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 44,
  },

  contentWide: {
    maxWidth: 1180,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 56,
  },

  workspace: {
    gap: 14,
  },

  workspaceWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
  },

  leftColumn: {
    gap: 14,
  },

  leftColumnWide: {
    width: 420,
    flexShrink: 0,
  },

  rightColumn: {
    gap: 14,
  },

  rightColumnWide: {
    flex: 1,
    minWidth: 0,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 28px rgba(16, 24, 40, 0.06)",
      },
      default: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  cardEyebrow: {
    color: "#98A2B3",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  cardTitle: {
    color: "#101828",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },

  cardDescription: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  softBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F2F4F7",
  },

  softBadgeText: {
    color: "#475467",
    fontSize: 10,
    fontWeight: "800",
  },

  imageContainer: {
    position: "relative",
    minHeight: 240,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },

  productImage: {
    width: "100%",
    height: 260,
    backgroundColor: "#F8FAFC",
  },

  cacheBadge: {
    display: "none",
  },

  cacheBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  imagePlaceholder: {
    minHeight: 240,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderStyle: "dashed",
  },

  imagePlaceholderIcon: {
    fontSize: 36,
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

  statusCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    ...Platform.select({
      web: {
        boxShadow: "0 8px 24px rgba(16, 24, 40, 0.05)",
      },
      default: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 1,
      },
    }),
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
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#FEE4E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },

  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  editBadgeText: {
    color: "#027A48",
    fontSize: 11,
    fontWeight: "900",
  },

  formGrid: {
    flexDirection: "row",
    gap: 12,
  },

  formGridItem: {
    flex: 1,
    minWidth: 0,
  },

  field: {
    marginTop: 14,
  },

  label: {
    color: "#344054",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    minHeight: 50,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: "#101828",
    fontSize: 15,
    outlineStyle: Platform.OS === "web" ? "none" : undefined,
  },

  multilineInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },

  primaryButton: {
    minHeight: 54,
    backgroundColor: "#101828",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },

  primaryButtonPressed: {
    backgroundColor: "#1D2939",
    transform: [{ scale: 0.995 }],
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryButton: {
    minHeight: 58,
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },

  secondaryButtonPressed: {
    backgroundColor: "#DBEAFE",
    transform: [{ scale: 0.995 }],
  },

  buttonTextBlock: {
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "900",
  },

  secondaryButtonHint: {
    color: "#5B76A8",
    fontSize: 10,
    marginTop: 2,
  },

  dangerZone: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECDCA",
    borderRadius: 16,
    backgroundColor: "#FFF9F8",
  },

  dangerZoneHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  dangerZoneText: {
    flex: 1,
  },

  dangerZoneTitle: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "900",
  },

  dangerZoneDescription: {
    color: "#B5473C",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  deleteButton: {
    minHeight: 44,
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDA29B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
  },

  deleteButtonStandalone: {
    marginTop: 14,
  },

  deleteButtonPressed: {
    backgroundColor: "#FEF3F2",
  },

  deleteButtonText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "900",
  },

  cancelButton: {
    minHeight: 46,
    marginTop: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  cancelButtonPressed: {
    backgroundColor: "#F2F4F7",
  },

  cancelButtonText: {
    color: "#475467",
    fontSize: 14,
    fontWeight: "800",
  },

  externalAction: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },

  externalActionPressed: {
    backgroundColor: "#F8FAFC",
    borderColor: "#98A2B3",
  },

  externalActionPrimary: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },

  externalActionPrimaryPressed: {
    backgroundColor: "#1D4ED8",
  },

  googleIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  googleIconText: {
    color: "#4285F4",
    fontSize: 22,
    fontWeight: "900",
  },

  shoppingIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  externalActionContent: {
    flex: 1,
    minWidth: 0,
  },

  externalActionTitle: {
    color: "#101828",
    fontSize: 14,
    fontWeight: "900",
  },

  externalActionTitleLight: {
    color: "#FFFFFF",
  },

  externalActionDescription: {
    color: "#667085",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  externalActionDescriptionLight: {
    color: "#DBEAFE",
  },

  disabledButton: {
    opacity: 0.5,
  },

  footerNote: {
    color: "#667085",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 14,
  },

  productHeader: {
    width: "100%",
    gap: 14,
    marginBottom: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#101828",
    ...Platform.select({
      web: {
        boxShadow: "0 18px 50px rgba(16, 24, 40, 0.16)",
      },
      default: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 22,
        elevation: 5,
      },
    }),
  },

  productHeaderTopRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  productHeaderIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  productIconContainer: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#1D2939",
  },

  productHeaderLabel: {
    flexShrink: 1,
    color: "#A5B0C4",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  productLocatedBadge: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#202C42",
  },

  productLocatedDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#39D98A",
  },

  productLocatedDotWarning: {
    backgroundColor: "#FDB022",
  },

  productLocatedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  productName: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
  },

  productBarcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "#1D2939",
  },

  productBarcodeRowPressed: {
    opacity: 0.82,
  },

  productBarcodeContent: {
    flex: 1,
    minWidth: 0,
  },

  productBarcodeLabel: {
    marginBottom: 3,
    color: "#98A2B3",
    fontSize: 11,
    fontWeight: "800",
  },

  productBarcodeValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  productBarcodeTypeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#344054",
  },

  productBarcodeTypeText: {
    color: "#D0D5DD",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
});

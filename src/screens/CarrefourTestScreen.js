import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";

import CachedProductImage from "@/src/components/products/CachedProductImage";
import {
  prefetchProductImages,
  clearProductImageCache,
} from "@/src/utils/productImageCache";

import {
  searchCarrefourProducts,
  validateCarrefourProducts,
} from "@/src/data/seedCarrefourProducts";

export default function CarrefourTestScreen() {
  const [query, setQuery] = useState("");
  const [cacheStatus, setCacheStatus] = useState("");

  const validation = useMemo(() => {
    return validateCarrefourProducts();
  }, []);

  const products = useMemo(() => {
    return searchCarrefourProducts(query);
  }, [query]);

  const allProducts = useMemo(() => {
    return searchCarrefourProducts("");
  }, []);

  const handlePrefetchImages = async () => {
    setCacheStatus("Descargando imágenes...");

    const result = await prefetchProductImages(allProducts);

    if (result.ok) {
      setCacheStatus(
        `Caché: ${result.downloaded} descargadas · ${result.skipped} omitidas`,
      );
      return;
    }

    setCacheStatus(
      `Caché con errores: ${result.downloaded} descargadas · ${result.skipped} omitidas · ${result.errors.length} errores`,
    );
  };

  const handleClearImageCache = async () => {
    const ok = await clearProductImageCache();

    setCacheStatus(
      ok ? "Caché de imágenes borrada" : "No se pudo borrar la caché",
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo Carrefour</Text>

      <Text style={styles.summary}>
        Total: {validation.total} · Con EAN: {validation.withEAN} · Con imagen:{" "}
        {validation.withImage}
      </Text>

      <View style={styles.cacheActions}>
        <Pressable style={styles.cacheButton} onPress={handlePrefetchImages}>
          <Text style={styles.cacheButtonText}>Cachear imágenes</Text>
        </Pressable>

        <Pressable
          style={styles.cacheButtonSecondary}
          onPress={handleClearImageCache}
        >
          <Text style={styles.cacheButtonSecondaryText}>Borrar caché</Text>
        </Pressable>
      </View>

      {cacheStatus ? (
        <Text style={styles.cacheStatus}>{cacheStatus}</Text>
      ) : null}

      {!validation.ok && (
        <View style={styles.errorBox}>
          {validation.errors.map((error) => (
            <Text key={error} style={styles.errorText}>
              {error}
            </Text>
          ))}
        </View>
      )}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre, marca, categoría o EAN"
        style={styles.input}
      />

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <CachedProductImage
              product={item}
              imageUrl={item.image}
              size={72}
              style={styles.image}
            />

            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.nombre}</Text>

              <Text style={styles.meta}>{item.marca}</Text>

              <Text style={styles.meta}>
                {item.categoria} · {item.subcategoria}
              </Text>

              <Text style={styles.ean}>EAN: {item.ean || "No verificado"}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No se encontraron productos.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f4f5f7",
  },

  title: {
    marginBottom: 6,
    fontSize: 22,
    fontWeight: "800",
  },

  summary: {
    marginBottom: 12,
    color: "#555",
    fontSize: 13,
  },

  cacheActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },

  cacheButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#2563eb",
    borderRadius: 10,
  },

  cacheButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  cacheButtonSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
  },

  cacheButtonSecondaryText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
  },

  cacheStatus: {
    marginBottom: 10,
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "600",
  },

  input: {
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
  },

  listContent: {
    paddingBottom: 120,
  },

  card: {
    flexDirection: "row",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
  },

  image: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#f1f1f1",
  },

  cardBody: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    marginBottom: 4,
    fontSize: 15,
    fontWeight: "700",
  },

  meta: {
    marginBottom: 2,
    color: "#666",
    fontSize: 12,
  },

  ean: {
    marginTop: 4,
    color: "#333",
    fontSize: 12,
  },

  errorBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#fff1f1",
    borderWidth: 1,
    borderColor: "#ffcccc",
    borderRadius: 10,
  },

  errorText: {
    color: "#a40000",
    fontSize: 12,
  },

  empty: {
    marginTop: 24,
    color: "#777",
    textAlign: "center",
  },
});

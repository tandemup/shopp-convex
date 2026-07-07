// src/components/products/CachedProductImage.js

import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { getCachedProductImageUri } from "@/src/utils/productImageCache";

export default function CachedProductImage({
  product,
  imageUrl,
  size = 72,
  style,
}) {
  const [resolvedUri, setResolvedUri] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveImage() {
      setFailed(false);
      setResolvedUri(null);

      const uri = await getCachedProductImageUri(product, imageUrl);

      if (!cancelled) {
        setResolvedUri(uri);
      }
    }

    resolveImage();

    return () => {
      cancelled = true;
    };
  }, [product?.id, product?.ean, product?.barcode, imageUrl]);

  if (!resolvedUri || failed) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.14),
          },
          style,
        ]}
      >
        <Text style={styles.placeholderText}>Sin imagen</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.14),
        },
        style,
      ]}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#f3f4f6",
  },

  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },

  placeholderText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});

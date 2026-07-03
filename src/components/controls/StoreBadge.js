import React from "react";

import StoreLink from "./StoreLink";
import StorePill from "./StorePill";

/**
 * StoreBadge
 *
 * Componente configurable para mostrar una tienda como:
 * - "pill": píldora/badge compacto, ideal para cards y filtros.
 * - "link": enlace textual, ideal para historial o textos secundarios.
 * - "auto": usa StorePill si recibe onPressStore; si no, usa StoreLink.
 */
export default function StoreBadge({
  store,

  variant = "auto", // "auto" | "pill" | "link"

  // StorePill
  onPressStore,

  // StoreLink
  onPress,
  labelPrefix = "",
  queryPrefix = "",
  iconName = "storefront-outline",
  iconColor = "#2563EB",
  textColor = "#2563EB",
  numberOfLines = 1,

  // Shared/custom styles
  style,
  textStyle,
}) {
  const resolvedVariant =
    variant === "auto" ? (onPressStore ? "pill" : "link") : variant;

  if (resolvedVariant === "pill") {
    return <StorePill store={store} onPressStore={onPressStore} />;
  }

  return (
    <StoreLink
      store={store}
      labelPrefix={labelPrefix}
      queryPrefix={queryPrefix}
      iconName={iconName}
      iconColor={iconColor}
      textColor={textColor}
      onPress={onPress}
      numberOfLines={numberOfLines}
      style={style}
      textStyle={textStyle}
    />
  );
}

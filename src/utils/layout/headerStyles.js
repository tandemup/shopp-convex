// utils/layout/headerStyles.js

import { Platform } from "react-native";

export const HEADER_PRESETS = {
  light: {
    background: "#FFF1D6",
    text: "#111827",
    statusBarStyle: "dark",
  },

  blue: {
    background: "#2563EB",
    text: "#FFFFFF",
    statusBarStyle: "light",
  },

  dark: {
    background: "#111827",
    text: "#FFFFFF",
    statusBarStyle: "light",
  },
};

export function buildHeaderConfig({
  title = "",
  preset = "light",
  backgroundColor,
  textColor,
  largeTitle = false,
} = {}) {
  const theme = HEADER_PRESETS[preset];

  const headerBackground = backgroundColor ?? theme.background;

  const headerTextColor = textColor ?? theme.text;

  return {
    statusBar: {
      style: theme.statusBarStyle,
      translucent: false,
      backgroundColor: Platform.OS === "android" ? headerBackground : undefined,
    },

    navigationOptions: {
      title,

      headerTitleAlign: "center",

      headerLargeTitle: largeTitle,

      headerShadowVisible: true,

      headerStyle: {
        backgroundColor: headerBackground,
      },

      headerTintColor: headerTextColor,

      headerTitleStyle: {
        color: headerTextColor,
        fontWeight: "800",
        fontSize: 20,
      },
    },

    colors: {
      background: headerBackground,
      text: headerTextColor,
    },
  };
}

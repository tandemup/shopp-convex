// utils/layout/getScreenContainerStyles.js

export const SCREEN_COLORS = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
};

export function getScreenContainerStyles({
  backgroundColor = SCREEN_COLORS.background,
  paddingHorizontal = 20,
  paddingTop = 24,
} = {}) {
  return {
    screen: {
      flex: 1,
      backgroundColor,
    },

    safeArea: {
      flex: 1,
    },

    content: {
      flex: 1,
      paddingHorizontal,
      paddingTop,
    },
  };
}

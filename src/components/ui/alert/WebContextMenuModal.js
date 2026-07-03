import React from "react";

import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function getActionColors(style) {
  switch (style) {
    case "destructive":
      return {
        backgroundColor: "rgba(209, 213, 219, 0.72)",
        pressedBackgroundColor: "rgba(209, 213, 219, 0.95)",
        textColor: "#DC2626",
        badgeBackgroundColor: "#DC2626",
      };

    case "cancel":
      return {
        backgroundColor: "rgba(209, 213, 219, 0.72)",
        pressedBackgroundColor: "rgba(209, 213, 219, 0.95)",
        textColor: "#111827",
        badgeBackgroundColor: "#6B7280",
      };

    case "default":
    default:
      return {
        backgroundColor: "rgba(209, 213, 219, 0.72)",
        pressedBackgroundColor: "rgba(209, 213, 219, 0.95)",
        textColor: "#111827",
        badgeBackgroundColor: "#6D28D9",
      };
  }
}

export default function WebContextMenuModal({ dialog, onSelect, onClose }) {
  if (!dialog) {
    return null;
  }

  const buttons = Array.isArray(dialog.buttons) ? dialog.buttons : [];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Cerrar menú"
        />

        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityRole="dialog"
        >
          {!!dialog.title && <Text style={styles.title}>{dialog.title}</Text>}

          {!!dialog.message && (
            <Text style={styles.message}>{dialog.message}</Text>
          )}

          <View style={styles.actions}>
            {buttons.map((button, index) => {
              const actionColors = getActionColors(button.style);

              const hasDescription =
                typeof button.description === "string" &&
                button.description.trim().length > 0;

              const hasBadge =
                button.badge !== undefined &&
                button.badge !== null &&
                button.badge !== "";

              return (
                <Pressable
                  key={button.key ?? button.text ?? String(index)}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                  accessibilityHint={
                    hasDescription ? button.description : undefined
                  }
                  accessibilityState={{
                    disabled: button.disabled === true,
                  }}
                  disabled={button.disabled}
                  onPress={() => {
                    onSelect(index);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,

                    {
                      backgroundColor: pressed
                        ? actionColors.pressedBackgroundColor
                        : actionColors.backgroundColor,
                    },

                    pressed && !button.disabled && styles.actionButtonPressed,

                    button.disabled && styles.actionButtonDisabled,
                  ]}
                >
                  <View style={styles.content}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.actionText,
                        {
                          color: actionColors.textColor,
                        },
                      ]}
                    >
                      {button.text}
                    </Text>

                    {hasDescription && (
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.description,
                          {
                            color: actionColors.textColor,
                          },
                        ]}
                      >
                        {button.description}
                      </Text>
                    )}
                  </View>

                  {hasBadge && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: actionColors.badgeBackgroundColor,
                        },
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.badgeText}>
                        {String(button.badge)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,

    backgroundColor: "rgba(15, 23, 42, 0.18)",

    justifyContent: "center",
    alignItems: "center",

    paddingHorizontal: 32,
    paddingVertical: 24,
  },

  sheet: {
    width: "100%",
    maxWidth: 320,

    backgroundColor: "rgba(250, 250, 250, 0.96)",

    borderRadius: 24,

    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,

    borderWidth: Platform.OS === "web" ? StyleSheet.hairlineWidth : 0,

    borderColor: "rgba(255, 255, 255, 0.8)",

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.18,
    shadowRadius: 20,

    elevation: 12,
  },

  title: {
    paddingHorizontal: 8,

    marginBottom: 4,

    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",

    color: "#111827",

    textAlign: "center",
  },

  message: {
    paddingHorizontal: 8,

    marginBottom: 12,

    fontSize: 14,
    lineHeight: 20,

    color: "#6B7280",

    textAlign: "center",
  },

  actions: {
    width: "100%",
  },

  actionButton: {
    width: "100%",
    minHeight: 46,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 14,
    paddingVertical: 9,

    marginBottom: 8,

    borderRadius: 999,
  },

  actionButtonPressed: {
    opacity: 0.78,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  actionButtonDisabled: {
    opacity: 0.4,
  },

  content: {
    flex: 1,
    minWidth: 0,

    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",

    textAlign: "center",
  },

  description: {
    marginTop: 2,

    fontSize: 12,
    lineHeight: 16,

    opacity: 0.72,

    textAlign: "center",
  },

  badge: {
    minWidth: 24,
    minHeight: 22,
    maxWidth: 80,

    borderRadius: 999,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 7,
    paddingVertical: 3,

    marginLeft: 8,
  },

  badgeText: {
    color: "#FFFFFF",

    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",

    textTransform: "uppercase",
  },
});

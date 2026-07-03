// components/ui/alert/WebAlertModal.js

import React from "react";

import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function WebAlertModal({ dialog, onSelect, onClose }) {
  if (!dialog) {
    return null;
  }

  const buttons =
    Array.isArray(dialog.buttons) && dialog.buttons.length > 0
      ? dialog.buttons
      : [
          {
            key: "accept",
            text: "Aceptar",
            style: "default",
          },
        ];

  const isQuestion = dialog.type === "question";

  return (
    <Modal
      visible={dialog.visible !== false}
      transparent
      statusBarTranslucent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {isQuestion ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Cerrar diálogo"
          />
        ) : null}

        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={styles.dialog}
        >
          <View style={styles.content}>
            {dialog.title ? (
              <Text style={styles.title}>{dialog.title}</Text>
            ) : null}

            {dialog.message ? (
              <Text style={styles.message}>{dialog.message}</Text>
            ) : null}

            {dialog.detail ? (
              <Text style={styles.detail}>{dialog.detail}</Text>
            ) : null}
          </View>

          <View
            style={[
              styles.actions,

              buttons.length === 1 && styles.singleAction,
            ]}
          >
            {buttons.map((button, index) => {
              const isDestructive = button.style === "destructive";

              const isCancel = button.style === "cancel";

              return (
                <Pressable
                  key={button.key ?? button.text ?? String(index)}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                  accessibilityState={{
                    disabled: button.disabled === true,
                  }}
                  disabled={button.disabled === true}
                  onPress={() => onSelect(index)}
                  style={({ pressed }) => [
                    styles.actionButton,

                    buttons.length === 1 && styles.singleButton,

                    isCancel && styles.cancelButton,

                    isDestructive && styles.destructiveButton,

                    pressed && styles.pressedButton,

                    button.disabled === true && styles.disabledButton,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[
                      styles.actionText,

                      isCancel && styles.cancelText,

                      isDestructive && styles.destructiveText,
                    ]}
                  >
                    {button.text}
                  </Text>
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

    justifyContent: "center",
    alignItems: "center",

    paddingHorizontal: 20,
    paddingVertical: 24,

    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },

  dialog: {
    width: "100%",
    maxWidth: 430,

    overflow: "hidden",

    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D6DAE1",
    borderRadius: 18,

    backgroundColor: "#FFFFFF",

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.18,
    shadowRadius: 24,

    elevation: 12,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
  },

  title: {
    marginBottom: 10,

    color: "#111827",

    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",

    textAlign: "left",
  },

  message: {
    color: "#374151",

    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",

    textAlign: "left",
  },

  detail: {
    marginTop: 10,

    color: "#6B7280",

    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",

    textAlign: "left",
  },

  actions: {
    flexDirection: "row",
    alignItems: "stretch",

    gap: 8,

    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,

    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",

    backgroundColor: "#F9FAFB",
  },

  singleAction: {
    justifyContent: "flex-end",
  },

  actionButton: {
    flex: 1,

    minWidth: 0,
    minHeight: 44,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 10,
    paddingVertical: 10,

    borderWidth: 3,
    borderColor: "#D1D5DB",
    borderRadius: 12,

    backgroundColor: "#FFFFFF",
  },

  singleButton: {
    flex: 0,
    minWidth: 110,
  },

  cancelButton: {
    borderColor: "#CBD5E1",

    backgroundColor: "#F1F5F9",
  },

  destructiveButton: {
    borderColor: "#FCA5A5",

    backgroundColor: "#FFFFFF",
  },

  pressedButton: {
    opacity: Platform.OS === "web" ? 0.75 : 0.68,
  },

  disabledButton: {
    opacity: 0.45,
  },

  actionText: {
    color: "#1F2937",

    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",

    textAlign: "center",
  },

  cancelText: {
    color: "#475569",
  },

  destructiveText: {
    color: "#DC2626",
  },
});

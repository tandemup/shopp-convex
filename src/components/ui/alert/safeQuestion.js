// components/ui/alert/safeQuestion.js

import { safeAlert } from "./safeAlert";

function normalizeStyle(action) {
  if (action === "destructive") {
    return "destructive";
  }

  if (action === "cancel") {
    return "cancel";
  }

  return "default";
}

/**
 * Muestra una pregunta con tres respuestas:
 *
 * - Sí
 * - No
 * - Cancelar
 *
 * El mismo modal personalizado se utiliza en:
 *
 * - Web
 * - iOS
 * - Android
 */
export function safeQuestion({
  title = "Confirmar",
  message = "",
  detail = "",

  yesText = "Sí",
  noText = "No",
  cancelText = "Cancelar",

  onYes,
  onNo,
  onCancel,

  yesAction = "default",
  noAction = "default",
  cancelAction = "cancel",
} = {}) {
  const completeMessage = [message, detail]
    .filter((value) => {
      return typeof value === "string" && value.trim().length > 0;
    })
    .join("\n\n");

  safeAlert(title, completeMessage, [
    {
      key: "yes",
      text: yesText,
      style: normalizeStyle(yesAction),
      onPress: onYes,
    },
    {
      key: "no",
      text: noText,
      style: normalizeStyle(noAction),
      onPress: onNo,
    },
    {
      key: "cancel",
      text: cancelText,
      style: normalizeStyle(cancelAction),
      onPress: onCancel,
    },
  ]);
}

export default safeQuestion;

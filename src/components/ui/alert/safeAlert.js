import { Alert, Platform } from "react-native";

let dialogListener = null;

/**
 * Registra el host encargado de mostrar los diálogos personalizados.
 *
 * Debe existir una única instancia de DialogHost en la aplicación.
 */
export function registerWebDialogListener(listener) {
  dialogListener = typeof listener === "function" ? listener : null;

  return () => {
    if (dialogListener === listener) {
      dialogListener = null;
    }
  };
}

function normalizeButton(button, index) {
  if (!button) {
    return null;
  }

  return {
    key: button.key ?? `dialog-button-${index}`,

    text: button.text ?? button.label ?? "",

    style:
      button.style === "cancel" || button.style === "destructive"
        ? button.style
        : "default",

    description:
      typeof button.description === "string" ? button.description : "",

    badge: button.badge,

    disabled: button.disabled === true,

    onPress: typeof button.onPress === "function" ? button.onPress : undefined,
  };
}

export function normalizeButtons(buttons = []) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  return buttons.map(normalizeButton).filter(Boolean);
}

function emitDialog(payload) {
  if (typeof dialogListener !== "function") {
    return false;
  }

  dialogListener(payload);

  return true;
}

function buildFallbackText(title, message) {
  return [title, message].filter(Boolean).join("\n\n");
}

function runButton(button) {
  if (!button || button.disabled) {
    return;
  }

  button.onPress?.();
}

function safeMenuWebFallback(title, message, buttons) {
  if (typeof window === "undefined") {
    console.warn("safeMenu: window no está disponible.");

    return;
  }

  const selectableButtons = buttons.filter((button) => !button.disabled);

  if (selectableButtons.length === 0) {
    window.alert(buildFallbackText(title, message));

    return;
  }

  const optionsText = selectableButtons
    .map((button, index) => {
      const description = button.description ? ` — ${button.description}` : "";

      return `${index + 1}. ${
        button.text || `Opción ${index + 1}`
      }${description}`;
    })
    .join("\n");

  const answer = window.prompt(
    [title, message, optionsText, "Introduce el número de la opción:"]
      .filter(Boolean)
      .join("\n\n"),
    "1",
  );

  if (answer === null) {
    const cancelButton = buttons.find((button) => button.style === "cancel");

    runButton(cancelButton);

    return;
  }

  const selectedIndex = Number.parseInt(answer, 10) - 1;

  const selectedButton = selectableButtons[selectedIndex];

  runButton(selectedButton);
}

function safeAlertWebFallback(title, message, buttons) {
  if (typeof window === "undefined") {
    console.warn("safeAlert: window no está disponible.");

    return;
  }

  const text = buildFallbackText(title, message);

  if (buttons.length === 0) {
    window.alert(text);

    return;
  }

  if (buttons.length === 1) {
    window.alert(text);

    runButton(buttons[0]);

    return;
  }

  if (buttons.length === 2) {
    const cancelButton =
      buttons.find((button) => button.style === "cancel") ?? buttons[0];

    const confirmButton =
      buttons.find((button) => button !== cancelButton) ?? buttons[1];

    const accepted = window.confirm(text);

    if (accepted) {
      runButton(confirmButton);
    } else {
      runButton(cancelButton);
    }

    return;
  }

  safeMenuWebFallback(title, message, buttons);
}

function ShowNativeFallback(title, message, buttons) {
  if (buttons.length === 0) {
    Alert.alert(title ?? "", message ?? "");

    return;
  }

  const nativeButtons = buttons.map((button) => ({
    text: button.text,

    style: button.style,

    onPress: button.disabled ? undefined : button.onPress,
  }));

  Alert.alert(title ?? "", message ?? "", nativeButtons);
}

/**
 * Muestra una alerta con la misma interfaz en iOS, Android y Web.
 */
export function safeAlert(title, message, buttons = []) {
  const normalizedButtons = normalizeButtons(buttons);

  const finalButtons =
    normalizedButtons.length > 0
      ? normalizedButtons
      : [
          {
            key: "accept",
            text: "Aceptar",
            style: "default",
          },
        ];

  const handled = emitDialog({
    visible: true,

    type: "alert",

    title: title ?? "",

    message: message ?? "",

    buttons: finalButtons,
  });

  if (handled) {
    return;
  }

  if (Platform.OS === "web") {
    safeAlertWebFallback(title, message, normalizedButtons);

    return;
  }

  ShowNativeFallback(title, message, normalizedButtons);
}

/**
 * Muestra una confirmación.
 */
export function SafeConfirm(title, message, onConfirm, options = {}) {
  const {
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    destructive = false,
    onCancel,
  } = options;

  safeAlert(title, message, [
    {
      key: "cancel",
      text: cancelText,
      style: "cancel",
      onPress: onCancel,
    },
    {
      key: "confirm",
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

/**
 * Muestra un menú de opciones con la misma interfaz en iOS, Android y Web.
 */
export function safeMenu(title, message, buttons = []) {
  const normalizedButtons = normalizeButtons(buttons);

  if (normalizedButtons.length === 0) {
    safeAlert(title, message || "No hay opciones disponibles.");

    return;
  }

  const handled = emitDialog({
    visible: true,

    type: "menu",

    title: title ?? "",

    message: message ?? "",

    buttons: normalizedButtons,
  });

  if (handled) {
    return;
  }

  if (Platform.OS === "web") {
    safeMenuWebFallback(title, message, normalizedButtons);

    return;
  }

  ShowNativeFallback(title, message, normalizedButtons);
}

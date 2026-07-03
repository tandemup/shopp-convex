import React, { useCallback, useEffect, useState } from "react";

import AlertModal from "./WebAlertModal";
import ContextMenuModal from "./WebContextMenuModal";

import { registerWebDialogListener } from "./safeAlert";

function runAfterDialogClose(callback) {
  if (typeof callback !== "function") {
    return;
  }

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);

    return;
  }

  setTimeout(callback, 0);
}

/**
 * Host único de alertas, preguntas y menús
 * para iOS, Android y Web.
 *
 * Los componentes mantienen sus nombres históricos Web*
 * por compatibilidad, pero utilizan primitivas de React Native.
 */
export default function DialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const unregister = registerWebDialogListener(setDialog);

    return unregister;
  }, []);

  const closeWithoutAction = useCallback(() => {
    setDialog(null);
  }, []);

  const handleClose = useCallback(() => {
    const cancelButton = dialog?.buttons?.find((button) => {
      return button?.style === "cancel" && button?.disabled !== true;
    });

    setDialog(null);

    runAfterDialogClose(cancelButton?.onPress);
  }, [dialog]);

  const handleSelect = useCallback(
    (index) => {
      const button = dialog?.buttons?.[index];

      if (!button || button.disabled) {
        return;
      }

      setDialog(null);

      runAfterDialogClose(button.onPress);
    },
    [dialog],
  );

  if (!dialog) {
    return null;
  }

  if (dialog.type === "menu") {
    return (
      <ContextMenuModal
        dialog={dialog}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );
  }

  return (
    <AlertModal
      dialog={dialog}
      onClose={
        dialog.type === "alert" &&
        !dialog.buttons?.some((button) => button.style === "cancel")
          ? closeWithoutAction
          : handleClose
      }
      onSelect={handleSelect}
    />
  );
}

import React, { useCallback, useEffect, useState } from "react";

import WebAlertModal from "./WebAlertModal";
import { registerWebDialogListener } from "./safeAlert";

export default function DialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const unregister = registerWebDialogListener((nextDialog) => {
      setDialog(nextDialog);
    });

    return unregister;
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const handleSelect = useCallback(
    async (index) => {
      const selectedButton = dialog?.buttons?.[index];

      if (!selectedButton || selectedButton.disabled) {
        return;
      }

      setDialog(null);

      try {
        await selectedButton.onPress?.();
      } catch (error) {
        console.error("[DialogHost] button onPress error:", error);
      }
    },
    [dialog],
  );

  if (!dialog) {
    return null;
  }

  return (
    <WebAlertModal
      dialog={dialog}
      onSelect={handleSelect}
      onClose={closeDialog}
    />
  );
}

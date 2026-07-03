// screens/scanner/ScannerLibraryTestScreen.web.js

import React from "react";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import TestReactBarcodeScannerWeb from "@/src/components/features/scanner/TestReactBarcodeScanner.web";

export default function ScannerLibraryTestScreen({ navigation }) {
  return (
    <TestReactBarcodeScannerWeb
      onDetected={(code) => {
        console.log("EAN-13 detectado:", code);
        safeAlert("Código detectado", code);
      }}
      onClose={() => navigation?.goBack?.()}
    />
  );
}

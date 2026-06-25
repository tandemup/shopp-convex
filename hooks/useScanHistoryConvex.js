import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const DEFAULT_USERNAME = "anonymous";

export function useScanHistoryConvex(username = DEFAULT_USERNAME) {
  const scanHistory = useQuery(api.scanHistory.listScanHistory, {
    username,
    limit: 100,
  });

  const addScanMutation = useMutation(api.scanHistory.addScan);
  const deleteScanMutation = useMutation(api.scanHistory.deleteScan);
  const clearScanHistoryMutation = useMutation(
    api.scanHistory.clearScanHistory,
  );

  const loading = scanHistory === undefined;

  const addScan = async ({
    barcode,
    format = "EAN_13",
    name,
    source,
    deviceId,
    storeId,
    storeName,
  }) => {
    if (!barcode) return null;

    return await addScanMutation({
      barcode,
      format,
      name,
      source,
      username,
      deviceId,
      storeId,
      storeName,
    });
  };

  const deleteScan = async (scanId) => {
    if (!scanId) return null;

    return await deleteScanMutation({
      scanId,
    });
  };

  const clearScanHistory = async () => {
    return await clearScanHistoryMutation({
      username,
    });
  };

  return {
    scanHistory: scanHistory || [],
    loading,
    addScan,
    deleteScan,
    clearScanHistory,
  };
}

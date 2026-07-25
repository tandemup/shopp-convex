import { File } from "expo-file-system";

export async function uploadFileToConvex({
  asset,
  generateUploadUrl,
  fallbackMimeType,
}) {
  if (!asset) {
    throw new Error("No se ha seleccionado ningún archivo.");
  }

  const uploadUrl = await generateUploadUrl();
  const body = asset.file || new File(asset.uri);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": asset.mimeType || fallbackMimeType,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Convex rechazó la subida de ${asset.name || "un archivo"} (${response.status}).`,
    );
  }

  const result = await response.json();

  if (!result?.storageId) {
    throw new Error("Convex no devolvió el storageId.");
  }

  return result.storageId;
}

export function titleFromFilename(filename) {
  return String(filename || "Pista sin título")
    .replace(/\.[^.]+$/, "")
    .trim();
}

export function sortFilesNaturally(files) {
  return [...files].sort((a, b) =>
    String(a.name || "").localeCompare(
      String(b.name || ""),
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );
}

import * as DocumentPicker from "expo-document-picker";
import { api } from "@/convex/_generated/api";

export async function selectMusicFile(type) {
  const result = await DocumentPicker.getDocumentAsync({
    type,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

export async function uploadFileToConvex({ convex, uri, mimeType }) {
  const uploadUrl = await convex.mutation(api.music.generateUploadUrl, {});

  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error("No se pudo subir el archivo a Convex");
  }

  const result = await response.json();

  return result.storageId;
}

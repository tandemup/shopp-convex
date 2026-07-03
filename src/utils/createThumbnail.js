import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

export async function createThumbnail(imageUrl, id) {
  try {
    const tmpUri = FileSystem.cacheDirectory + `img_${id}.jpg`;
    const finalUri = FileSystem.documentDirectory + `thumb_${id}.jpg`;

    // 1️⃣ Descargar imagen
    const download = await FileSystem.downloadAsync(imageUrl, tmpUri);

    // 2️⃣ Redimensionar
    const resized = await ImageManipulator.manipulateAsync(
      download.uri,
      [{ resize: { width: 64, height: 64 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
    );

    // 3️⃣ Borrar thumbnail previo si existe
    const exists = await FileSystem.getInfoAsync(finalUri);
    if (exists.exists) {
      await FileSystem.deleteAsync(finalUri, { idempotent: true });
    }

    // 4️⃣ Guardar thumbnail definitivo
    await FileSystem.moveAsync({
      from: resized.uri,
      to: finalUri,
    });

    return finalUri;
  } catch (e) {
    console.warn("❌ Error creando thumbnail:", e);
    return null;
  }
}

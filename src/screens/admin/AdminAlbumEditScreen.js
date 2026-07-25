import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

async function uploadAsset(asset, generateUploadUrl, fallbackType) {
  const uploadUrl = await generateUploadUrl();
  const source = await fetch(asset.uri);
  const blob = await source.blob();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": asset.mimeType || fallbackType },
    body: blob,
  });
  if (!response.ok) throw new Error(`No se pudo subir ${asset.name}.`);
  return (await response.json()).storageId;
}

export default function AdminAlbumEditScreen({ route }) {
  const { albumId } = route.params;
  const album = useQuery(api.musicAlbums.getForAdmin, { albumId });
  const updateAlbum = useMutation(api.musicAlbums.update);
  const setCover = useMutation(api.musicAlbums.setCover);
  const setStatus = useMutation(api.musicAlbums.setStatus);
  const publish = useMutation(api.musicAlbums.publish);
  const updateTrack = useMutation(api.musicTracks.update);
  const replaceAudio = useMutation(api.musicTracks.replaceAudio);
  const removeTrack = useMutation(api.musicTracks.remove);
  const generateUploadUrl = useMutation(api.musicStorage.generateUploadUrl);

  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (album && !form) {
      setForm({
        title: album.title || "",
        artist: album.artist || "",
        genre: album.genre || "",
        year: album.year ? String(album.year) : "",
        description: album.description || "",
        expectedTrackCount: String(album.expectedTrackCount || 0),
      });
    }
  }, [album, form]);

  if (album === undefined || !form) return <View style={styles.centered}><ActivityIndicator /></View>;
  if (album === null) return <View style={styles.centered}><Text>Álbum no encontrado.</Text></View>;

  const makeEditable = async () => {
    if (album.status === "published") {
      await setStatus({ albumId, status: "hidden" });
    }
  };

  const save = async () => {
    try {
      setError("");
      await updateAlbum({
        albumId,
        title: form.title,
        artist: form.artist,
        genre: form.genre,
        year: form.year ? Number(form.year) : undefined,
        description: form.description,
        expectedTrackCount: Number(form.expectedTrackCount),
      });
      setMessage("Datos guardados.");
    } catch (e) {
      setError(e?.message || "No se pudo guardar.");
    }
  };

  const changeCover = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      await makeEditable();
      const asset = result.assets[0];
      const storageId = await uploadAsset(asset, generateUploadUrl, "image/jpeg");
      await setCover({
        albumId,
        coverStorageId: storageId,
        coverFilename: asset.name,
        coverMimeType: asset.mimeType || "image/jpeg",
      });
    } catch (e) {
      setError(e?.message || "No se pudo cambiar la carátula.");
    }
  };

  const changeAudio = async (track) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/mp3"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      await makeEditable();
      const asset = result.assets[0];
      const storageId = await uploadAsset(asset, generateUploadUrl, "audio/mpeg");
      await replaceAudio({
        trackId: track._id,
        audioStorageId: storageId,
        filename: asset.name,
        mimeType: asset.mimeType || "audio/mpeg",
        sizeBytes: typeof asset.size === "number" ? asset.size : undefined,
      });
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el MP3.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Editar álbum</Text>
      <View style={styles.card}>
        {album.coverUrl ? <Image source={{ uri: album.coverUrl }} style={styles.cover} /> : null}
        <Pressable style={styles.secondary} onPress={changeCover}><Text style={styles.secondaryText}>Cambiar carátula</Text></Pressable>
      </View>

      <View style={styles.card}>
        {Object.entries({
          title: "Título",
          artist: "Artista",
          genre: "Género",
          year: "Año",
          expectedTrackCount: "Número esperado de pistas",
        }).map(([name, label]) => (
          <View key={name}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={form[name]}
              onChangeText={(value) => setForm((current) => ({ ...current, [name]: value }))}
              keyboardType={name === "year" || name === "expectedTrackCount" ? "number-pad" : "default"}
              style={styles.input}
            />
          </View>
        ))}
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={form.description}
          onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
          multiline
          style={[styles.input, styles.textarea]}
        />
        <Pressable style={styles.primary} onPress={save}><Text style={styles.primaryText}>Guardar datos</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Pistas</Text>
        {album.tracks.map((track) => (
          <View key={String(track._id)} style={styles.track}>
            <Text style={styles.number}>{String(track.trackNumber).padStart(2, "0")}</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                defaultValue={track.title}
                onEndEditing={async (event) => {
                  await makeEditable();
                  await updateTrack({ trackId: track._id, title: event.nativeEvent.text });
                }}
                style={styles.trackInput}
              />
              <Text style={styles.filename} numberOfLines={1}>{track.filename}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.small} onPress={() => changeAudio(track)}><Text style={styles.smallText}>Cambiar MP3</Text></Pressable>
                <Pressable
                  style={[styles.small, styles.delete]}
                  onPress={async () => { await makeEditable(); await removeTrack({ trackId: track._id }); }}
                ><Text style={styles.deleteText}>Eliminar</Text></Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.status}>Estado: <Text style={{ fontWeight: "900" }}>{album.status}</Text></Text>
        {album.status === "published" ? (
          <Pressable style={styles.secondary} onPress={() => setStatus({ albumId, status: "hidden" })}><Text style={styles.secondaryText}>Ocultar para editar</Text></Pressable>
        ) : (
          <Pressable style={styles.primary} onPress={() => publish({ albumId })}><Text style={styles.primaryText}>Publicar álbum</Text></Pressable>
        )}
      </View>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 16, paddingBottom: 50 },
  heading: { marginBottom: 16, color: "#0f172a", fontSize: 28, fontWeight: "900" },
  card: { marginBottom: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  cover: { width: 150, height: 150, alignSelf: "center", marginBottom: 12, borderRadius: 13 },
  label: { marginBottom: 6, color: "#334155", fontSize: 13, fontWeight: "800" },
  input: { minHeight: 44, marginBottom: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, fontSize: 16, outlineStyle: "none" },
  textarea: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  section: { marginBottom: 10, color: "#0f172a", fontSize: 18, fontWeight: "900" },
  track: { minHeight: 74, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", flexDirection: "row", gap: 10 },
  number: { width: 30, color: "#64748b", fontWeight: "900" },
  trackInput: { minHeight: 34, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#f8fafc", fontWeight: "800", outlineStyle: "none" },
  filename: { marginTop: 4, color: "#94a3b8", fontSize: 12 },
  actions: { marginTop: 8, flexDirection: "row", gap: 8 },
  small: { minHeight: 34, paddingHorizontal: 11, borderRadius: 8, backgroundColor: "#eff6ff", justifyContent: "center" },
  smallText: { color: "#1d4ed8", fontWeight: "800" },
  delete: { backgroundColor: "#fef2f2" },
  deleteText: { color: "#b91c1c", fontWeight: "800" },
  primary: { minHeight: 46, borderRadius: 11, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondary: { minHeight: 42, borderRadius: 10, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#1d4ed8", fontWeight: "900" },
  status: { marginBottom: 12, color: "#475569" },
  success: { marginBottom: 10, color: "#15803d", fontWeight: "800" },
  error: { marginBottom: 10, color: "#b91c1c", fontWeight: "800" },
});

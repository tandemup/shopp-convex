import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import {
  sortFilesNaturally,
  titleFromFilename,
} from "@/src/utils/music/uploadFile";

const MAX_TRACKS = 20;

export default function AdminAlbumUploadScreen({ navigation }) {
  const createAlbumDraft = useMutation(api.music.createAlbumDraft);
  const setCoverUrl = useMutation(api.musicAlbums.setCoverUrl);
  const addTrack = useMutation(api.musicTracks.add);
  const publishAlbum = useMutation(api.musicAlbums.publish);

  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");

  const [cover, setCover] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");

  const canUpload = useMemo(
    () =>
      title.trim() &&
      cover &&
      tracks.length > 0 &&
      tracks.length <= MAX_TRACKS &&
      !uploading,
    [title, cover, tracks.length, uploading],
  );

  const pickCover = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setCover(result.assets[0]);
    }
  };

  const pickTracks = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/mp3"],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const selected = sortFilesNaturally(result.assets || [])
      .filter((asset) => {
        const mimeType = String(asset.mimeType || "").toLowerCase();
        const name = String(asset.name || "").toLowerCase();

        return (
          mimeType.includes("mpeg") ||
          mimeType.includes("mp3") ||
          name.endsWith(".mp3")
        );
      })
      .slice(0, MAX_TRACKS)
      .map((asset, index) => ({
        ...asset,
        trackNumber: index + 1,
        title: titleFromFilename(asset.name),
      }));

    setTracks(selected);
  };

  const updateTrackTitle = (index, value) => {
    setTracks((current) =>
      current.map((track, currentIndex) =>
        currentIndex === index ? { ...track, title: value } : track,
      ),
    );
  };

  const uploadToDrive = async (album) => {
    const form = new FormData();
    form.append("album", JSON.stringify(album));
    const appendAsset = async (field, asset) => {
      if (asset.file) form.append(field, asset.file, asset.name);
      else if (asset.uri?.startsWith("blob:")) {
        const blob = await fetch(asset.uri).then((response) => response.blob());
        form.append(field, blob, asset.name);
      } else
        form.append(field, {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType,
        });
    };
    await appendAsset("cover", cover);
    for (const track of tracks) await appendAsset("tracks", track);
    const response = await fetch("/.netlify/functions/upload-album", {
      method: "POST",
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        payload.error || "No se pudo subir el álbum a Google Drive.",
      );
    return payload;
  };

  const uploadAlbum = async () => {
    if (!canUpload) {
      return;
    }

    const numericYear = year.trim() ? Number(year) : undefined;

    if (year.trim() && !Number.isFinite(numericYear)) {
      safeAlert("Año incorrecto", "Introduce un año válido.");
      return;
    }

    try {
      setUploading(true);
      setProgressText("Creando álbum...");

      const albumId = await createAlbumDraft({
        title: title.trim(),
        composer: composer.trim() || undefined,
        artist: artist.trim() || undefined,
        genre: genre.trim() || undefined,
        year: numericYear,
        description: description.trim() || undefined,
        expectedTrackCount: tracks.length,
      });

      setProgressText("Subiendo carátula y pistas a Google Drive...");
      const uploaded = await uploadToDrive({
        title: title.trim(),
        artist: artist.trim() || undefined,
      });
      const coverUrl = String(uploaded?.coverUrl || "").trim();
      if (!coverUrl) {
        throw new Error(
          "La función de subida no devolvió la URL de la carátula.",
        );
      }

      // Enviar siempre ambos campos exigidos por musicAlbums.setCoverUrl.
      await setCoverUrl({
        albumId: albumId,
        coverUrl: coverUrl,
      });

      if (
        !Array.isArray(uploaded?.tracks) ||
        uploaded.tracks.length !== tracks.length
      ) {
        throw new Error(
          "La función de subida no devolvió todas las pistas del álbum.",
        );
      }
      for (let index = 0; index < tracks.length; index += 1) {
        const track = tracks[index];
        const remote = uploaded.tracks[index];
        const audioUrl = String(remote?.audioUrl || "").trim();
        if (!audioUrl) {
          throw new Error(
            `La pista ${index + 1} no tiene una URL de audio válida.`,
          );
        }
        await addTrack({
          albumId,
          title: track.title.trim() || `Pista ${index + 1}`,
          artist: artist.trim() || undefined,
          trackNumber: index + 1,
          audioUrl,
          audioFilename: track.name,
          audioMimeType: track.mimeType || "audio/mpeg",
          audioSizeBytes:
            typeof track.size === "number" ? track.size : undefined,
        });
      }

      setProgressText("Publicando álbum...");
      await publishAlbum({ albumId });

      safeAlert(
        "Álbum publicado",
        "El álbum se ha guardado en Google Drive y Convex solo conserva sus metadatos.",
      );

      setTitle("");
      setComposer("");
      setArtist("");
      setGenre("");
      setYear("");
      setDescription("");
      setCover(null);
      setTracks([]);

      navigation?.goBack?.();
    } catch (error) {
      console.error("[AdminAlbumUpload] error", error);
      safeAlert(
        "Error al subir el álbum",
        error?.message || "No se pudo completar la subida.",
      );
    } finally {
      setUploading(false);
      setProgressText("");
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Nuevo álbum</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Título del álbum *"
        />

        <TextInput
          style={styles.input}
          value={composer}
          onChangeText={setComposer}
          placeholder="Compositor"
        />

        <TextInput
          style={styles.input}
          value={artist}
          onChangeText={setArtist}
          placeholder="Artista o intérprete"
        />

        <TextInput
          style={styles.input}
          value={genre}
          onChangeText={setGenre}
          placeholder="Género"
        />

        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          placeholder="Año"
          keyboardType="number-pad"
        />

        <TextInput
          style={[styles.input, styles.description]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción"
          multiline
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Carátula</Text>

        <Pressable
          style={styles.selectButton}
          onPress={pickCover}
          disabled={uploading}
        >
          <Ionicons name="image-outline" size={21} color="#1d4ed8" />
          <Text style={styles.selectButtonText}>
            {cover?.name || "Seleccionar imagen"}
          </Text>
        </Pressable>

        {cover?.uri ? (
          <Image source={{ uri: cover.uri }} style={styles.cover} />
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pistas</Text>
          <Text style={styles.counter}>
            {tracks.length}/{MAX_TRACKS}
          </Text>
        </View>

        <Pressable
          style={styles.selectButton}
          onPress={pickTracks}
          disabled={uploading}
        >
          <Ionicons name="musical-notes-outline" size={21} color="#1d4ed8" />
          <Text style={styles.selectButtonText}>Seleccionar archivos MP3</Text>
        </Pressable>

        {tracks.map((track, index) => (
          <View key={`${track.name}-${index}`} style={styles.trackRow}>
            <Text style={styles.trackNumber}>
              {String(index + 1).padStart(2, "0")}
            </Text>

            <View style={styles.trackInfo}>
              <TextInput
                style={styles.trackInput}
                value={track.title}
                onChangeText={(value) => updateTrackTitle(index, value)}
              />
              <Text style={styles.filename} numberOfLines={1}>
                {track.name}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {uploading ? (
        <View style={styles.progress}>
          <ActivityIndicator />
          <Text style={styles.progressText}>{progressText}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.uploadButton, !canUpload && styles.disabledButton]}
        onPress={uploadAlbum}
        disabled={!canUpload}
      >
        <Ionicons name="cloud-upload-outline" size={22} color="#ffffff" />
        <Text style={styles.uploadButtonText}>
          {uploading ? "Subiendo..." : "Subir álbum"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 48,
  },
  heading: {
    marginBottom: 16,
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "800",
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  input: {
    minHeight: 46,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  description: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    marginBottom: 12,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },
  counter: {
    color: "#64748b",
    fontWeight: "800",
  },
  selectButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectButtonText: {
    flex: 1,
    color: "#1d4ed8",
    fontWeight: "700",
  },
  cover: {
    width: 150,
    height: 150,
    marginTop: 14,
    alignSelf: "center",
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  trackRow: {
    minHeight: 62,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackNumber: {
    width: 30,
    color: "#64748b",
    fontWeight: "800",
  },
  trackInfo: {
    flex: 1,
  },
  trackInput: {
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontWeight: "700",
  },
  filename: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 12,
  },
  progress: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressText: {
    flex: 1,
    color: "#475569",
    fontWeight: "700",
  },
  uploadButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#1d4ed8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});

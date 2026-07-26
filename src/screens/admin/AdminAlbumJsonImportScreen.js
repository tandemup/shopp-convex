import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { uploadFileToConvex } from "@/src/utils/music/uploadFile";

function readAssetJson(asset) {
  return fetch(asset.uri)
    .then((response) => response.text())
    .then((text) => JSON.parse(text));
}

function normaliseManifest(json) {
  const source = json?.album
    ? json
    : { album: json, cover: json.cover, tracks: json.tracks };
  const album = source.album || {};
  const cover = source.cover || {};
  const tracks = Array.isArray(source.tracks) ? source.tracks : [];

  return {
    album: {
      title: String(album.title || "").trim(),
      composer: album.composer || undefined,
      artist: album.artist || undefined,
      genre: album.genre || undefined,
      year:
        album.year === "" || album.year == null
          ? undefined
          : Number(album.year),
      description: album.description || undefined,
    },
    cover,
    tracks: tracks.map((track, index) => {
      const audio = track.audio || track;
      return {
        trackNumber: Number(track.trackNumber || index + 1),
        title: String(
          track.title || track.trackTitle || track.maintitle || "",
        ).trim(),
        artist: track.artist || undefined,
        audio,
      };
    }),
  };
}

export default function AdminAlbumJsonImportScreen({ navigation }) {
  const generateUploadUrl = useMutation(api.musicStorage.generateUploadUrl);
  const importAlbumFromJson = useMutation(api.musicImport.importAlbumFromJson);
  const [manifest, setManifest] = useState(null);
  const [jsonAsset, setJsonAsset] = useState(null);
  const [cover, setCover] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const pickJson = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    try {
      const json = normaliseManifest(await readAssetJson(result.assets[0]));
      if (!json.album.title || !json.tracks.length)
        throw new Error("El JSON necesita título y al menos una pista.");
      setJsonAsset(result.assets[0]);
      setManifest(json);
      setCover(null);
      setAudioFiles([]);
    } catch (error) {
      safeAlert("JSON no válido", error.message);
    }
  };

  const pickCover = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) setCover(result.assets[0]);
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/mp3"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) setAudioFiles(result.assets || []);
  };

  const importAlbum = async () => {
    if (!manifest || !cover || audioFiles.length !== manifest.tracks.length) {
      safeAlert(
        "Faltan archivos",
        `Selecciona la carátula y exactamente ${manifest?.tracks.length || 0} MP3.`,
      );
      return;
    }
    const byName = new Map(audioFiles.map((file) => [file.name, file]));
    if (
      manifest.tracks.some(
        (track) =>
          !byName.has(track.audio.filename || track.audio.audioFilename),
      )
    ) {
      safeAlert(
        "MP3 no encontrados",
        "El nombre de cada MP3 debe coincidir con el campo filename del JSON.",
      );
      return;
    }
    try {
      setBusy(true);
      const coverStorageId = await uploadFileToConvex({
        asset: cover,
        generateUploadUrl,
        fallbackMimeType: cover.mimeType || "image/jpeg",
      });
      const tracks = [];
      for (const track of manifest.tracks) {
        const audio = track.audio;
        const file = byName.get(audio.filename || audio.audioFilename);
        const audioStorageId = await uploadFileToConvex({
          asset: file,
          generateUploadUrl,
          fallbackMimeType: "audio/mpeg",
        });
        tracks.push({
          trackNumber: track.trackNumber,
          title: track.title,
          artist: track.artist,
          audioStorageId,
          audioFilename: file.name,
          audioMimeType: file.mimeType || "audio/mpeg",
          audioSizeBytes: file.size,
          durationMs: audio.durationMs,
        });
      }
      const result = await importAlbumFromJson({
        album: manifest.album,
        cover: {
          storageId: coverStorageId,
          filename: cover.name,
          mimeType: cover.mimeType,
          sizeBytes: cover.size,
        },
        tracks,
      });
      safeAlert(
        "Álbum importado",
        `Se han creado ${result.importedTracks} pistas.`,
      );
      navigation?.goBack?.();
    } catch (error) {
      safeAlert(
        "Error al importar",
        error.message || "No se pudo importar el álbum.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Importar álbum desde JSON</Text>
      <Text style={styles.help}>
        El JSON define los títulos y nombres de archivo. Después selecciona la
        carátula y los MP3 correspondientes.
      </Text>
      <Pressable style={styles.button} onPress={pickJson}>
        <Text style={styles.buttonText}>
          {jsonAsset ? `JSON: ${jsonAsset.name}` : "Seleccionar JSON"}
        </Text>
      </Pressable>
      {manifest && (
        <Text style={styles.info}>
          {manifest.album.title} · {manifest.tracks.length} pistas
        </Text>
      )}
      <Pressable style={styles.button} onPress={pickCover}>
        <Text style={styles.buttonText}>
          {cover ? `Carátula: ${cover.name}` : "Seleccionar carátula"}
        </Text>
      </Pressable>
      <Pressable style={styles.button} onPress={pickAudio}>
        <Text style={styles.buttonText}>
          {audioFiles.length
            ? `${audioFiles.length} MP3 seleccionados`
            : "Seleccionar MP3"}
        </Text>
      </Pressable>
      <Pressable
        disabled={busy}
        style={[styles.button, styles.primary]}
        onPress={importAlbum}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.buttonText, styles.primaryText]}>
            Subir e importar álbum
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "700" },
  help: { color: "#555", lineHeight: 21 },
  info: { fontWeight: "600" },
  button: {
    minHeight: 48,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8eef8",
  },
  primary: { backgroundColor: "#1769aa" },
  buttonText: { color: "#123", fontWeight: "700" },
  primaryText: { color: "#fff" },
});

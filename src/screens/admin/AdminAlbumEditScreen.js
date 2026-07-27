import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

async function uploadAsset(asset, generateUploadUrl, fallbackType) {
  if (!asset?.uri) {
    throw new Error("No se ha seleccionado ningún archivo.");
  }

  const uploadUrl = await generateUploadUrl();
  const source = await fetch(asset.uri);
  const blob = await source.blob();

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": asset.mimeType || fallbackType,
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`No se pudo subir ${asset.name || "el archivo"}.`);
  }

  const result = await response.json();

  if (!result?.storageId) {
    throw new Error("Convex no devolvió el storageId.");
  }

  return result.storageId;
}

function parseLrc(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(
        /^\s*\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]\s*(.*)$/,
      );
      if (!match) return null;

      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = String(match[3] || "0");
      const milliseconds =
        fraction.length === 1
          ? Number(fraction) * 100
          : fraction.length === 2
            ? Number(fraction) * 10
            : Number(fraction.slice(0, 3));
      const text = match[4].trim();

      return {
        timeMs: (minutes * 60 + seconds) * 1000 + milliseconds,
        text,
      };
    })
    .filter((line) => line && line.text)
    .sort((a, b) => a.timeMs - b.timeMs);
}

export default function AdminAlbumEditScreen({ route }) {
  const albumId = route?.params?.albumId;

  const album = useQuery(
    api.musicAlbums.getForAdmin,
    albumId ? { albumId } : "skip",
  );

  const exportedAlbum = useQuery(
    api.musicAlbums.exportJson,
    albumId ? { albumId } : "skip",
  );

  const updateAlbum = useMutation(api.musicAlbums.update);
  const setCover = useMutation(api.musicAlbums.setCover);
  const setStatus = useMutation(api.musicAlbums.setStatus);
  const publish = useMutation(api.musicAlbums.publish);
  const importAlbumJson = useMutation(api.musicAlbums.importAlbumJson);

  const updateTrack = useMutation(api.musicTracks.update);
  const replaceAudio = useMutation(api.musicTracks.replaceAudio);
  const removeTrack = useMutation(api.musicTracks.remove);
  const reorderTracks = useMutation(api.musicTracks.reorder);

  const generateUploadUrl = useMutation(api.musicStorage.generateUploadUrl);

  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [localTracks, setLocalTracks] = useState([]);
  const [trackTitles, setTrackTitles] = useState({});
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [editingTrackTitle, setEditingTrackTitle] = useState("");
  const [selectedJson, setSelectedJson] = useState(null);
  const [selectedJsonName, setSelectedJsonName] = useState("");
  const [editingLyricsTrackId, setEditingLyricsTrackId] = useState(null);
  const [lyricsText, setLyricsText] = useState("");

  useEffect(() => {
    if (album && !form) {
      setForm({
        title: album.title || "",
        composer: album.composer || "",
        artist: album.artist || "",
        genre: album.genre || "",
        year: album.year ? String(album.year) : "",
        description: album.description || "",
        expectedTrackCount: String(
          album.expectedTrackCount ?? album.trackCount ?? 0,
        ),
      });
    }
  }, [album, form]);

  useEffect(() => {
    if (!album?.tracks) {
      return;
    }

    const orderedTracks = [...album.tracks].sort(
      (a, b) => a.trackNumber - b.trackNumber,
    );

    setLocalTracks(orderedTracks);
    setTrackTitles(
      Object.fromEntries(
        orderedTracks.map((track) => [String(track._id), track.title || ""]),
      ),
    );
  }, [album?.tracks]);

  const clearNotices = () => {
    setMessage("");
    setError("");
  };

  const makeEditable = async () => {
    if (album?.status === "published") {
      await setStatus({
        albumId,
        status: "hidden",
      });
    }
  };

  const save = async () => {
    const numericYear = form.year.trim() ? Number(form.year) : undefined;
    const expectedTrackCount = Number(form.expectedTrackCount);

    if (!form.title.trim()) {
      setError("El título del álbum es obligatorio.");
      return;
    }

    if (numericYear !== undefined && !Number.isFinite(numericYear)) {
      setError("Introduce un año válido.");
      return;
    }

    if (!Number.isInteger(expectedTrackCount) || expectedTrackCount < 0) {
      setError("El número esperado de pistas no es válido.");
      return;
    }

    try {
      clearNotices();
      setBusyAction("save");

      await makeEditable();

      await updateAlbum({
        albumId,
        title: form.title.trim(),
        composer: form.composer.trim() || undefined,
        artist: form.artist.trim() || undefined,
        genre: form.genre.trim() || undefined,
        year: numericYear,
        description: form.description.trim() || undefined,
        expectedTrackCount,
      });

      setMessage(
        "Datos guardados. Publica el álbum cuando termines de editar.",
      );
    } catch (e) {
      setError(e?.message || "No se pudo guardar.");
    } finally {
      setBusyAction("");
    }
  };

  const downloadAlbumJson = () => {
    if (!exportedAlbum) {
      safeAlert(
        "JSON no disponible",
        "Todavía no se han cargado los datos del álbum.",
      );
      return;
    }

    if (
      typeof document === "undefined" ||
      typeof Blob === "undefined" ||
      typeof URL === "undefined"
    ) {
      safeAlert(
        "Disponible en web",
        "La descarga directa del JSON está disponible en la versión web.",
      );
      return;
    }

    const json = JSON.stringify(exportedAlbum, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    const safeTitle = String(exportedAlbum.album.title || "album")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    anchor.href = url;
    anchor.download = `${safeTitle || "album"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const pickAlbumJson = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/json", "text/plain"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    try {
      clearNotices();

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const jsonText = await response.text();
      const parsed = JSON.parse(jsonText);

      if (String(parsed.albumId || "") !== String(albumId || "")) {
        throw new Error("El JSON pertenece a otro álbum.");
      }

      if (!parsed.album || !Array.isArray(parsed.tracks)) {
        throw new Error("El JSON no contiene la estructura esperada.");
      }

      setSelectedJson(parsed);
      setSelectedJsonName(asset.name || "album.json");
      setMessage(`JSON preparado: ${parsed.tracks.length} pistas.`);
    } catch (e) {
      setSelectedJson(null);
      setSelectedJsonName("");
      setError(e?.message || "No se pudo leer el archivo JSON.");
    }
  };

  const applyAlbumJson = async () => {
    if (!selectedJson) {
      setError("Selecciona primero un archivo JSON.");
      return;
    }

    try {
      clearNotices();
      setBusyAction("json");

      const albumData = selectedJson.album || {};
      const sourceTracks = Array.isArray(selectedJson.tracks)
        ? selectedJson.tracks
        : [];

      const normalizedTracks = sourceTracks.map((track, index) => {
        const operation = track.operation === "create" ? "create" : "update";

        if (!track.audioStorageId) {
          throw new Error(
            `La pista ${index + 1} no tiene audioStorageId. ` +
              "Sube primero su MP3 a Convex File Storage.",
          );
        }

        if (operation === "update" && !track.trackId) {
          throw new Error(`La pista existente ${index + 1} no tiene trackId.`);
        }

        const normalizedTrack = {
          operation,
          title: String(track.title || ""),
          cdTrackTitle: String(track.cdTrackTitle || "").trim() || undefined,
          artist: String(track.artist || "").trim() || undefined,
          discNumber: Number(track.discNumber),
          discTrackNumber: Number(track.discTrackNumber ?? track.trackNumber),
          sortOrder: Number(track.sortOrder ?? index + 1),
          audioStorageId: track.audioStorageId,
          audioFilename: String(track.audioFilename || ""),
          audioMimeType: String(track.audioMimeType || "").trim() || undefined,
          audioSizeBytes:
            typeof track.audioSizeBytes === "number"
              ? track.audioSizeBytes
              : undefined,
          durationMs:
            typeof track.durationMs === "number" ? track.durationMs : undefined,
          lyrics: Array.isArray(track.lyrics) ? track.lyrics : undefined,
        };

        if (operation === "update") {
          normalizedTrack.trackId = track.trackId;
        }

        return normalizedTrack;
      });

      await importAlbumJson({
        albumId,
        album: {
          title: String(albumData.title || ""),
          composer: String(albumData.composer || "").trim() || undefined,
          artist: String(albumData.artist || "").trim() || undefined,
          genre: String(albumData.genre || "").trim() || undefined,
          year: typeof albumData.year === "number" ? albumData.year : undefined,
          description: String(albumData.description || "").trim() || undefined,
        },
        cover: {
          storageId: selectedJson.cover?.storageId || undefined,
          filename: String(selectedJson.cover?.filename || ""),
          mimeType:
            String(selectedJson.cover?.mimeType || "").trim() || undefined,
          sizeBytes:
            typeof selectedJson.cover?.sizeBytes === "number"
              ? selectedJson.cover.sizeBytes
              : undefined,
        },
        tracks: normalizedTracks,
      });

      setSelectedJson(null);
      setSelectedJsonName("");
      setEditingTrackId(null);
      setForm(null);

      setMessage("JSON importado. Revisa los cambios y publica el álbum.");
    } catch (e) {
      setError(e?.message || "No se pudo importar el JSON.");
    } finally {
      setBusyAction("");
    }
  };

  const changeCover = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    try {
      clearNotices();
      setBusyAction("cover");
      await makeEditable();

      const asset = result.assets[0];
      const storageId = await uploadAsset(
        asset,
        generateUploadUrl,
        "image/jpeg",
      );

      await setCover({
        albumId,
        coverStorageId: storageId,
        coverFilename: asset.name,
        coverMimeType: asset.mimeType || "image/jpeg",
        coverSizeBytes: typeof asset.size === "number" ? asset.size : undefined,
      });

      setMessage("Carátula actualizada. Publica el álbum cuando termines.");
    } catch (e) {
      setError(e?.message || "No se pudo cambiar la carátula.");
    } finally {
      setBusyAction("");
    }
  };

  const changeAudio = async (track) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/mp3"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    try {
      clearNotices();
      setBusyAction(`audio:${track._id}`);
      await makeEditable();

      const asset = result.assets[0];
      const storageId = await uploadAsset(
        asset,
        generateUploadUrl,
        "audio/mpeg",
      );

      await replaceAudio({
        trackId: track._id,
        audioStorageId: storageId,
        audioFilename: asset.name,
        audioMimeType: asset.mimeType || "audio/mpeg",
        audioSizeBytes: typeof asset.size === "number" ? asset.size : undefined,
      });

      setMessage("MP3 sustituido. Publica el álbum cuando termines.");
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el MP3.");
    } finally {
      setBusyAction("");
    }
  };

  const saveTrackTitle = async (track, titleOverride) => {
    const cleanTitle = String(
      titleOverride ?? trackTitles[String(track._id)] ?? "",
    ).trim();

    if (!cleanTitle) {
      setError("El título de la pista es obligatorio.");
      return;
    }

    if (cleanTitle === track.title) {
      setMessage("El nombre de la pista no ha cambiado.");
      return;
    }

    try {
      clearNotices();
      setBusyAction(`title:${track._id}`);
      await makeEditable();

      await updateTrack({
        trackId: track._id,
        title: cleanTitle,
      });

      setMessage(
        "Nombre de la pista guardado. Publica el álbum cuando termines.",
      );
    } catch (e) {
      setError(e?.message || "No se pudo guardar el nombre de la pista.");
    } finally {
      setBusyAction("");
    }
  };

  const openTrackTitleEditor = (track) => {
    setEditingTrackId(String(track._id));
    setEditingTrackTitle(trackTitles[String(track._id)] || track.title || "");
  };

  const openLyricsEditor = (track) => {
    const lrc = (track.lyrics || [])
      .map((line) => {
        const totalSeconds = Math.max(0, Number(line.timeMs || 0)) / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(2).padStart(5, "0");
        return `[${String(minutes).padStart(2, "0")}:${seconds}]${line.text || ""}`;
      })
      .join("\n");

    setEditingLyricsTrackId(String(track._id));
    setLyricsText(lrc);
  };

  const closeLyricsEditor = () => {
    if (busyAction.startsWith("lyrics:")) return;
    setEditingLyricsTrackId(null);
    setLyricsText("");
  };

  const pickLyricsFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/*", "application/octet-stream"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const response = await fetch(result.assets[0].uri);
    setLyricsText(await response.text());
  };

  const saveEditedLyrics = async () => {
    const track = localTracks.find(
      (item) => String(item._id) === String(editingLyricsTrackId),
    );

    if (!track) return;

    try {
      clearNotices();
      setBusyAction(`lyrics:${track._id}`);
      const lyrics = parseLrc(lyricsText);

      if (lyricsText.trim() && !lyrics.length) {
        throw new Error("No se encontraron líneas LRC válidas.");
      }

      await makeEditable();
      await updateTrack({
        trackId: track._id,
        title: track.title,
        artist: track.artist || undefined,
        lyrics: lyrics.length ? lyrics : undefined,
      });

      setMessage(
        lyrics.length
          ? `Letra guardada: ${lyrics.length} líneas.`
          : "Letra eliminada de la pista.",
      );
      setEditingLyricsTrackId(null);
      setLyricsText("");
    } catch (e) {
      setError(e?.message || "No se pudo guardar la letra.");
    } finally {
      setBusyAction("");
    }
  };

  const closeTrackTitleEditor = () => {
    if (busyAction.startsWith("title:")) return;
    setEditingTrackId(null);
    setEditingTrackTitle("");
  };

  const saveEditedTrackTitle = async () => {
    const track = localTracks.find(
      (item) => String(item._id) === String(editingTrackId),
    );
    const cleanTitle = editingTrackTitle.trim();

    if (!track) return;
    if (!cleanTitle) {
      setError("El título de la pista es obligatorio.");
      return;
    }

    setTrackTitles((current) => ({
      ...current,
      [String(track._id)]: cleanTitle,
    }));
    await saveTrackTitle(track, cleanTitle);

    setEditingTrackId(null);
    setEditingTrackTitle("");
  };

  const moveTrack = async (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= localTracks.length) {
      return;
    }

    const previousTracks = [...localTracks];
    const reorderedTracks = [...localTracks];

    [reorderedTracks[index], reorderedTracks[targetIndex]] = [
      reorderedTracks[targetIndex],
      reorderedTracks[index],
    ];

    setLocalTracks(reorderedTracks);

    try {
      clearNotices();
      setBusyAction("reorder");
      await makeEditable();

      await reorderTracks({
        albumId,
        orderedTrackIds: reorderedTracks.map((track) => track._id),
      });

      setMessage(
        "Orden de las pistas actualizado. Publica el álbum cuando termines.",
      );
    } catch (e) {
      setLocalTracks(previousTracks);
      setError(e?.message || "No se pudo cambiar el orden de las pistas.");
    } finally {
      setBusyAction("");
    }
  };

  const confirmRemoveTrack = (track) => {
    safeAlert(
      "Eliminar pista",
      `Se eliminarán “${track.title}” y su archivo MP3 de Convex File Storage.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              clearNotices();
              setBusyAction(`remove:${track._id}`);
              await makeEditable();
              await removeTrack({ trackId: track._id });
              setMessage("Pista eliminada. Publica el álbum cuando termines.");
            } catch (e) {
              setError(e?.message || "No se pudo eliminar la pista.");
            } finally {
              setBusyAction("");
            }
          },
        },
      ],
    );
  };

  const changeStatus = async (status) => {
    try {
      clearNotices();
      setBusyAction("status");
      await setStatus({ albumId, status });
      setMessage(
        status === "hidden" ? "Álbum ocultado." : "Estado actualizado.",
      );
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el estado.");
    } finally {
      setBusyAction("");
    }
  };

  const publishAlbum = async () => {
    try {
      clearNotices();
      setBusyAction("publish");
      await publish({ albumId });
      setMessage("Álbum publicado.");
    } catch (e) {
      setError(e?.message || "No se pudo publicar.");
    } finally {
      setBusyAction("");
    }
  };

  if (!albumId) {
    return (
      <View style={styles.centered}>
        <Text>Falta el identificador del álbum.</Text>
      </View>
    );
  }

  if (album === undefined || !form) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (album === null) {
    return (
      <View style={styles.centered}>
        <Text>Álbum no encontrado.</Text>
      </View>
    );
  }

  const isBusy = Boolean(busyAction);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Editar álbum</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Edición mediante JSON</Text>
        <Text style={styles.jsonHelp}>
          Descarga el álbum, edita sus metadatos, nombres y números de pista, y
          vuelve a importar el archivo. No modifiques los identificadores de
          Convex File Storage.
        </Text>

        <View style={styles.jsonActions}>
          <Pressable
            style={[styles.secondary, isBusy && styles.disabled]}
            onPress={downloadAlbumJson}
            disabled={isBusy || !exportedAlbum}
          >
            <Text style={styles.secondaryText}>Descargar JSON</Text>
          </Pressable>

          <Pressable
            style={[styles.secondary, isBusy && styles.disabled]}
            onPress={pickAlbumJson}
            disabled={isBusy}
          >
            <Text style={styles.secondaryText}>Seleccionar JSON editado</Text>
          </Pressable>

          {selectedJson ? (
            <Pressable
              style={[styles.primary, isBusy && styles.disabled]}
              onPress={applyAlbumJson}
              disabled={isBusy}
            >
              {busyAction === "json" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryText}>Aplicar cambios del JSON</Text>
              )}
            </Pressable>
          ) : null}
        </View>

        {selectedJsonName ? (
          <Text style={styles.selectedJson}>Archivo: {selectedJsonName}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        {album.coverUrl ? (
          <Image source={{ uri: album.coverUrl }} style={styles.cover} />
        ) : null}

        <Pressable
          style={[styles.secondary, isBusy && styles.disabled]}
          onPress={changeCover}
          disabled={isBusy}
        >
          {busyAction === "cover" ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.secondaryText}>Cambiar carátula</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        {Object.entries({
          title: "Título",
          composer: "Compositor",
          artist: "Artista",
          genre: "Género",
          year: "Año",
          expectedTrackCount: "Número esperado de pistas",
        }).map(([name, label]) => (
          <View key={name}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={form[name]}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  [name]: value,
                }))
              }
              keyboardType={
                name === "year" || name === "expectedTrackCount"
                  ? "number-pad"
                  : "default"
              }
              style={styles.input}
              editable={!isBusy}
            />
          </View>
        ))}

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={form.description}
          onChangeText={(value) =>
            setForm((current) => ({
              ...current,
              description: value,
            }))
          }
          multiline
          style={[styles.input, styles.textarea]}
          editable={!isBusy}
        />

        <Pressable
          style={[styles.primary, isBusy && styles.disabled]}
          onPress={save}
          disabled={isBusy}
        >
          {busyAction === "save" ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryText}>Guardar datos</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Pistas</Text>

        {localTracks.length ? (
          localTracks.map((track, index) => (
            <View key={String(track._id)} style={styles.track}>
              <Text style={styles.number}>
                {String(index + 1).padStart(2, "0")}
              </Text>

              <View style={styles.trackBody}>
                <TextInput
                  value={trackTitles[String(track._id)] || ""}
                  onChangeText={(value) =>
                    setTrackTitles((current) => ({
                      ...current,
                      [String(track._id)]: value,
                    }))
                  }
                  style={styles.trackInput}
                  editable={!isBusy}
                />

                <Text style={styles.filename} numberOfLines={1}>
                  {track.audioFilename ||
                    track.filename ||
                    "Archivo sin nombre"}
                </Text>

                <View style={styles.trackEditActions}>
                  <Pressable
                    style={[styles.small, isBusy && styles.disabled]}
                    onPress={() => openTrackTitleEditor(track)}
                    disabled={isBusy}
                  >
                    <Text style={styles.smallText}>Editar nombre</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.small, isBusy && styles.disabled]}
                    onPress={() => openLyricsEditor(track)}
                    disabled={isBusy}
                  >
                    <Text style={styles.smallText}>
                      {track.lyrics?.length ? "Editar lyrics" : "Añadir lyrics"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.orderButton, index === 0 && styles.disabled]}
                    onPress={() => moveTrack(index, -1)}
                    disabled={isBusy || index === 0}
                    accessibilityLabel="Mover pista hacia arriba"
                  >
                    <Text style={styles.orderButtonText}>↑</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.orderButton,
                      index === localTracks.length - 1 && styles.disabled,
                    ]}
                    onPress={() => moveTrack(index, 1)}
                    disabled={isBusy || index === localTracks.length - 1}
                    accessibilityLabel="Mover pista hacia abajo"
                  >
                    <Text style={styles.orderButtonText}>↓</Text>
                  </Pressable>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.small}
                    onPress={() => changeAudio(track)}
                    disabled={isBusy}
                  >
                    <Text style={styles.smallText}>Cambiar MP3</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.small, styles.delete]}
                    onPress={() => confirmRemoveTrack(track)}
                    disabled={isBusy}
                  >
                    <Text style={styles.deleteText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>El álbum no contiene pistas.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.status}>
          Estado: <Text style={styles.statusValue}>{album.status}</Text>
        </Text>

        {album.status === "published" ? (
          <Pressable
            style={[styles.secondary, isBusy && styles.disabled]}
            onPress={() => changeStatus("hidden")}
            disabled={isBusy}
          >
            <Text style={styles.secondaryText}>Ocultar para editar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primary, isBusy && styles.disabled]}
            onPress={publishAlbum}
            disabled={isBusy}
          >
            {busyAction === "publish" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryText}>Publicar álbum</Text>
            )}
          </Pressable>
        )}
      </View>

      {message ? <Text style={styles.success}>{message}</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={editingTrackId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeTrackTitleEditor}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar nombre del track</Text>
            <TextInput
              autoFocus
              value={editingTrackTitle}
              onChangeText={setEditingTrackTitle}
              placeholder="Nombre de la pista"
              style={styles.input}
              editable={!isBusy}
              selectTextOnFocus
              onSubmitEditing={saveEditedTrackTitle}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondary}
                onPress={closeTrackTitleEditor}
                disabled={isBusy}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, isBusy && styles.disabled]}
                onPress={saveEditedTrackTitle}
                disabled={isBusy}
              >
                {busyAction.startsWith("title:") ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editingLyricsTrackId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeLyricsEditor}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Lyrics sincronizados</Text>
            <Text style={styles.modalHelp}>
              Pega el contenido .lrc. Ejemplo: [00:12.50]Texto de la línea
            </Text>
            <TextInput
              value={lyricsText}
              onChangeText={setLyricsText}
              placeholder="[00:00.00]Primera línea"
              multiline
              style={[styles.input, styles.lyricsInput]}
              editable={!isBusy}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondary}
                onPress={pickLyricsFile}
                disabled={isBusy}
              >
                <Text style={styles.secondaryText}>Cargar .lrc</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={closeLyricsEditor}
                disabled={isBusy}
              >
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, isBusy && styles.disabled]}
                onPress={saveEditedLyrics}
                disabled={isBusy}
              >
                {busyAction.startsWith("lyrics:") ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryText}>Guardar lyrics</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 50,
  },
  heading: {
    marginBottom: 16,
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
  },
  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  cover: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 12,
    borderRadius: 13,
  },
  label: {
    marginBottom: 6,
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 44,
    marginBottom: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    fontSize: 16,
    outlineStyle: "none",
  },
  textarea: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  section: {
    marginBottom: 10,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  jsonHelp: {
    marginBottom: 12,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  jsonActions: {
    gap: 10,
  },
  selectedJson: {
    marginTop: 10,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  track: {
    minHeight: 74,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    gap: 10,
  },
  trackBody: {
    flex: 1,
  },
  number: {
    width: 30,
    color: "#64748b",
    fontWeight: "900",
  },
  trackInput: {
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    fontWeight: "800",
    outlineStyle: "none",
  },
  filename: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 12,
  },
  trackEditActions: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  orderButton: {
    width: 38,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  orderButtonText: {
    color: "#1d4ed8",
    fontSize: 20,
    fontWeight: "900",
  },
  small: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
  },
  smallText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  delete: {
    backgroundColor: "#fef2f2",
  },
  deleteText: {
    color: "#b91c1c",
    fontWeight: "800",
  },
  primary: {
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  secondary: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#1d4ed8",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.55,
  },
  status: {
    marginBottom: 12,
    color: "#475569",
  },
  statusValue: {
    fontWeight: "900",
  },
  empty: {
    color: "#64748b",
  },
  success: {
    marginBottom: 10,
    color: "#15803d",
    fontWeight: "800",
  },
  error: {
    marginBottom: 10,
    color: "#b91c1c",
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    marginBottom: 14,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  modalHelp: {
    marginBottom: 10,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  lyricsInput: {
    minHeight: 220,
    paddingTop: 12,
    fontFamily: "monospace",
  },
  modalActions: {
    marginTop: 14,
    gap: 10,
  },
});

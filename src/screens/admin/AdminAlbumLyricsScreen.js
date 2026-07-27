import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function parseLrc(value) {
  return String(value || "")
    .split(/\r?\n/)
    .flatMap((line) => {
      const matches = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
      const text = line.replace(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g, "").trim();

      return matches
        .map((match) => {
          const fraction = String(match[3] || "").padEnd(3, "0").slice(0, 3);
          return {
            timeMs:
              Number(match[1]) * 60000 +
              Number(match[2]) * 1000 +
              Number(fraction),
            text,
          };
        })
        .filter((lineItem) => lineItem.text);
    })
    .sort((a, b) => a.timeMs - b.timeMs);
}

function formatLyrics(lyrics) {
  return (lyrics || [])
    .map((line) => {
      const totalSeconds = Math.floor((line.timeMs || 0) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      const hundredths = String(Math.floor(((line.timeMs || 0) % 1000) / 10)).padStart(2, "0");
      return `[${String(minutes).padStart(2, "0")}:${seconds}.${hundredths}]${line.text}`;
    })
    .join("\n");
}

export default function AdminAlbumLyricsScreen({ route }) {
  const albumId = route?.params?.albumId;
  const album = useQuery(
    api.musicAlbums.getForAdmin,
    albumId ? { albumId } : "skip",
  );
  const updateTrack = useMutation(api.musicTracks.update);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [lrcText, setLrcText] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedTrack = useMemo(
    () => album?.tracks?.find((track) => track._id === selectedTrackId) || null,
    [album?.tracks, selectedTrackId],
  );

  const selectTrack = (track) => {
    setSelectedTrackId(track._id);
    setLrcText(formatLyrics(track.lyrics));
    setMessage("");
  };

  const save = async () => {
    if (!selectedTrack) return;
    const lyrics = parseLrc(lrcText);
    setSaving(true);
    setMessage("");
    try {
      await updateTrack({
        trackId: selectedTrack._id,
        title: selectedTrack.title,
        artist: selectedTrack.artist,
        lyrics: lyrics.length ? lyrics : undefined,
      });
      setMessage(`Letra guardada: ${lyrics.length} líneas.`);
    } catch (error) {
      setMessage(error?.message || "No se pudo guardar la letra.");
    } finally {
      setSaving(false);
    }
  };

  if (album === undefined) return <ActivityIndicator style={styles.loader} />;
  if (!album) return <Text style={styles.message}>Álbum no encontrado.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{album.title}</Text>
      <Text style={styles.help}>Selecciona una pista y pega su contenido .lrc.</Text>
      {album.status === "published" ? (
        <Text style={styles.warning}>
          El álbum está publicado. Ocúltalo antes de guardar cambios.
        </Text>
      ) : null}

      <View style={styles.trackList}>
        {album.tracks.map((track) => (
          <Pressable
            key={track._id}
            style={[styles.track, selectedTrackId === track._id && styles.selectedTrack]}
            onPress={() => selectTrack(track)}
          >
            <Text style={styles.trackNumber}>{track.trackNumber}.</Text>
            <Text style={styles.trackTitle}>{track.title}</Text>
            <Text style={styles.trackStatus}>{track.lyrics?.length || 0} líneas</Text>
          </Pressable>
        ))}
      </View>

      {selectedTrack ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>{selectedTrack.title}</Text>
          <TextInput
            multiline
            value={lrcText}
            onChangeText={setLrcText}
            placeholder="[00:00.00]Primera línea"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            textAlignVertical="top"
          />
          <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar letra</Text>}
          </Pressable>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignSelf: "center", marginTop: 40 },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 18, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  help: { marginTop: 5, color: "#64748b" },
  warning: { marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: "#fef3c7", color: "#92400e" },
  trackList: { marginTop: 18, gap: 8 },
  track: { minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", gap: 8 },
  selectedTrack: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  trackNumber: { color: "#64748b", width: 28 },
  trackTitle: { flex: 1, color: "#0f172a", fontWeight: "700" },
  trackStatus: { color: "#64748b", fontSize: 12 },
  editor: { marginTop: 20 },
  editorTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  input: { minHeight: 220, padding: 12, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, backgroundColor: "#fff", color: "#0f172a", fontFamily: "monospace" },
  saveButton: { minHeight: 48, marginTop: 12, borderRadius: 10, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "800" },
  message: { marginTop: 12, color: "#475569" },
});

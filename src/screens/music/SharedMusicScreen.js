import React, { useEffect, useState } from "react";
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
import {
  downloadSharedAlbum,
  listSharedAlbums,
  readSharedAlbum,
} from "../../services/sharedMusicStorage";
import { ROUTES } from "../../navigation/ROUTES";

export default function SharedMusicScreen({ navigation }) {
  const [url, setUrl] = useState("");
  const [albums, setAlbums] = useState([]);
  const [album, setAlbum] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listSharedAlbums()
      .then(setAlbums)
      .catch(() => {});
  }, []);

  const importAlbum = async () => {
    setBusy(true);
    setError("");
    setProgress("Leyendo album.json...");
    try {
      setAlbum(await readSharedAlbum(url));
    } catch (e) {
      setError(e.message || "No se pudo leer el álbum.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  const download = async () => {
    if (!album) return;
    setBusy(true);
    setError("");
    try {
      const saved = await downloadSharedAlbum(album, (done, total) =>
        setProgress(`Descargando ${done}/${total} pistas...`),
      );
      setAlbums((previous) => [
        saved,
        ...previous.filter((item) => item._id !== saved._id),
      ]);
      setAlbum(saved);
    } catch (e) {
      setError(e.message || "No se pudo descargar el álbum.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  const open = (item) =>
    navigation.navigate(ROUTES.MUSIC_PLAYER, { sharedAlbum: item });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Ionicons name="cloud-download-outline" size={28} color="#2563eb" />
        <View>
          <Text style={styles.title}>Música compartida</Text>
          <Text style={styles.subtitle}>
            Descarga álbumes desde un enlace público
          </Text>
        </View>
      </View>
      <Text style={styles.label}>Enlace directo a album.json</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://drive.google.com/file/d/ID/view"
        style={styles.input}
      />
      <Text style={styles.hint}>
        No uses el enlace de la carpeta. Abre album.json en Drive, pulsa
        Compartir → Copiar enlace y asegúrate de que tenga acceso público.
      </Text>
      <Pressable
        style={styles.primary}
        onPress={importAlbum}
        disabled={busy || !url.trim()}
      >
        <Text style={styles.primaryText}>Leer álbum</Text>
      </Pressable>
      {progress ? (
        <View style={styles.status}>
          <ActivityIndicator />
          <Text>{progress}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {album ? (
        <View style={styles.preview}>
          {album.coverUrl ? (
            <Image source={{ uri: album.coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.placeholder]}>
              <Ionicons name="musical-notes" size={28} color="#64748b" />
            </View>
          )}
          <View style={styles.flex}>
            <Text style={styles.albumTitle}>{album.title}</Text>
            <Text style={styles.artist}>{album.artist}</Text>
            <Text style={styles.meta}>{album.tracks.length} pistas</Text>
          </View>
          <Pressable style={styles.download} onPress={download} disabled={busy}>
            <Ionicons name="download-outline" size={23} color="#fff" />
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.section}>Álbumes descargados</Text>
      {albums.length === 0 ? (
        <Text style={styles.empty}>
          Todavía no has descargado álbumes compartidos.
        </Text>
      ) : (
        albums.map((item) => (
          <Pressable
            key={item._id}
            style={styles.row}
            onPress={() => open(item)}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.placeholder]}>
                <Ionicons name="musical-notes" size={20} color="#64748b" />
              </View>
            )}
            <View style={styles.flex}>
              <Text style={styles.albumTitle}>{item.title}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
              <Text style={styles.meta}>
                {item.tracks.length} pistas · Disponible sin conexión
              </Text>
            </View>
            <Ionicons name="play-circle-outline" size={27} color="#2563eb" />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    padding: 18,
    paddingBottom: 48,
  },
  heading: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 3 },
  label: { fontWeight: "700", color: "#334155", marginBottom: 7 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  hint: { color: "#64748b", fontSize: 12, lineHeight: 17, marginTop: 7 },
  primary: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
  status: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 15,
  },
  error: { color: "#b91c1c", marginTop: 12 },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cover: { width: 68, height: 68, borderRadius: 8 },
  thumb: { width: 58, height: 58, borderRadius: 7 },
  placeholder: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
  albumTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a" },
  artist: { color: "#475569", marginTop: 3 },
  meta: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  download: { backgroundColor: "#2563eb", borderRadius: 22, padding: 10 },
  section: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 30,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 13,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  empty: { color: "#64748b" },
});

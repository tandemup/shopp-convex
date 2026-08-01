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
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ROUTES } from "../../navigation/ROUTES";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function MusicLibraryScreen({ navigation }) {
  const albums = useQuery(api.musicAlbums.listMine);
  const [searchText, setSearchText] = useState("");
  const filteredAlbums = useMemo(() => {
    const search = normalize(searchText.trim());
    if (!search) return albums || [];
    return (albums || []).filter((album) =>
      normalize(
        [album.title, album.artist, album.composer, album.genre, album.year]
          .filter(Boolean)
          .join(" "),
      ).includes(search),
    );
  }, [albums, searchText]);
  const renderAlbumCard = (album) => (
    <Pressable
      key={album._id}
      style={styles.albumCard}
      onPress={() =>
        navigation.navigate(ROUTES.MUSIC_PLAYER, { albumId: album._id })
      }
    >
      {album.coverUrl ? (
        <Image source={{ uri: album.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Ionicons name="musical-notes" size={28} color="#64748b" />
        </View>
      )}
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle}>{album.title}</Text>
        <Text style={styles.albumArtist}>
          {album.artist || album.composer || "Sin artista"}
        </Text>
        <Text style={styles.albumMeta}>
          {album.trackCount || 0} pistas
          {album.genre ? ` · ${album.genre}` : ""}
          {album.year ? ` · ${album.year}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
    </Pressable>
  );
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name="musical-notes" size={30} color="#1d4ed8" />
        <View style={styles.heroText}>
          <Text style={styles.title}>Música</Text>
          <Text style={styles.subtitle}>Mis álbumes</Text>
        </View>
      </View>
      <Pressable
        style={styles.sharedMusicButton}
        onPress={() => navigation.navigate(ROUTES.SHARED_MUSIC)}
      >
        <Ionicons name="cloud-download-outline" size={20} color="#2563eb" />
        <Text style={styles.sharedMusicText}>Descargar música compartida</Text>
        <Ionicons name="chevron-forward" size={18} color="#2563eb" />
      </Pressable>

      <View style={[styles.sectionHeader, styles.albumsHeader]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="albums" size={21} color="#1d4ed8" />
          <Text style={styles.sectionTitle}>Álbumes</Text>
        </View>
      </View>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar álbum, compositor o artista"
          placeholderTextColor="#94a3b8"
        />
      </View>
      <Text style={styles.libraryHint}>
        Aquí aparecen únicamente los álbumes publicados por tu usuario.
      </Text>
      {albums === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : filteredAlbums.length === 0 ? (
        <Text style={styles.emptyText}>
          Todavía no tienes álbumes publicados.
        </Text>
      ) : (
        filteredAlbums.map((album) => renderAlbumCard(album))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 48,
  },
  hero: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroText: { flex: 1 },
  sharedMusicButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  sharedMusicText: { flex: 1, color: "#1d4ed8", fontWeight: "700" },
  title: { color: "#0f172a", fontSize: 24, fontWeight: "800" },
  subtitle: { marginTop: 3, color: "#64748b", fontSize: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { color: "#2563eb", fontSize: 13, fontWeight: "700" },
  playlistsRow: { gap: 10, paddingBottom: 6 },
  playlistCard: {
    width: 145,
    minHeight: 118,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  newPlaylistCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
    marginBottom: 8,
  },
  playlistName: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  playlistMeta: { marginTop: 4, color: "#64748b", fontSize: 12 },
  createPlaylistCard: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playlistInfo: { flex: 1 },
  playlistLoader: { marginVertical: 20 },
  albumsHeader: { marginTop: 24 },
  searchBar: {
    minHeight: 48,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: "#0f172a",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  loader: { marginTop: 30 },
  emptyText: { padding: 28, color: "#64748b", textAlign: "center" },
  libraryHint: { marginBottom: 12, color: "#64748b", fontSize: 13 },
  subsectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },
  albumCard: {
    minHeight: 94,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cover: { width: 70, height: 70, borderRadius: 10 },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  albumInfo: { flex: 1 },
  albumTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  albumArtist: { marginTop: 4, color: "#475569" },
  albumMeta: { marginTop: 5, color: "#94a3b8", fontSize: 12 },
});

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
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ROUTES } from "../../navigation/ROUTES";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function MusicLibraryScreen({ navigation }) {
  const albums = useQuery(api.musicAlbums.listPublished);
  const myAlbums = useQuery(api.userMusicAlbums.listMine);
  const playlists = useQuery(api.musicPlaylists.listMine);
  const addAlbum = useMutation(api.userMusicAlbums.add);
  const removeAlbum = useMutation(api.userMusicAlbums.remove);
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
  const myAlbumIds = useMemo(
    () => new Set((myAlbums || []).map((album) => String(album._id))),
    [myAlbums],
  );
  const myLibraryAlbums = useMemo(() => {
    const search = normalize(searchText.trim());
    return (myAlbums || []).filter((album) => {
      if (!search) return true;
      return normalize(
        [album.title, album.artist, album.composer, album.genre, album.year]
          .filter(Boolean)
          .join(" "),
      ).includes(search);
    });
  }, [myAlbums, searchText]);
  const toggleLibrary = async (album) => {
    if (myAlbumIds.has(String(album._id))) {
      await removeAlbum({ albumId: album._id });
    } else {
      await addAlbum({ albumId: album._id });
    }
  };
  const renderAlbumCard = (album, showLibraryAction = false) => (
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
      {showLibraryAction ? (
        <Pressable
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            toggleLibrary(album);
          }}
        >
          <Ionicons
            name={
              myAlbumIds.has(String(album._id))
                ? "checkmark-circle"
                : "add-circle-outline"
            }
            size={25}
            color="#2563eb"
          />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
      )}
    </Pressable>
  );
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name="musical-notes" size={30} color="#1d4ed8" />
        <View style={styles.heroText}>
          <Text style={styles.title}>Música</Text>
          <Text style={styles.subtitle}>Álbumes y playlists</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="list" size={21} color="#1d4ed8" />
          <Text style={styles.sectionTitle}>Mis playlists</Text>
        </View>
        <Pressable
          style={styles.seeAll}
          onPress={() => navigation.navigate(ROUTES.MUSIC_PLAYLISTS)}
        >
          <Text style={styles.seeAllText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={17} color="#2563eb" />
        </Pressable>
      </View>
      {playlists === undefined ? (
        <ActivityIndicator style={styles.playlistLoader} />
      ) : playlists.length === 0 ? (
        <Pressable
          style={styles.createPlaylistCard}
          onPress={() => navigation.navigate(ROUTES.MUSIC_PLAYLISTS)}
        >
          <Ionicons name="add-circle-outline" size={28} color="#2563eb" />
          <View style={styles.playlistInfo}>
            <Text style={styles.playlistName}>Crear una playlist</Text>
            <Text style={styles.playlistMeta}>
              Organiza y comparte tus canciones
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playlistsRow}
        >
          {playlists.map((playlist) => (
            <Pressable
              key={playlist._id}
              style={styles.playlistCard}
              onPress={() =>
                navigation.navigate(ROUTES.MUSIC_PLAYLIST_DETAIL, {
                  playlistId: playlist._id,
                })
              }
            >
              <View style={styles.playlistIcon}>
                <Ionicons
                  name={playlist.isPublic ? "people" : "musical-notes"}
                  size={25}
                  color="#2563eb"
                />
              </View>
              <Text numberOfLines={1} style={styles.playlistName}>
                {playlist.name}
              </Text>
              <Text style={styles.playlistMeta}>
                {playlist.tracks || 0} canciones
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.playlistCard, styles.newPlaylistCard]}
            onPress={() => navigation.navigate(ROUTES.MUSIC_PLAYLISTS)}
          >
            <Ionicons name="add" size={28} color="#2563eb" />
            <Text style={styles.playlistName}>Nueva</Text>
          </Pressable>
        </ScrollView>
      )}

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
        Guarda álbumes en tu biblioteca para encontrarlos rápidamente. Los
        archivos no se duplican.
      </Text>
      {myAlbums === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : myLibraryAlbums.length > 0 ? (
        <>
          <Text style={styles.subsectionTitle}>Mi biblioteca</Text>
          {myLibraryAlbums.map((album) => renderAlbumCard(album, true))}
          <Text style={styles.subsectionTitle}>Álbumes disponibles</Text>
        </>
      ) : null}
      {albums === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : filteredAlbums.length === 0 ? (
        <Text style={styles.emptyText}>No hay álbumes publicados.</Text>
      ) : (
        filteredAlbums
          .filter((album) => !myAlbumIds.has(String(album._id)))
          .map((album) => renderAlbumCard(album, true))
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

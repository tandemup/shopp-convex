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

import { api } from "@/convex/_generated/api";
import { ROUTES } from "@/src/navigation/ROUTES";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function MusicLibraryScreen({ navigation }) {
  const albums = useQuery(api.music.listAlbums);
  const currentUser = useQuery(api.users.current);
  const [searchText, setSearchText] = useState("");

  const isAdmin =
    currentUser?.isAdmin === true || currentUser?.role === "admin";

  const filteredAlbums = useMemo(() => {
    if (!albums) {
      return [];
    }

    const search = normalize(searchText.trim());

    if (!search) {
      return albums;
    }

    return albums.filter((album) =>
      normalize(
        [album.title, album.composer, album.artist, album.genre, album.year]
          .filter(Boolean)
          .join(" "),
      ).includes(search),
    );
  }, [albums, searchText]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name="albums" size={30} color="#1d4ed8" />

        <View style={styles.heroText}>
          <Text style={styles.title}>Biblioteca musical</Text>
          <Text style={styles.subtitle}>
            Busca un álbum y selecciona uno para reproducir sus pistas.
          </Text>
        </View>
      </View>

      {isAdmin ? (
        <Pressable
          style={styles.newAlbumButton}
          onPress={() => navigation.navigate(ROUTES.ADMIN_ALBUMS)}
        >
          <Ionicons name="add" size={22} color="#ffffff" />
          <Text style={styles.newAlbumButtonText}>Albums</Text>
        </Pressable>
      ) : null}

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

      {albums === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : filteredAlbums.length === 0 ? (
        <Text style={styles.emptyText}>No hay álbumes publicados.</Text>
      ) : (
        filteredAlbums.map((album) => (
          <Pressable
            key={album._id}
            style={styles.albumCard}
            onPress={() =>
              navigation.navigate(ROUTES.MUSIC_PLAYER, {
                albumId: album._id,
              })
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
                {album.trackCount} pistas
                {album.genre ? ` · ${album.genre}` : ""}
                {album.year ? ` · ${album.year}` : ""}
              </Text>
            </View>

            {isAdmin ? (
              <Pressable
                style={styles.lyricsButton}
                onPress={(event) => {
                  event.stopPropagation?.();
                  navigation.navigate(ROUTES.ADMIN_ALBUM_LYRICS, {
                    albumId: album._id,
                  });
                }}
              >
                <Ionicons name="text-outline" size={18} color="#1d4ed8" />
              </Pressable>
            ) : null}

            <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
          </Pressable>
        ))
      )}
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
  hero: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroText: {
    flex: 1,
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  newAlbumButton: {
    minHeight: 48,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: "#1d4ed8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newAlbumButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  searchBar: {
    minHeight: 48,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: "#0f172a",
    // El navegador muestra este contorno azul al recibir el foco.
    outlineStyle: "none",
    outlineWidth: 0,
  },

  searchBar1: {
    minHeight: 48,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput1: {
    flex: 1,
    minHeight: 46,
    color: "#0f172a",
  },
  loader: {
    marginTop: 30,
  },
  emptyText: {
    padding: 28,
    color: "#64748b",
    textAlign: "center",
  },
  albumCard: {
    minHeight: 94,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cover: {
    width: 74,
    height: 74,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  albumArtist: {
    marginTop: 3,
    color: "#475569",
  },
  albumMeta: {
    marginTop: 5,
    color: "#94a3b8",
    fontSize: 12,
  },
  lyricsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
});

import React, { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AlbumSearchBar from "../../components/music/AlbumSearchBar";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export default function MusicAlbumsScreen({ navigation }) {
  const albums = useQuery(api.musicAlbums.listPublished) || [];
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    const search = normalize(searchText.trim());
    if (!search) return albums;
    return albums.filter((album) =>
      normalize([album.title, album.artist, album.genre, album.year].filter(Boolean).join(" ")).includes(search),
    );
  }, [albums, searchText]);

  return (
    <View style={styles.screen}>
      <AlbumSearchBar value={searchText} onChangeText={setSearchText} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No hay álbumes</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("MusicPlayer", { albumId: item._id })}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.placeholder]}>
                <Ionicons name="musical-notes" size={28} color="#64748b" />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.artist}>{item.artist || "Sin artista"}</Text>
              <Text style={styles.meta}>
                {item.trackCount} pistas{item.genre ? ` · ${item.genre}` : ""}{item.year ? ` · ${item.year}` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f5f9" },
  list: { width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    minHeight: 94, marginBottom: 10, padding: 10, borderRadius: 15,
    borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  cover: { width: 74, height: 74, borderRadius: 10, backgroundColor: "#e2e8f0" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  title: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  artist: { marginTop: 3, color: "#475569" },
  meta: { marginTop: 5, color: "#94a3b8", fontSize: 13 },
  empty: { paddingTop: 80, alignItems: "center" },
  emptyTitle: { marginTop: 12, color: "#334155", fontSize: 18, fontWeight: "900" },
});

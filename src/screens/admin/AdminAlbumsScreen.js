import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminAlbumsScreen({ navigation }) {
  const albums = useQuery(api.musicAlbums.listForAdmin);
  const removeAlbum = useMutation(api.musicAlbums.remove);
  const setStatus = useMutation(api.musicAlbums.setStatus);
  const publish = useMutation(api.musicAlbums.publish);

  if (albums === undefined) {
    return <View style={styles.centered}><ActivityIndicator /></View>;
  }

  const confirmDelete = async (album) => {
    const confirmed = typeof window !== "undefined"
      ? window.confirm(`¿Eliminar definitivamente "${album.title}"?`)
      : true;
    if (confirmed) await removeAlbum({ albumId: album._id });
  };

  return (
    <View style={styles.screen}>
      <Pressable
        style={styles.newButton}
        onPress={() => navigation.navigate("AdminAlbumUpload")}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.newButtonText}>Nuevo álbum</Text>
      </Pressable>

      <FlatList
        data={albums}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.placeholder]}>
                <Ionicons name="albums-outline" size={28} color="#64748b" />
              </View>
            )}

            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.artist || "Sin artista"}</Text>
              <Text style={styles.meta}>
                {item.trackCount}/{item.expectedTrackCount} pistas · {item.status}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  style={styles.button}
                  onPress={() => navigation.navigate("AdminAlbumEdit", { albumId: item._id })}
                >
                  <Text style={styles.buttonText}>Editar</Text>
                </Pressable>

                {item.status === "published" ? (
                  <Pressable
                    style={styles.button}
                    onPress={() => setStatus({ albumId: item._id, status: "hidden" })}
                  >
                    <Text style={styles.buttonText}>Ocultar</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.button} onPress={() => publish({ albumId: item._id })}>
                    <Text style={styles.buttonText}>Publicar</Text>
                  </Pressable>
                )}

                <Pressable style={[styles.button, styles.delete]} onPress={() => confirmDelete(item)}>
                  <Text style={styles.deleteText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  newButton: {
    minHeight: 46, margin: 16, borderRadius: 12, backgroundColor: "#2563eb",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  newButtonText: { color: "#fff", fontWeight: "900" },
  list: { width: "100%", maxWidth: 850, alignSelf: "center", paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    marginBottom: 12, padding: 12, borderRadius: 15, borderWidth: 1,
    borderColor: "#e2e8f0", backgroundColor: "#fff", flexDirection: "row", gap: 12,
  },
  cover: { width: 92, height: 92, borderRadius: 10, backgroundColor: "#e2e8f0" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  title: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  subtitle: { marginTop: 3, color: "#475569" },
  meta: { marginTop: 5, color: "#94a3b8", fontSize: 13 },
  actions: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 34, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#eff6ff", justifyContent: "center" },
  buttonText: { color: "#1d4ed8", fontWeight: "800" },
  delete: { backgroundColor: "#fef2f2" },
  deleteText: { color: "#b91c1c", fontWeight: "800" },
});

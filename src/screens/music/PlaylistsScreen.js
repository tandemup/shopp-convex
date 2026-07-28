import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function PlaylistsScreen({ navigation, route }) {
  const playlists = useQuery(api.musicPlaylists.listMine);
  const create = useMutation(api.musicPlaylists.create);
  const addTrack = useMutation(api.musicPlaylists.addTrack);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const addPlaylist = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const id = await create({ name: name.trim(), isPublic: false });
      if (route?.params?.addTrackId)
        await addTrack({ playlistId: id, trackId: route.params.addTrackId });
      setName("");
      navigation.navigate(ROUTES.MUSIC_PLAYLIST_DETAIL, { playlistId: id });
    } catch (e) {
      Alert.alert("Playlist", e.message);
    } finally {
      setCreating(false);
    }
  };
  if (playlists === undefined)
    return <ActivityIndicator style={styles.loader} />;
  const choosePlaylist = async (playlist) => {
    if (routeTrackId) {
      await addTrack({ playlistId: playlist._id, trackId: routeTrackId });
    }
    navigation.navigate(ROUTES.MUSIC_PLAYLIST_DETAIL, {
      playlistId: playlist._id,
    });
  };
  const routeTrackId = route?.params?.addTrackId || null;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Ionicons name="musical-notes" size={30} color="#2563eb" />
        <View>
          <Text style={styles.title}>Mis playlists</Text>
          <Text style={styles.subtitle}>
            Crea y comparte tus selecciones musicales
          </Text>
        </View>
      </View>
      <View style={styles.create}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la playlist"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <Pressable
          onPress={addPlaylist}
          disabled={creating || !name.trim()}
          style={styles.createButton}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
      {playlists.length === 0 ? (
        <Text style={styles.empty}>Todavía no tienes playlists.</Text>
      ) : (
        playlists.map((playlist) => (
          <Pressable
            key={playlist._id}
            style={styles.card}
            onPress={() => choosePlaylist(playlist)}
          >
            <Ionicons
              name={
                playlist.isPublic ? "people-outline" : "lock-closed-outline"
              }
              size={25}
              color="#2563eb"
            />
            <View style={styles.info}>
              <Text style={styles.name}>{playlist.name}</Text>
              <Text style={styles.meta}>
                {playlist.tracks} canciones ·{" "}
                {playlist.isPublic ? "Compartida" : "Privada"}
              </Text>
            </View>
            <Ionicons
              name={routeTrackId ? "add-circle-outline" : "chevron-forward"}
              size={21}
              color="#94a3b8"
            />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { maxWidth: 760, width: "100%", alignSelf: "center", padding: 18 },
  loader: { marginTop: 40 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#64748b", marginTop: 3 },
  create: { flexDirection: "row", gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: "#fff",
    outlineStyle: "none",
  },
  createButton: {
    width: 46,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { textAlign: "center", padding: 30, color: "#64748b" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  meta: { marginTop: 4, color: "#64748b", fontSize: 13 },
});

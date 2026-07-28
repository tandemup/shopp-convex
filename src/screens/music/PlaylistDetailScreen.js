import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ROUTES } from "../../navigation/ROUTES";

export default function PlaylistDetailScreen({ navigation, route }) {
  const playlist = useQuery(api.musicPlaylists.get, {
    playlistId: route.params.playlistId,
  });
  const update = useMutation(api.musicPlaylists.update);
  const remove = useMutation(api.musicPlaylists.remove);
  const removeTrack = useMutation(api.musicPlaylists.removeTrack);
  if (playlist === undefined)
    return <ActivityIndicator style={styles.loader} />;
  if (!playlist)
    return <Text style={styles.empty}>Playlist no encontrada.</Text>;
  const share = async () => {
    const url = `shopp://playlist/${playlist.shareToken}`;
    await Share.share({
      message: `Escucha mi playlist “${playlist.name}”: ${url}`,
    });
  };
  const togglePublic = async () => {
    try {
      await update({ playlistId: playlist._id, isPublic: !playlist.isPublic });
    } catch (e) {
      Alert.alert("Playlist", e.message);
    }
  };
  const deletePlaylist = () =>
    Alert.alert("Eliminar playlist", `¿Eliminar “${playlist.name}”?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await remove({ playlistId: playlist._id });
          navigation.goBack();
        },
      },
    ]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons
          name={playlist.isPublic ? "people" : "musical-notes"}
          size={38}
          color="#2563eb"
        />
        <View style={styles.info}>
          <Text style={styles.title}>{playlist.name}</Text>
          <Text style={styles.meta}>
            {playlist.tracks.length} canciones ·{" "}
            {playlist.isPublic ? "Compartida" : "Privada"}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={togglePublic}>
          <Ionicons
            name={
              playlist.isPublic ? "lock-open-outline" : "share-social-outline"
            }
            size={20}
            color="#2563eb"
          />
          <Text style={styles.actionText}>
            {playlist.isPublic ? "Hacer privada" : "Compartir"}
          </Text>
        </Pressable>
        <Pressable style={styles.action} onPress={share}>
          <Ionicons name="link-outline" size={20} color="#2563eb" />
          <Text style={styles.actionText}>Enviar enlace</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={deletePlaylist}>
          <Ionicons name="trash-outline" size={20} color="#dc2626" />
        </Pressable>
      </View>
      {playlist.tracks.length === 0 ? (
        <Text style={styles.empty}>Añade canciones desde el reproductor.</Text>
      ) : (
        playlist.tracks.map((track, index) => (
          <View key={track._id} style={styles.row}>
            <Text style={styles.index}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <View style={styles.track}>
              <Text style={styles.trackTitle}>
                {track.cdTrackTitle || track.title}
              </Text>
              <Text style={styles.meta}>
                {track.albumTitle} · {track.albumArtist}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate(ROUTES.MUSIC_PLAYER, {
                  playlistId: playlist._id,
                  trackId: track._id,
                })
              }
              hitSlop={10}
            >
              <Ionicons name="play-circle-outline" size={27} color="#2563eb" />
            </Pressable>
            <Pressable
              onPress={() =>
                removeTrack({ playlistId: playlist._id, trackId: track._id })
              }
              hitSlop={10}
            >
              <Ionicons
                name="remove-circle-outline"
                size={23}
                color="#94a3b8"
              />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { maxWidth: 760, width: "100%", alignSelf: "center", padding: 18 },
  loader: { marginTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  info: { flex: 1 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  meta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  actions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  action: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: { color: "#2563eb", fontWeight: "700" },
  row: {
    backgroundColor: "#fff",
    borderRadius: 13,
    padding: 13,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  index: { color: "#94a3b8", width: 24 },
  track: { flex: 1 },
  trackTitle: { fontWeight: "700", color: "#0f172a" },
  empty: { textAlign: "center", padding: 30, color: "#64748b" },
});

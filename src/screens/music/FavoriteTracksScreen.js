import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ROUTES } from "../../navigation/ROUTES";

export default function FavoriteTracksScreen({ navigation }) {
  const tracks = useQuery(api.musicFavorites.listMyTracks);
  const removeFavorite = useMutation(api.musicFavorites.remove);

  if (tracks === undefined) return <ActivityIndicator style={styles.loader} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Ionicons name="star" size={28} color="#f59e0b" />
        <View>
          <Text style={styles.title}>Canciones favoritas</Text>
          <Text style={styles.subtitle}>
            {tracks.length} canción{tracks.length === 1 ? "" : "es"}
          </Text>
        </View>
      </View>
      {tracks.length === 0 ? (
        <Text style={styles.empty}>Todavía no tienes canciones favoritas.</Text>
      ) : (
        tracks.map((track) => (
          <View key={track._id} style={styles.row}>
            {track.coverUrl ? (
              <Image source={{ uri: track.coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.placeholder]}>
                <Ionicons name="musical-notes" size={22} color="#64748b" />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {track.cdTrackTitle || track.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {track.albumTitle} · {track.albumArtist}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                navigation.navigate(ROUTES.MUSIC_PLAYER, {
                  albumId: track.albumId,
                  trackId: track._id,
                })
              }
              hitSlop={10}
            >
              <Ionicons name="play-circle-outline" size={27} color="#2563eb" />
            </Pressable>
            <Pressable
              onPress={() => removeFavorite({ trackId: track._id })}
              hitSlop={10}
            >
              <Ionicons name="star" size={22} color="#f59e0b" />
            </Pressable>
          </View>
        ))
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
  loader: { flex: 1, marginTop: 40 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 23, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 3, color: "#64748b" },
  empty: { padding: 28, textAlign: "center", color: "#64748b" },
  row: {
    minHeight: 76,
    marginBottom: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cover: { width: 56, height: 56, borderRadius: 8 },
  placeholder: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  trackTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  meta: { marginTop: 5, fontSize: 12, color: "#64748b" },
});

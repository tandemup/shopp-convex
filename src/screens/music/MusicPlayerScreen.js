import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  background: "#F4F7FB",
  surface: "#FFFFFF",
  text: "#172033",
  muted: "#667085",
  primary: "#2563EB",
  border: "#E4E7EC",
};

// Convex debe devolver estas URLs mediante storage.getUrl(storageId).
const DEFAULT_PLAYLIST = [
  {
    id: "demo-1",
    title: "Canción de ejemplo",
    artist: "Añade una pista desde Convex",
    artworkUrl: null,
    audioUrl: null,
  },
];

export default function MusicPlayerScreen({ navigation, route }) {
  const playlist = route?.params?.playlist?.length
    ? route.params.playlist
    : DEFAULT_PLAYLIST;
  const [trackIndex, setTrackIndex] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const track = playlist[trackIndex] || playlist[0];
  const hasAudio = Boolean(track?.audioUrl);

  const releaseSound = async () => {
    if (!sound) return;
    await sound.unloadAsync();
    setSound(null);
    setIsPlaying(false);
  };

  useEffect(
    () => () => {
      if (sound) sound.unloadAsync();
    },
    [sound],
  );

  useEffect(() => {
    releaseSound();
  }, [trackIndex]);

  const togglePlayback = async () => {
    if (!hasAudio) return;

    if (!sound) {
      const result = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true },
      );
      setSound(result.sound);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const selectTrack = async (index) => {
    await releaseSound();
    setTrackIndex(index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Reproductor de música</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={playlist}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {track?.artworkUrl ? (
              <Image
                source={{ uri: track.artworkUrl }}
                style={styles.artwork}
              />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]}>
                <Ionicons name="musical-notes" size={86} color="#FFFFFF" />
                <Text style={styles.artworkPlaceholderText}>Shopp Music</Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {track?.title || "Sin título"}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {track?.artist || "Artista desconocido"}
            </Text>

            {!hasAudio && (
              <Text style={styles.notice}>
                Esta pista todavía no tiene una URL MP3 de Convex File Storage.
              </Text>
            )}

            <View style={styles.controls}>
              <Pressable
                onPress={() => selectTrack(Math.max(0, trackIndex - 1))}
                hitSlop={10}
              >
                <Ionicons name="play-skip-back" size={28} color={COLORS.text} />
              </Pressable>
              <Pressable onPress={togglePlayback} style={styles.playButton}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={30}
                  color="#FFFFFF"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  selectTrack(Math.min(playlist.length - 1, trackIndex + 1))
                }
                hitSlop={10}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={28}
                  color={COLORS.text}
                />
              </Pressable>
            </View>

            <Text style={styles.playlistTitle}>Playlist</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => selectTrack(index)}
            style={[
              styles.trackRow,
              index === trackIndex && styles.trackRowActive,
            ]}
          >
            <Text style={styles.trackNumber}>{index + 1}</Text>
            <View style={styles.trackText}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.artist || ""}
              </Text>
            </View>
            {index === trackIndex && (
              <Ionicons name="volume-medium" size={19} color={COLORS.primary} />
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSpacer: { width: 24 },
  content: { padding: 20, paddingBottom: 40 },
  artwork: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },
  artworkPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  artworkPlaceholderText: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  title: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  artist: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 14,
    color: COLORS.muted,
  },
  notice: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginVertical: 22,
  },
  playButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  playlistTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  trackRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trackRowActive: { backgroundColor: "#EAF2FF" },
  trackNumber: {
    width: 28,
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  trackText: { flex: 1 },
  trackTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  trackArtist: { marginTop: 3, color: COLORS.muted, fontSize: 12 },
});

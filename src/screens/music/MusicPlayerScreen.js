import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AlbumSearchBar from "../../components/music/AlbumSearchBar";

function formatMillis(value) {
  const totalSeconds = Math.max(0, Math.floor((value || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MusicPlayerScreen() {
  const albums = useQuery(api.musicAlbums.listPublished) || [];

  const [searchText, setSearchText] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [status, setStatus] = useState({
    isLoaded: false,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });
  const [playerError, setPlayerError] = useState("");

  const soundRef = useRef(null);

  const album = useQuery(
    api.musicAlbums.getPublishedWithTracks,
    selectedAlbumId ? { albumId: selectedAlbumId } : "skip",
  );

  const filteredAlbums = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase("es");

    if (!search) return albums;

    return albums.filter((item) => {
      const searchable =
        `${item.title} ${item.artist} ${item.genre || ""}`.toLocaleLowerCase(
          "es",
        );

      return searchable.includes(search);
    });
  }, [albums, searchText]);

  const currentTrack = album?.tracks?.[currentTrackIndex] || null;

  const unloadSound = async () => {
    const sound = soundRef.current;
    soundRef.current = null;

    if (sound) {
      await sound.unloadAsync().catch(() => {});
    }

    setStatus({
      isLoaded: false,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
    });
  };

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      unloadSound();
    };
  }, []);

  useEffect(() => {
    setCurrentTrackIndex(0);
    unloadSound();
  }, [selectedAlbumId]);

  const loadTrack = async (trackIndex, shouldPlay = true) => {
    const track = album?.tracks?.[trackIndex];

    if (!track?.audioUrl) return;

    setPlayerError("");
    await unloadSound();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        {
          shouldPlay,
          progressUpdateIntervalMillis: 500,
        },
        (nextStatus) => {
          if (!nextStatus.isLoaded) {
            if (nextStatus.error) {
              setPlayerError(nextStatus.error);
            }
            return;
          }

          setStatus({
            isLoaded: true,
            isPlaying: nextStatus.isPlaying,
            positionMillis: nextStatus.positionMillis || 0,
            durationMillis: nextStatus.durationMillis || 0,
          });

          if (nextStatus.didJustFinish && !nextStatus.isLooping) {
            const nextIndex = trackIndex + 1;

            if (nextIndex < (album?.tracks?.length || 0)) {
              setCurrentTrackIndex(nextIndex);
              loadTrack(nextIndex, true);
            }
          }
        },
      );

      soundRef.current = sound;
      setCurrentTrackIndex(trackIndex);
    } catch (error) {
      console.error("Error cargando pista:", error);
      setPlayerError(error?.message || "No se pudo reproducir la pista.");
    }
  };

  const togglePlayback = async () => {
    if (!currentTrack) return;

    if (!soundRef.current || !status.isLoaded) {
      await loadTrack(currentTrackIndex, true);
      return;
    }

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const playPrevious = async () => {
    const previous = Math.max(0, currentTrackIndex - 1);
    await loadTrack(previous, true);
  };

  const playNext = async () => {
    const lastIndex = Math.max(0, (album?.tracks?.length || 1) - 1);
    const next = Math.min(lastIndex, currentTrackIndex + 1);
    await loadTrack(next, true);
  };

  if (selectedAlbumId && album === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando álbum...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AlbumSearchBar value={searchText} onChangeText={setSearchText} />

      {!selectedAlbumId ? (
        <FlatList
          data={filteredAlbums}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.albumList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No hay álbumes</Text>
              <Text style={styles.emptyText}>
                Prueba con otro título, artista o género.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.albumCard}
              onPress={() => setSelectedAlbumId(item._id)}
            >
              {item.coverUrl ? (
                <Image
                  source={{ uri: item.coverUrl }}
                  style={styles.albumCover}
                />
              ) : (
                <View style={[styles.albumCover, styles.coverPlaceholder]}>
                  <Ionicons name="musical-notes" size={28} color="#64748b" />
                </View>
              )}

              <View style={styles.flex}>
                <Text style={styles.albumTitle}>{item.title}</Text>
                <Text style={styles.albumArtist}>{item.artist}</Text>
                <Text style={styles.albumMeta}>
                  {item.trackCount} pistas
                  {item.genre ? ` · ${item.genre}` : ""}
                  {item.year ? ` · ${item.year}` : ""}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.playerLayout}>
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedAlbumId(null)}
          >
            <Ionicons name="arrow-back" size={20} color="#1d4ed8" />
            <Text style={styles.backText}>Álbumes</Text>
          </Pressable>

          <View style={styles.albumHeader}>
            {album?.coverUrl ? (
              <Image
                source={{ uri: album.coverUrl }}
                style={styles.largeCover}
              />
            ) : (
              <View style={[styles.largeCover, styles.coverPlaceholder]}>
                <Ionicons name="musical-notes" size={42} color="#64748b" />
              </View>
            )}

            <View style={styles.flex}>
              <Text style={styles.selectedTitle}>{album?.title}</Text>
              <Text style={styles.selectedArtist}>{album?.artist}</Text>
              <Text style={styles.albumMeta}>
                {album?.tracks?.length || 0} pistas
              </Text>
            </View>
          </View>

          <FlatList
            data={album?.tracks || []}
            keyExtractor={(item) => String(item._id)}
            style={styles.trackList}
            contentContainerStyle={styles.trackListContent}
            renderItem={({ item, index }) => {
              const active = index === currentTrackIndex;

              return (
                <Pressable
                  style={[styles.trackItem, active && styles.trackItemActive]}
                  onPress={() => loadTrack(index, true)}
                >
                  <Text
                    style={[
                      styles.trackIndex,
                      active && styles.trackTextActive,
                    ]}
                  >
                    {String(item.trackNumber).padStart(2, "0")}
                  </Text>

                  <View style={styles.flex}>
                    <Text
                      style={[
                        styles.trackTitle,
                        active && styles.trackTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {item.artist || album?.artist}
                    </Text>
                  </View>

                  {active && status.isPlaying ? (
                    <Ionicons name="volume-high" size={19} color="#2563eb" />
                  ) : (
                    <Ionicons name="play-outline" size={19} color="#64748b" />
                  )}
                </Pressable>
              );
            }}
          />

          <View style={styles.controls}>
            <View style={styles.nowPlaying}>
              <Text style={styles.nowPlayingLabel}>Reproduciendo</Text>
              <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                {currentTrack?.title || "Selecciona una pista"}
              </Text>
              <Text style={styles.timeText}>
                {formatMillis(status.positionMillis)} /{" "}
                {formatMillis(status.durationMillis)}
              </Text>
              {playerError ? (
                <Text style={styles.errorText}>{playerError}</Text>
              ) : null}
            </View>

            <View style={styles.buttonsRow}>
              <Pressable
                style={styles.controlButton}
                onPress={playPrevious}
                disabled={!currentTrack}
              >
                <Ionicons name="play-skip-back" size={24} color="#0f172a" />
              </Pressable>

              <Pressable
                style={styles.playButton}
                onPress={togglePlayback}
                disabled={!currentTrack}
              >
                <Ionicons
                  name={status.isPlaying ? "pause" : "play"}
                  size={30}
                  color="#ffffff"
                />
              </Pressable>

              <Pressable
                style={styles.controlButton}
                onPress={playNext}
                disabled={!currentTrack}
              >
                <Ionicons name="play-skip-forward" size={24} color="#0f172a" />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
  },
  albumList: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  albumCard: {
    minHeight: 92,
    marginBottom: 10,
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  albumCover: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  albumTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },
  albumArtist: {
    marginTop: 3,
    color: "#475569",
    fontSize: 15,
  },
  albumMeta: {
    marginTop: 5,
    color: "#94a3b8",
    fontSize: 13,
  },
  empty: {
    paddingTop: 80,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    color: "#334155",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 5,
    color: "#64748b",
  },
  playerLayout: {
    flex: 1,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  albumHeader: {
    marginVertical: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  largeCover: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  selectedTitle: {
    color: "#0f172a",
    fontSize: 23,
    fontWeight: "900",
  },
  selectedArtist: {
    marginTop: 5,
    color: "#475569",
    fontSize: 17,
  },
  trackList: {
    flex: 1,
  },
  trackListContent: {
    paddingBottom: 12,
  },
  trackItem: {
    minHeight: 58,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackItemActive: {
    backgroundColor: "#eff6ff",
  },
  trackIndex: {
    width: 28,
    color: "#64748b",
    fontWeight: "800",
  },
  trackTitle: {
    color: "#0f172a",
    fontWeight: "800",
  },
  trackArtist: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
  },
  trackTextActive: {
    color: "#1d4ed8",
  },
  controls: {
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  nowPlaying: {
    alignItems: "center",
  },
  nowPlayingLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  nowPlayingTitle: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  timeText: {
    marginTop: 4,
    color: "#64748b",
    fontVariant: ["tabular-nums"],
  },
  errorText: {
    marginTop: 5,
    color: "#b91c1c",
    fontSize: 12,
  },
  buttonsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
});

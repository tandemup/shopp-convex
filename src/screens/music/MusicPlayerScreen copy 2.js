import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function formatMillis(value) {
  const totalSeconds = Math.max(0, Math.floor((value || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeLyrics(lyrics) {
  if (Array.isArray(lyrics)) {
    return lyrics
      .filter((line) => line && typeof line.text === "string")
      .map((line) => ({
        timeMs: Number(line.timeMs) || 0,
        text: line.text.trim(),
      }))
      .filter((line) => line.text)
      .sort((a, b) => a.timeMs - b.timeMs);
  }

  if (typeof lyrics !== "string") return [];

  return lyrics
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
      if (!match || !match[4].trim()) return [];

      const fraction = (match[3] || "0").padEnd(3, "0");
      return [
        {
          timeMs:
            (Number(match[1]) * 60 + Number(match[2])) * 1000 +
            Number(fraction),
          text: match[4].trim(),
        },
      ];
    })
    .sort((a, b) => a.timeMs - b.timeMs);
}

export default function MusicPlayerScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isCompactMobile = width < 420;

  // Acepta ambos nombres para evitar una pantalla de carga infinita si la
  // pantalla anterior navega pasando `id` en lugar de `albumId`.
  const selectedAlbumId = route?.params?.albumId || route?.params?.id || null;
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [status, setStatus] = useState({
    isLoaded: false,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });
  const [playerError, setPlayerError] = useState("");
  const [showTrackList, setShowTrackList] = useState(true);
  const [showLyrics, setShowLyrics] = useState(true);
  const [favoriteTracks, setFavoriteTracks] = useState(() => new Set());
  const [albumLoadTimedOut, setAlbumLoadTimedOut] = useState(false);

  const soundRef = useRef(null);
  const lyricsScrollRef = useRef(null);
  const lyricLineLayoutsRef = useRef({});
  const lastScrolledLyricRef = useRef(-1);
  const loadingTrackRef = useRef(false);
  const loadRequestRef = useRef(0);
  const mountedRef = useRef(true);

  const album = useQuery(
    api.musicAlbums.getPublishedWithTracks,
    selectedAlbumId ? { albumId: selectedAlbumId } : "skip",
  );
  const favoriteTrackIds = useQuery(api.musicFavorites.listMyFavoriteTrackIds);
  const addFavorite = useMutation(api.musicFavorites.add);
  const removeFavorite = useMutation(api.musicFavorites.remove);

  useEffect(() => {
    if (Array.isArray(favoriteTrackIds)) {
      setFavoriteTracks(new Set(favoriteTrackIds));
    }
  }, [favoriteTrackIds]);

  // Evita dejar la pantalla bloqueada indefinidamente si Convex no responde.
  useEffect(() => {
    setAlbumLoadTimedOut(false);
    if (!selectedAlbumId || album !== undefined) return undefined;

    const timer = setTimeout(() => setAlbumLoadTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [selectedAlbumId, album]);

  const currentTrack = album?.tracks?.[currentTrackIndex] || null;
  const progressPercent = useMemo(() => {
    const duration = Number(status.durationMillis) || 0;
    const position = Number(status.positionMillis) || 0;

    if (duration <= 0) return 0;
    return Math.min(100, Math.max(0, (position / duration) * 100));
  }, [status.positionMillis, status.durationMillis]);
  const currentLyrics = useMemo(
    () => normalizeLyrics(currentTrack?.lyrics),
    [currentTrack?.lyrics],
  );
  const currentLyricIndex = useMemo(() => {
    let index = -1;
    currentLyrics.forEach((line, lineIndex) => {
      if (line.timeMs <= (status.positionMillis || 0)) index = lineIndex;
    });
    return index;
  }, [currentLyrics, status.positionMillis]);

  useEffect(() => {
    lastScrolledLyricRef.current = -1;
    lyricLineLayoutsRef.current = {};
    lyricsScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentTrack?.audioStorageId]);

  useEffect(() => {
    if (
      currentLyricIndex < 0 ||
      currentLyricIndex === lastScrolledLyricRef.current
    ) {
      return;
    }

    const layout = lyricLineLayoutsRef.current[currentLyricIndex];
    if (!layout) return;

    lastScrolledLyricRef.current = currentLyricIndex;
    lyricsScrollRef.current?.scrollTo({
      y: Math.max(0, layout.y - 28),
      animated: true,
    });
  }, [currentLyricIndex]);

  const unloadSound = async (invalidateRequest = true) => {
    if (invalidateRequest) {
      loadRequestRef.current += 1;
    }

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
      mountedRef.current = false;
      unloadSound();
    };
  }, []);

  useEffect(() => {
    setCurrentTrackIndex(0);
    unloadSound();
  }, [selectedAlbumId]);

  useEffect(() => {
    const requestedTrackId = route?.params?.trackId;
    if (!requestedTrackId || !album?.tracks?.length) return;
    const requestedIndex = album.tracks.findIndex(
      (track) => String(track._id) === String(requestedTrackId),
    );
    if (requestedIndex >= 0) setCurrentTrackIndex(requestedIndex);
  }, [album?.tracks, route?.params?.trackId]);

  const loadTrack = async (trackIndex, shouldPlay = true) => {
    const track = album?.tracks?.[trackIndex];

    if (!track?.audioUrl || loadingTrackRef.current) return;

    loadingTrackRef.current = true;
    const requestId = ++loadRequestRef.current;
    setPlayerError("");

    try {
      // Detener y liberar completamente la pista anterior antes de crear otra.
      await unloadSound(false);

      if (!mountedRef.current || requestId !== loadRequestRef.current) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        {
          shouldPlay,
          progressUpdateIntervalMillis: 500,
        },
        (nextStatus) => {
          // Un callback de una carga anterior puede llegar después de unloadAsync.
          if (!mountedRef.current || requestId !== loadRequestRef.current) {
            return;
          }

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
              // El bloqueo evita que el callback de finalización se solape
              // con un cambio manual de pista.
              loadingTrackRef.current = false;
              loadTrack(nextIndex, true);
            }
          }
        },
      );

      if (!mountedRef.current || requestId !== loadRequestRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;
      setCurrentTrackIndex(trackIndex);
    } catch (error) {
      console.error("Error cargando pista:", error);
      if (mountedRef.current && requestId === loadRequestRef.current) {
        setPlayerError(error?.message || "No se pudo reproducir la pista.");
      }
    } finally {
      loadingTrackRef.current = false;
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
      if (mountedRef.current) {
        setStatus((previous) => ({ ...previous, isPlaying: false }));
      }
    } else {
      await soundRef.current.playAsync();
      if (mountedRef.current) {
        setStatus((previous) => ({ ...previous, isPlaying: true }));
      }
    }
  };

  // Pulsar la pista activa alterna play/stop; una pista diferente se carga
  // y comienza desde el principio. Así el icono de cada fila coincide con
  // el estado real del reproductor.
  const handleTrackPress = async (index) => {
    if (index === currentTrackIndex) {
      await togglePlayback();
      return;
    }

    await loadTrack(index, true);
  };

  const toggleTrackFavorite = async (trackId) => {
    if (!trackId) return;

    const wasFavorite = favoriteTracks.has(trackId);
    setFavoriteTracks((previous) => {
      const next = new Set(previous);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
    try {
      if (wasFavorite) await removeFavorite({ trackId });
      else await addFavorite({ trackId });
    } catch (error) {
      setFavoriteTracks((previous) => {
        const next = new Set(previous);
        wasFavorite ? next.add(trackId) : next.delete(trackId);
        return next;
      });
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

  const renderTrackItem = ({ item, index }) => {
    const active = index === currentTrackIndex;

    return (
      <Pressable
        style={[styles.trackItem, active && styles.trackItemActive]}
        onPress={() => handleTrackPress(index)}
      >
        <Text style={[styles.trackIndex, active && styles.trackTextActive]}>
          {String(
            item.discTrackNumber || item.trackNumber || index + 1,
          ).padStart(2, "0")}
        </Text>

        <View style={styles.flex}>
          <Text
            style={[styles.trackTitle, active && styles.trackTextActive]}
            numberOfLines={1}
          >
            {item.cdTrackTitle || item.trackTitle || item.title}
          </Text>

          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.title && item.title !== (item.cdTrackTitle || item.trackTitle)
              ? item.title
              : album?.artist}
          </Text>
        </View>

        <Pressable
          style={styles.favoriteButton}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            toggleTrackFavorite(item._id);
          }}
          accessibilityRole="button"
          accessibilityLabel={
            favoriteTracks.has(item._id)
              ? "Quitar canción de favoritos"
              : "Añadir canción a favoritos"
          }
        >
          <Ionicons
            name={favoriteTracks.has(item._id) ? "star" : "star-outline"}
            size={21}
            color={favoriteTracks.has(item._id) ? "#f59e0b" : "#94a3b8"}
          />
        </Pressable>

        {active && status.isPlaying ? (
          <Ionicons name="volume-high" size={19} color="#2563eb" />
        ) : (
          <Ionicons name="play-outline" size={19} color="#64748b" />
        )}
      </Pressable>
    );
  };

  const renderBackButton = () => (
    <Pressable style={styles.backButton} onPress={() => navigation?.goBack?.()}>
      <Ionicons name="arrow-back" size={20} color="#1d4ed8" />
      <Text style={styles.backText}>Álbumes</Text>
    </Pressable>
  );

  const renderAlbumHeader = () => (
    <View style={[styles.albumHeader, !isDesktop && styles.albumHeaderMobile]}>
      {album?.coverUrl ? (
        <Image
          source={{ uri: album.coverUrl }}
          style={[
            styles.largeCover,
            !isDesktop && styles.largeCoverMobile,
            isCompactMobile && styles.largeCoverCompact,
          ]}
        />
      ) : (
        <View
          style={[
            styles.largeCover,
            styles.coverPlaceholder,
            !isDesktop && styles.largeCoverMobile,
            isCompactMobile && styles.largeCoverCompact,
          ]}
        >
          <Ionicons name="musical-notes" size={42} color="#64748b" />
        </View>
      )}

      <View style={[styles.albumInfo, !isDesktop && styles.albumInfoMobile]}>
        <Text
          style={[
            styles.selectedTitle,
            isCompactMobile && styles.selectedTitleCompact,
          ]}
        >
          {album?.title}
        </Text>

        <Text style={styles.selectedArtist}>{album?.artist}</Text>

        <Text style={styles.albumMeta}>
          {album?.tracks?.length || 0} pistas
          {album?.genre ? ` · ${album.genre}` : ""}
          {album?.year ? ` · ${album.year}` : ""}
        </Text>
      </View>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controls}>
      <View style={styles.nowPlaying}>
        <Text style={styles.nowPlayingLabel}>Reproduciendo</Text>

        <Text style={styles.nowPlayingTitle} numberOfLines={2}>
          {currentTrack?.cdTrackTitle ||
            currentTrack?.trackTitle ||
            currentTrack?.title ||
            "Selecciona una pista"}
        </Text>

        {currentTrack?.title &&
        currentTrack?.title !==
          (currentTrack?.cdTrackTitle || currentTrack?.trackTitle) ? (
          <Text style={styles.nowPlayingWork} numberOfLines={2}>
            {currentTrack.title}
          </Text>
        ) : null}

        <Text style={styles.timeText}>
          {formatMillis(status.positionMillis)} /{" "}
          {formatMillis(status.durationMillis)}
        </Text>

        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progressPercent),
          }}
        >
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        {playerError ? (
          <Text style={styles.errorText}>{playerError}</Text>
        ) : null}

        {showLyrics ? (
          <View style={styles.lyricsContainer}>
            <Text style={styles.lyricsTitle}>Letra</Text>
            {currentLyrics.length ? (
              <ScrollView
                ref={lyricsScrollRef}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                contentContainerStyle={styles.lyricsContent}
              >
                {currentLyrics.map((line, index) => (
                  <Text
                    key={`${line.timeMs}-${index}`}
                    onLayout={(event) => {
                      lyricLineLayoutsRef.current[index] =
                        event.nativeEvent.layout;
                      if (
                        index === currentLyricIndex &&
                        lastScrolledLyricRef.current < 0
                      ) {
                        lyricsScrollRef.current?.scrollTo({
                          y: Math.max(0, event.nativeEvent.layout.y - 28),
                          animated: false,
                        });
                        lastScrolledLyricRef.current = index;
                      }
                    }}
                    style={[
                      styles.lyricLine,
                      index === currentLyricIndex && styles.activeLyricLine,
                    ]}
                  >
                    {line.text}
                  </Text>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noLyricsText}>
                No hay letra disponible para esta pista.
              </Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          style={styles.playerToggle}
          onPress={() => setShowLyrics((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showLyrics ? "Ocultar letra" : "Mostrar letra"}
        >
          <Ionicons
            name={
              showLyrics ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
            }
            size={21}
            color="#1d4ed8"
          />
        </Pressable>

        <Pressable
          style={[styles.controlButton, !currentTrack && styles.disabledButton]}
          onPress={playPrevious}
          disabled={!currentTrack}
        >
          <Ionicons name="play-skip-back" size={24} color="#0f172a" />
        </Pressable>

        <Pressable
          style={[styles.playButton, !currentTrack && styles.disabledButton]}
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
          style={[styles.controlButton, !currentTrack && styles.disabledButton]}
          onPress={playNext}
          disabled={!currentTrack}
        >
          <Ionicons name="play-skip-forward" size={24} color="#0f172a" />
        </Pressable>

        <Pressable
          style={styles.playerToggle}
          onPress={() => setShowTrackList((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={
            showTrackList
              ? "Ocultar lista de canciones"
              : "Mostrar lista de canciones"
          }
        >
          <Ionicons
            name={showTrackList ? "list" : "list-outline"}
            size={22}
            color="#1d4ed8"
          />
        </Pressable>
      </View>
    </View>
  );

  const renderTrackPanelHeader = () => (
    <View style={styles.trackPanelHeader}>
      <Text style={styles.trackPanelTitle}>Pistas</Text>
      <Text style={styles.trackPanelCount}>{album?.tracks?.length || 0}</Text>
    </View>
  );

  if (!selectedAlbumId) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color="#64748b" />
        <Text style={styles.loadingText}>No se ha indicado ningún álbum.</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={styles.backText}>Volver a la biblioteca</Text>
        </Pressable>
      </View>
    );
  }

  if (album === undefined && !albumLoadTimedOut) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando álbum...</Text>
      </View>
    );
  }

  if (album === null || albumLoadTimedOut) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color="#64748b" />
        <Text style={styles.loadingText}>
          {albumLoadTimedOut
            ? "No se pudo cargar el álbum."
            : "El álbum no existe o no está publicado."}
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={styles.backText}>Volver a la biblioteca</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isDesktop ? (
        <ScrollView
          style={styles.desktopScroll}
          contentContainerStyle={styles.desktopScrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <View style={styles.playerLayout}>
            {renderBackButton()}

            <View style={styles.responsivePlayer}>
              <View style={styles.playerSidebar}>
                {renderAlbumHeader()}
                {renderControls()}
              </View>

              {showTrackList ? (
                <View style={styles.trackPanel}>
                  {renderTrackPanelHeader()}

                  <FlatList
                    data={album?.tracks || []}
                    keyExtractor={(item) => String(item._id)}
                    style={styles.trackList}
                    contentContainerStyle={styles.trackListContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderTrackItem}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={showTrackList ? album?.tracks || [] : []}
          keyExtractor={(item) => String(item._id)}
          style={styles.mobilePlayerList}
          contentContainerStyle={styles.mobilePlayerListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.mobilePlayerHeader}>
              {renderBackButton()}
              {renderAlbumHeader()}
              {renderControls()}
              {showTrackList ? (
                <View style={styles.mobileTrackPanel}>
                  {renderTrackPanelHeader()}
                </View>
              ) : null}
            </View>
          }
          renderItem={renderTrackItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
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
    paddingBottom: 120,
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
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  desktopScroll: {
    flex: 1,
    width: "100%",
  },
  desktopScrollContent: {
    flexGrow: 1,
    width: "100%",
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
    marginVertical: 6,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  largeCover: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  selectedTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
  },
  selectedArtist: {
    marginTop: 3,
    color: "#475569",
    fontSize: 15,
  },
  trackList: {
    flex: 1,
    minHeight: 0,
  },
  trackListContent: {
    paddingBottom: 24,
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
    position: "relative",
    marginTop: 4,
    marginBottom: 6,
    padding: 10,
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
    textAlign: "center",
  },
  timeText: {
    marginTop: 4,
    color: "#64748b",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    width: "100%",
    height: 3,
    marginTop: 7,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#2563eb",
  },
  errorText: {
    marginTop: 5,
    color: "#b91c1c",
    fontSize: 12,
  },
  lyricsContainer: {
    width: "100%",
    maxHeight: 125,
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  lyricsTitle: {
    marginBottom: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  lyricsContent: {
    paddingVertical: 2,
  },
  lyricLine: {
    paddingVertical: 2,
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 17,
    textAlign: "center",
  },
  activeLyricLine: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "800",
  },
  noLyricsText: {
    paddingVertical: 10,
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
  buttonsRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  playerToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  responsivePlayer: {
    // Altura suficiente para mostrar album, letra, progreso y controles
    // sin que el reproductor recorte la parte inferior.
    height: 540,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    alignSelf: "center",
    gap: 18,
    paddingBottom: 8,
  },
  playerSidebar: {
    width: 340,
    height: 540,
    flexShrink: 0,
    padding: 0,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  albumHeaderMobile: {
    flexDirection: "column",
    textAlign: "center",
  },
  albumInfo: {
    flex: 1,
    minWidth: 0,
  },
  albumInfoMobile: {
    width: "100%",
    alignItems: "center",
  },
  largeCoverMobile: {
    width: 200,
    height: 200,
    maxWidth: "100%",
  },
  largeCoverCompact: {
    width: 160,
    height: 160,
  },
  selectedTitleCompact: {
    fontSize: 20,
  },
  trackPanel: {
    width: 280,
    height: 540,
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  trackPanelHeader: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackPanelTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  trackPanelCount: {
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
  },
  nowPlayingWork: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.45,
  },
  mobilePlayerList: {
    flex: 1,
    width: "100%",
  },
  mobilePlayerListContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  mobilePlayerHeader: {
    width: "100%",
  },
  mobileTrackPanel: {
    marginTop: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
});

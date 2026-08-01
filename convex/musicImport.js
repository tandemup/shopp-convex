import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== "string") {
    return undefined;
  }

  return lrcText
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/);

      if (!match) return null;

      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] || "0";

      const milliseconds =
        fraction.length === 1
          ? Number(fraction) * 100
          : fraction.length === 2
            ? Number(fraction) * 10
            : Number(fraction);

      return {
        timeMs: minutes * 60 * 1000 + seconds * 1000 + milliseconds,
        text: match[4].trim(),
      };
    })
    .filter((line) => line && line.text)
    .sort((a, b) => a.timeMs - b.timeMs);
}

export const importAlbumFromJson = mutation({
  args: {
    album: v.object({
      title: v.string(),
      composer: v.optional(v.string()),
      artist: v.optional(v.string()),
      genre: v.optional(v.string()),
      year: v.optional(v.number()),
      description: v.optional(v.string()),
    }),

    cover: v.object({
      storageId: v.optional(v.id("_storage")),
      coverUrl: v.optional(v.string()),
      filename: v.string(),
      mimeType: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
    }),

    tracks: v.array(
      v.object({
        trackNumber: v.number(),
        title: v.string(),
        artist: v.optional(v.string()),

        audioStorageId: v.optional(v.id("_storage")),
        audioUrl: v.optional(v.string()),
        audioFilename: v.string(),
        audioMimeType: v.optional(v.string()),
        audioSizeBytes: v.optional(v.number()),
        durationMs: v.optional(v.number()),
        lyrics: v.optional(
          v.array(
            v.object({
              timeMs: v.number(),
              text: v.string(),
            }),
          ),
        ),
        lyricsLrc: v.optional(v.string()),
      }),
    ),
  },

  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (!args.album.title.trim()) {
      throw new Error("El título del álbum es obligatorio.");
    }

    if (args.tracks.length === 0) {
      throw new Error("El álbum debe contener al menos una pista.");
    }

    const coverUrl = args.cover.coverUrl?.trim();
    if (!args.cover.storageId && !coverUrl) {
      throw new Error("El álbum necesita coverUrl o storageId.");
    }
    if (args.cover.storageId) {
      const coverMetadata = await ctx.db.system.get(
        "_storage",
        args.cover.storageId,
      );
      if (!coverMetadata)
        throw new Error(
          `No existe la carátula ${args.cover.storageId} en File Storage.`,
        );
    }

    const orderedTracks = [...args.tracks].sort(
      (a, b) => a.trackNumber - b.trackNumber,
    );

    const storageIds = new Set();

    for (let index = 0; index < orderedTracks.length; index += 1) {
      const track = orderedTracks[index];

      if (track.trackNumber !== index + 1) {
        throw new Error(
          "Las pistas deben estar numeradas consecutivamente desde 1.",
        );
      }

      if (!track.title.trim()) {
        throw new Error(`La pista ${track.trackNumber} no tiene título.`);
      }

      const audioUrl = track.audioUrl?.trim();
      if (!track.audioStorageId && !audioUrl) {
        throw new Error(
          `La pista ${track.trackNumber} necesita audioUrl o audioStorageId.`,
        );
      }

      const id = track.audioStorageId
        ? `storage:${String(track.audioStorageId)}`
        : `url:${audioUrl}`;

      if (storageIds.has(id)) {
        throw new Error(
          `El archivo de la pista ${track.trackNumber} está repetido.`,
        );
      }

      storageIds.add(id);

      if (track.audioStorageId) {
        const metadata = await ctx.db.system.get(
          "_storage",
          track.audioStorageId,
        );
        if (!metadata) {
          throw new Error(
            `No existe el archivo de la pista ${track.trackNumber} en File Storage.`,
          );
        }
      }
    }

    const now = Date.now();

    const albumId = await ctx.db.insert("musicAlbums", {
      title: args.album.title.trim(),
      composer: args.album.composer?.trim() || undefined,
      artist: args.album.artist?.trim() || undefined,
      genre: args.album.genre?.trim() || undefined,
      year: args.album.year,
      description: args.album.description?.trim() || undefined,

      coverStorageId: args.cover.storageId,
      coverUrl: coverUrl || undefined,
      coverFilename: args.cover.filename,
      coverMimeType: args.cover.mimeType,
      coverSizeBytes: args.cover.sizeBytes,

      expectedTrackCount: orderedTracks.length,
      trackCount: orderedTracks.length,
      status: "hidden",

      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });

    for (const track of orderedTracks) {
      await ctx.db.insert("musicTracks", {
        albumId,

        title: track.title.trim(),
        artist: track.artist?.trim() || undefined,
        trackNumber: track.trackNumber,

        audioStorageId: track.audioStorageId,
        audioUrl: track.audioUrl?.trim() || undefined,
        audioFilename: track.audioFilename,
        audioMimeType: track.audioMimeType,
        audioSizeBytes: track.audioSizeBytes,
        durationMs: track.durationMs,

        lyrics: track.lyrics || parseLrc(track.lyricsLrc),

        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      albumId,
      importedTracks: orderedTracks.length,
    };
  },
});

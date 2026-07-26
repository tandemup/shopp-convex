import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

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
      storageId: v.id("_storage"),
      filename: v.string(),
      mimeType: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
    }),

    tracks: v.array(
      v.object({
        trackNumber: v.number(),
        title: v.string(),
        artist: v.optional(v.string()),

        audioStorageId: v.id("_storage"),
        audioFilename: v.string(),
        audioMimeType: v.optional(v.string()),
        audioSizeBytes: v.optional(v.number()),
        durationMs: v.optional(v.number()),
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

    const coverMetadata = await ctx.db.system.get(
      "_storage",
      args.cover.storageId,
    );

    if (!coverMetadata) {
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

      const id = String(track.audioStorageId);

      if (storageIds.has(id)) {
        throw new Error(
          `El archivo de la pista ${track.trackNumber} está repetido.`,
        );
      }

      storageIds.add(id);

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

    const now = Date.now();

    const albumId = await ctx.db.insert("musicAlbums", {
      title: args.album.title.trim(),
      composer: args.album.composer?.trim() || undefined,
      artist: args.album.artist?.trim() || undefined,
      genre: args.album.genre?.trim() || undefined,
      year: args.album.year,
      description: args.album.description?.trim() || undefined,

      coverStorageId: args.cover.storageId,
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
        audioFilename: track.audioFilename,
        audioMimeType: track.audioMimeType,
        audioSizeBytes: track.audioSizeBytes,
        durationMs: track.durationMs,

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

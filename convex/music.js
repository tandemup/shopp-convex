import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createAlbumDraft = mutation({
  args: {
    title: v.string(),
    composer: v.optional(v.string()),
    artist: v.optional(v.string()),
    genre: v.optional(v.string()),
    year: v.optional(v.number()),
    description: v.optional(v.string()),
    expectedTrackCount: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const userId = admin._id;

    if (!args.title.trim()) {
      throw new Error("El título del álbum es obligatorio.");
    }

    const expectedTrackCount = Math.floor(args.expectedTrackCount);

    if (expectedTrackCount < 1 || expectedTrackCount > 20) {
      throw new Error("Selecciona entre 1 y 20 pistas.");
    }

    const now = Date.now();

    return await ctx.db.insert("musicAlbums", {
      title: args.title.trim(),
      composer: args.composer?.trim() || undefined,
      artist: args.artist?.trim() || undefined,
      genre: args.genre?.trim() || undefined,
      year: args.year,
      description: args.description?.trim() || undefined,

      expectedTrackCount,
      trackCount: 0,
      status: "draft",

      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setAlbumCover = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    coverStorageId: v.id("_storage"),
    coverFilename: v.string(),
    coverMimeType: v.optional(v.string()),
    coverSizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    const oldCoverStorageId = album.coverStorageId;

    await ctx.db.patch(args.albumId, {
      coverStorageId: args.coverStorageId,
      coverFilename: args.coverFilename,
      coverMimeType: args.coverMimeType,
      coverSizeBytes: args.coverSizeBytes,
      updatedAt: Date.now(),
    });

    if (oldCoverStorageId && oldCoverStorageId !== args.coverStorageId) {
      await ctx.storage.delete(oldCoverStorageId);
    }
  },
});

export const saveTrack = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    title: v.string(),
    artist: v.optional(v.string()),
    trackNumber: v.number(),

    audioStorageId: v.id("_storage"),
    audioFilename: v.string(),
    audioMimeType: v.optional(v.string()),
    audioSizeBytes: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    if (album.status === "published") {
      throw new Error("No se pueden añadir pistas a un álbum publicado.");
    }

    const trackNumber = Math.floor(args.trackNumber);

    const duplicate = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) =>
        q.eq("albumId", args.albumId).eq("trackNumber", trackNumber),
      )
      .unique();

    if (duplicate) {
      throw new Error(`Ya existe la pista ${trackNumber}.`);
    }

    const now = Date.now();

    const trackId = await ctx.db.insert("musicTracks", {
      albumId: args.albumId,
      title: args.title.trim() || `Pista ${trackNumber}`,
      artist: args.artist?.trim() || undefined,
      trackNumber,

      audioStorageId: args.audioStorageId,
      audioFilename: args.audioFilename,
      audioMimeType: args.audioMimeType,
      audioSizeBytes: args.audioSizeBytes,
      durationMs: args.durationMs,

      createdAt: now,
      updatedAt: now,
    });

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    await ctx.db.patch(args.albumId, {
      trackCount: tracks.length,
      updatedAt: Date.now(),
    });

    return trackId;
  },
});

export const publishAlbum = mutation({
  args: {
    albumId: v.id("musicAlbums"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    if (!album.coverStorageId) {
      throw new Error("Debes subir una carátula.");
    }

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) => q.eq("albumId", args.albumId))
      .collect();

    if (tracks.length !== album.expectedTrackCount) {
      throw new Error(
        `Se esperaban ${album.expectedTrackCount} pistas y hay ${tracks.length}.`,
      );
    }

    await ctx.db.patch(args.albumId, {
      trackCount: tracks.length,
      status: "published",
      updatedAt: Date.now(),
    });
  },
});

export const listAlbums = query({
  args: {},
  handler: async (ctx) => {
    const albums = await ctx.db
      .query("musicAlbums")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return await Promise.all(
      albums.map(async (album) => ({
        ...album,
        coverUrl: album.coverStorageId
          ? await ctx.storage.getUrl(album.coverStorageId)
          : null,
      })),
    );
  },
});

export const getAlbum = query({
  args: {
    albumId: v.id("musicAlbums"),
  },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);

    if (!album || album.status !== "published") {
      return null;
    }

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) => q.eq("albumId", args.albumId))
      .collect();

    return {
      ...album,
      coverUrl: album.coverStorageId
        ? await ctx.storage.getUrl(album.coverStorageId)
        : null,
      tracks: await Promise.all(
        tracks.map(async (track) => ({
          ...track,
          audioUrl: await ctx.storage.getUrl(track.audioStorageId),
        })),
      ),
    };
  },
});

export const deleteAlbum = mutation({
  args: {
    albumId: v.id("musicAlbums"),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    // 1. Eliminar todos los MP3 y documentos de pistas
    for (const track of tracks) {
      await ctx.storage.delete(track.audioStorageId);

      await ctx.db.delete(track._id);
    }

    // 2. Eliminar la carátula
    if (album.coverStorageId) {
      await ctx.storage.delete(album.coverStorageId);
    }

    // 3. Eliminar el álbum
    await ctx.db.delete(args.albumId);

    return {
      deletedAlbumId: args.albumId,
      deletedTracks: tracks.length,
    };
  },
});

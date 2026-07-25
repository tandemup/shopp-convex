import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Generar URL para subir PNG o MP3
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// 2. Crear álbum
export const createAlbum = mutation({
  args: {
    title: v.string(),
    artist: v.string(),
    description: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("musicAlbums", {
      title: args.title,
      artist: args.artist,
      description: args.description,
      coverStorageId: args.coverStorageId,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 3. Añadir canción
export const addTrack = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    title: v.string(),
    artist: v.optional(v.string()),
    trackNumber: v.number(),
    durationSeconds: v.optional(v.number()),
    audioStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("musicTracks", {
      albumId: args.albumId,
      title: args.title,
      artist: args.artist,
      trackNumber: args.trackNumber,
      durationSeconds: args.durationSeconds,
      audioStorageId: args.audioStorageId,
      isPublished: false,
      createdAt: Date.now(),
    });
  },
});

// 4. Consultar álbum y playlist
export const getAlbumWithTracks = query({
  args: {
    albumId: v.id("musicAlbums"),
  },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);

    if (!album || !album.isPublished) {
      return null;
    }

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_order", (q) => q.eq("albumId", args.albumId))
      .collect();

    const coverUrl = album.coverStorageId
      ? await ctx.storage.getUrl(album.coverStorageId)
      : null;

    const playlist = await Promise.all(
      tracks
        .filter((track) => track.isPublished)
        .map(async (track) => ({
          id: track._id,
          title: track.title,
          artist: track.artist || album.artist,
          trackNumber: track.trackNumber,
          durationSeconds: track.durationSeconds,
          audioUrl: await ctx.storage.getUrl(track.audioStorageId),
          artworkUrl: coverUrl,
        })),
    );

    return {
      id: album._id,
      title: album.title,
      artist: album.artist,
      description: album.description,
      artworkUrl: coverUrl,
      playlist,
    };
  },
});

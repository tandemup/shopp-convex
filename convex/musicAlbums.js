import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const albumStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("hidden"),
);

function cleanText(value, fieldName) {
  const result = String(value || "").trim();

  if (!result) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return result;
}

async function requireAdmin(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  const user = await ctx.db.get(userId);

  if (!user || user.role !== "admin") {
    throw new Error("Acceso restringido a administradores.");
  }

  return userId;
}

export const createDraft = mutation({
  args: {
    title: v.string(),
    artist: v.string(),
    year: v.optional(v.number()),
    genre: v.optional(v.string()),
    description: v.optional(v.string()),
    expectedTrackCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    if (args.expectedTrackCount < 1 || args.expectedTrackCount > 50) {
      throw new Error("El álbum debe contener entre 1 y 50 pistas.");
    }

    const now = Date.now();

    return await ctx.db.insert("musicAlbums", {
      title: cleanText(args.title, "El título"),
      artist: cleanText(args.artist, "El artista"),
      year: args.year,
      genre: args.genre?.trim() || undefined,
      description: args.description?.trim() || undefined,
      expectedTrackCount: Math.floor(args.expectedTrackCount),
      trackCount: 0,
      status: "draft",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setCover = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    coverStorageId: v.id("_storage"),
    coverFilename: v.string(),
    coverMimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    if (album.coverStorageId && album.coverStorageId !== args.coverStorageId) {
      await ctx.storage.delete(album.coverStorageId);
    }

    await ctx.db.patch(args.albumId, {
      coverStorageId: args.coverStorageId,
      coverFilename: args.coverFilename,
      coverMimeType: args.coverMimeType,
      updatedAt: Date.now(),
    });
  },
});

export const publish = mutation({
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
      .withIndex("by_album_track", (q) => q.eq("albumId", args.albumId))
      .collect();

    if (!album.coverStorageId) {
      throw new Error("Debes subir la portada antes de publicar.");
    }

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

export const setStatus = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    status: albumStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    await ctx.db.patch(args.albumId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    albumId: v.id("musicAlbums"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      return;
    }

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) => q.eq("albumId", args.albumId))
      .collect();

    for (const track of tracks) {
      await ctx.storage.delete(track.audioStorageId);
      await ctx.db.delete(track._id);
    }

    if (album.coverStorageId) {
      await ctx.storage.delete(album.coverStorageId);
    }

    await ctx.db.delete(args.albumId);
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const albums = await ctx.db
      .query("musicAlbums")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const result = await Promise.all(
      albums.map(async (album) => ({
        ...album,
        coverUrl: album.coverStorageId
          ? await ctx.storage.getUrl(album.coverStorageId)
          : null,
      })),
    );

    return result.sort((a, b) => {
      const artistCompare = a.artist.localeCompare(b.artist);
      return artistCompare || a.title.localeCompare(b.title);
    });
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const albums = await ctx.db.query("musicAlbums").collect();

    return await Promise.all(
      albums
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (album) => ({
          ...album,
          coverUrl: album.coverStorageId
            ? await ctx.storage.getUrl(album.coverStorageId)
            : null,
        })),
    );
  },
});

export const getPublishedWithTracks = query({
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

    const tracksWithUrls = await Promise.all(
      tracks.map(async (track) => ({
        ...track,
        audioUrl: await ctx.storage.getUrl(track.audioStorageId),
      })),
    );

    return {
      ...album,
      coverUrl: album.coverStorageId
        ? await ctx.storage.getUrl(album.coverStorageId)
        : null,
      tracks: tracksWithUrls,
    };
  },
});

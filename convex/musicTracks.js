import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

export const add = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    title: v.string(),
    artist: v.optional(v.string()),
    trackNumber: v.number(),
    discNumber: v.optional(v.number()),
    audioStorageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    if (album.status === "published") {
      throw new Error("Oculta el álbum antes de modificar sus pistas.");
    }

    const duplicate = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) =>
        q.eq("albumId", args.albumId).eq("trackNumber", args.trackNumber),
      )
      .unique();

    if (duplicate) {
      throw new Error(`Ya existe la pista ${args.trackNumber}.`);
    }

    const title = String(args.title || "").trim();

    if (!title) {
      throw new Error("El título de la pista es obligatorio.");
    }

    const trackId = await ctx.db.insert("musicTracks", {
      albumId: args.albumId,
      title,
      artist: args.artist?.trim() || undefined,
      trackNumber: Math.floor(args.trackNumber),
      discNumber: args.discNumber ? Math.floor(args.discNumber) : undefined,
      audioStorageId: args.audioStorageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      durationSeconds: args.durationSeconds,
      createdAt: Date.now(),
    });

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) => q.eq("albumId", args.albumId))
      .collect();

    await ctx.db.patch(args.albumId, {
      trackCount: tracks.length,
      updatedAt: Date.now(),
    });

    return trackId;
  },
});

export const remove = mutation({
  args: {
    trackId: v.id("musicTracks"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const track = await ctx.db.get(args.trackId);

    if (!track) {
      return;
    }

    const album = await ctx.db.get(track.albumId);

    if (album?.status === "published") {
      throw new Error("Oculta el álbum antes de eliminar pistas.");
    }

    await ctx.storage.delete(track.audioStorageId);
    await ctx.db.delete(args.trackId);

    const remaining = await ctx.db
      .query("musicTracks")
      .withIndex("by_album_track", (q) => q.eq("albumId", track.albumId))
      .collect();

    if (album) {
      await ctx.db.patch(track.albumId, {
        trackCount: remaining.length,
        updatedAt: Date.now(),
      });
    }
  },
});

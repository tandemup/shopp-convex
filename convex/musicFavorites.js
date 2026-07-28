import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const listMyFavoriteTrackIds = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const favorites = await ctx.db
      .query("musicFavorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return favorites.map((favorite) => favorite.trackId);
  },
});

export const add = mutation({
  args: { trackId: v.id("musicTracks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Canción no encontrada.");

    const existing = await ctx.db
      .query("musicFavorites")
      .withIndex("by_user_track", (q) =>
        q.eq("userId", user._id).eq("trackId", args.trackId),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("musicFavorites", {
        userId: user._id,
        trackId: args.trackId,
        createdAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { trackId: v.id("musicTracks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("musicFavorites")
      .withIndex("by_user_track", (q) =>
        q.eq("userId", user._id).eq("trackId", args.trackId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const listMyTracks = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const favorites = await ctx.db
      .query("musicFavorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const result = [];
    for (const favorite of favorites) {
      const track = await ctx.db.get(favorite.trackId);
      if (!track) continue;
      const album = await ctx.db.get(track.albumId);
      if (!album || album.status !== "published") continue;
      result.push({
        ...track,
        albumTitle: album.title,
        albumArtist: album.artist || album.composer || "Sin artista",
        coverUrl: album.coverStorageId
          ? await ctx.storage.getUrl(album.coverStorageId)
          : null,
        audioUrl: await ctx.storage.getUrl(track.audioStorageId),
        favoriteCreatedAt: favorite.createdAt,
      });
    }
    return result.sort((a, b) => b.favoriteCreatedAt - a.favoriteCreatedAt);
  },
});

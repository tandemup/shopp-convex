// convex/albums.js
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAlbum = query({
  args: { albumId: v.id("albums") },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);

    if (!album) {
      return null;
    }

    const coverUrl = album.coverStorageId
      ? await ctx.storage.getUrl(album.coverStorageId)
      : null;

    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .order("asc")
      .collect();

    const tracksWithUrls = await Promise.all(
      tracks.map(async (track) => ({
        ...track,
        audioUrl: await ctx.storage.getUrl(track.audioStorageId),
      })),
    );

    return {
      ...album,
      coverUrl,
      tracks: tracksWithUrls,
    };
  },
});

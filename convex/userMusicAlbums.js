import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const entries = await ctx.db
      .query("userMusicAlbums")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const albums = await Promise.all(
      entries.map(async (entry) => {
        const album = await ctx.db.get(entry.albumId);
        if (!album || album.status !== "published") return null;
        return {
          ...album,
          addedAt: entry.addedAt,
          coverUrl: album.coverStorageId
            ? await ctx.storage.getUrl(album.coverStorageId)
            : null,
        };
      }),
    );

    return albums.filter(Boolean).sort((a, b) => b.addedAt - a.addedAt);
  },
});

export const add = mutation({
  args: { albumId: v.id("musicAlbums") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const album = await ctx.db.get(args.albumId);
    if (!album || album.status !== "published") {
      throw new Error("El álbum no está disponible.");
    }

    const existing = await ctx.db
      .query("userMusicAlbums")
      .withIndex("by_user_album", (q) =>
        q.eq("userId", user._id).eq("albumId", args.albumId),
      )
      .unique();

    if (existing) return existing._id;
    return await ctx.db.insert("userMusicAlbums", {
      userId: user._id,
      albumId: args.albumId,
      addedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { albumId: v.id("musicAlbums") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("userMusicAlbums")
      .withIndex("by_user_album", (q) =>
        q.eq("userId", user._id).eq("albumId", args.albumId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

function token() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function owned(ctx, playlistId, userId) {
  const playlist = await ctx.db.get(playlistId);
  if (!playlist || playlist.userId !== userId)
    throw new Error("Playlist no encontrada.");
  return playlist;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const playlists = await ctx.db
      .query("musicPlaylists")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .collect();
    return Promise.all(
      playlists
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (playlist) => ({
          ...playlist,
          tracks: (
            await ctx.db
              .query("musicPlaylistTracks")
              .withIndex("by_playlist", (q) => q.eq("playlistId", playlist._id))
              .collect()
          ).length,
        })),
    );
  },
});

export const get = query({
  args: { playlistId: v.id("musicPlaylists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const playlist = await owned(ctx, args.playlistId, user._id);
    return getDetails(ctx, playlist);
  },
});

export const getShared = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const playlist = await ctx.db
      .query("musicPlaylists")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .unique();
    if (!playlist || !playlist.isPublic) return null;
    return getDetails(ctx, playlist);
  },
});

async function getDetails(ctx, playlist) {
  const rows = await ctx.db
    .query("musicPlaylistTracks")
    .withIndex("by_playlist", (q) => q.eq("playlistId", playlist._id))
    .collect();
  const tracks = [];
  for (const row of rows.sort((a, b) => a.position - b.position)) {
    const track = await ctx.db.get(row.trackId);
    if (!track) continue;
    const album = await ctx.db.get(track.albumId);
    tracks.push({
      ...track,
      position: row.position,
      albumTitle: album?.title || "",
      albumArtist: album?.artist || album?.composer || "",
      coverUrl: album?.coverStorageId
        ? await ctx.storage.getUrl(album.coverStorageId)
        : null,
      audioUrl: track.audioStorageId
        ? await ctx.storage.getUrl(track.audioStorageId)
        : null,
    });
  }
  return { ...playlist, tracks };
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Escribe un nombre para la playlist.");
    const now = Date.now();
    return ctx.db.insert("musicPlaylists", {
      userId: user._id,
      name,
      description: args.description?.trim() || undefined,
      isPublic: args.isPublic ?? false,
      shareToken: token(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    playlistId: v.id("musicPlaylists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await owned(ctx, args.playlistId, user._id);
    const patch = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined)
      patch.description = args.description.trim() || undefined;
    if (args.isPublic !== undefined) patch.isPublic = args.isPublic;
    await ctx.db.patch(args.playlistId, patch);
  },
});

export const remove = mutation({
  args: { playlistId: v.id("musicPlaylists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await owned(ctx, args.playlistId, user._id);
    const rows = await ctx.db
      .query("musicPlaylistTracks")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    await ctx.db.delete(args.playlistId);
  },
});

export const addTrack = mutation({
  args: { playlistId: v.id("musicPlaylists"), trackId: v.id("musicTracks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const playlist = await owned(ctx, args.playlistId, user._id);
    if (!(await ctx.db.get(args.trackId)))
      throw new Error("Canción no encontrada.");
    const existing = await ctx.db
      .query("musicPlaylistTracks")
      .withIndex("by_playlist_track", (q) =>
        q.eq("playlistId", args.playlistId).eq("trackId", args.trackId),
      )
      .unique();
    if (existing) return existing._id;
    const rows = await ctx.db
      .query("musicPlaylistTracks")
      .withIndex("by_playlist", (q) => q.eq("playlistId", args.playlistId))
      .collect();
    await ctx.db.patch(playlist._id, { updatedAt: Date.now() });
    return ctx.db.insert("musicPlaylistTracks", {
      playlistId: playlist._id,
      trackId: args.trackId,
      position: rows.length,
      addedAt: Date.now(),
    });
  },
});

export const removeTrack = mutation({
  args: { playlistId: v.id("musicPlaylists"), trackId: v.id("musicTracks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await owned(ctx, args.playlistId, user._id);
    const row = await ctx.db
      .query("musicPlaylistTracks")
      .withIndex("by_playlist_track", (q) =>
        q.eq("playlistId", args.playlistId).eq("trackId", args.trackId),
      )
      .unique();
    if (row) await ctx.db.delete(row._id);
    await ctx.db.patch(args.playlistId, { updatedAt: Date.now() });
  },
});

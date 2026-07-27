import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

async function getEditableAlbum(ctx, albumId) {
  const album = await ctx.db.get(albumId);

  if (!album) {
    throw new Error("Álbum no encontrado.");
  }

  if (album.status === "published") {
    throw new Error("Oculta el álbum antes de modificar sus pistas.");
  }

  return album;
}

export const add = mutation({
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
    lyrics: v.optional(
      v.array(
        v.object({
          timeMs: v.number(),
          text: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await getEditableAlbum(ctx, args.albumId);

    const trackNumber = Math.floor(args.trackNumber);
    const title = String(args.title || "").trim();

    if (!title) {
      throw new Error("El título de la pista es obligatorio.");
    }

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
      title,
      artist: args.artist?.trim() || undefined,
      trackNumber,
      audioStorageId: args.audioStorageId,
      audioFilename: args.audioFilename,
      audioMimeType: args.audioMimeType,
      audioSizeBytes: args.audioSizeBytes,
      durationMs: args.durationMs,
      lyrics: args.lyrics,
      createdAt: now,
      updatedAt: now,
    });

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    await ctx.db.patch(args.albumId, {
      trackCount: tracks.length,
      updatedAt: now,
    });

    return trackId;
  },
});

export const update = mutation({
  args: {
    trackId: v.id("musicTracks"),
    title: v.string(),
    artist: v.optional(v.string()),
    lyrics: v.optional(
      v.array(
        v.object({
          timeMs: v.number(),
          text: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const track = await ctx.db.get(args.trackId);

    if (!track) {
      throw new Error("Pista no encontrada.");
    }

    await getEditableAlbum(ctx, track.albumId);

    const title = String(args.title || "").trim();

    if (!title) {
      throw new Error("El título de la pista es obligatorio.");
    }

    await ctx.db.patch(args.trackId, {
      title,
      artist: args.artist?.trim() || track.artist,
      lyrics: args.lyrics,
      updatedAt: Date.now(),
    });
  },
});

export const replaceAudio = mutation({
  args: {
    trackId: v.id("musicTracks"),
    audioStorageId: v.id("_storage"),
    audioFilename: v.string(),
    audioMimeType: v.optional(v.string()),
    audioSizeBytes: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const track = await ctx.db.get(args.trackId);

    if (!track) {
      throw new Error("Pista no encontrada.");
    }

    await getEditableAlbum(ctx, track.albumId);

    const previousStorageId = track.audioStorageId;

    await ctx.db.patch(args.trackId, {
      audioStorageId: args.audioStorageId,
      audioFilename: args.audioFilename,
      audioMimeType: args.audioMimeType,
      audioSizeBytes: args.audioSizeBytes,
      durationMs: args.durationMs,
      updatedAt: Date.now(),
    });

    if (previousStorageId && previousStorageId !== args.audioStorageId) {
      await ctx.storage.delete(previousStorageId);
    }
  },
});

export const reorder = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    orderedTrackIds: v.array(v.id("musicTracks")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await getEditableAlbum(ctx, args.albumId);

    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    if (tracks.length !== args.orderedTrackIds.length) {
      throw new Error(
        "La lista ordenada no contiene todas las pistas del álbum.",
      );
    }

    const albumTrackIds = new Set(tracks.map((track) => String(track._id)));
    const orderedIds = args.orderedTrackIds.map(String);

    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new Error("La lista ordenada contiene pistas duplicadas.");
    }

    for (const trackId of orderedIds) {
      if (!albumTrackIds.has(trackId)) {
        throw new Error("Una de las pistas no pertenece al álbum.");
      }
    }

    const now = Date.now();

    // Números temporales para evitar coincidencias durante el intercambio.
    for (let index = 0; index < args.orderedTrackIds.length; index += 1) {
      await ctx.db.patch(args.orderedTrackIds[index], {
        trackNumber: 100000 + index,
        updatedAt: now,
      });
    }

    for (let index = 0; index < args.orderedTrackIds.length; index += 1) {
      await ctx.db.patch(args.orderedTrackIds[index], {
        trackNumber: index + 1,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.albumId, {
      trackCount: tracks.length,
      expectedTrackCount: tracks.length,
      updatedAt: now,
    });
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

    await getEditableAlbum(ctx, track.albumId);

    const audioMetadata = await ctx.db.system.get(
      "_storage",
      track.audioStorageId,
    );

    if (audioMetadata) {
      await ctx.storage.delete(track.audioStorageId);
    }
    await ctx.db.delete(args.trackId);

    const remaining = await ctx.db
      .query("musicTracks")
      .withIndex("by_album", (q) => q.eq("albumId", track.albumId))
      .collect();

    const orderedRemaining = [...remaining].sort(
      (a, b) => a.trackNumber - b.trackNumber,
    );

    const now = Date.now();

    for (let index = 0; index < orderedRemaining.length; index += 1) {
      await ctx.db.patch(orderedRemaining[index]._id, {
        trackNumber: index + 1,
        updatedAt: now,
      });
    }

    await ctx.db.patch(track.albumId, {
      trackCount: orderedRemaining.length,
      expectedTrackCount: orderedRemaining.length,
      updatedAt: now,
    });
  },
});

export const updateLyrics = mutation({
  args: {
    trackId: v.id("musicTracks"),
    lyrics: v.optional(
      v.array(
        v.object({
          timeMs: v.float64(),
          text: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, {
      lyrics: args.lyrics,
      updatedAt: Date.now(),
    });

    return args.trackId;
  },
});

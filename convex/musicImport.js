import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Usuario no autenticado.");
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Acceso restringido a administradores.");
  }
  return userId;
}

export const importManifest = mutation({
  args: {
    schemaVersion: v.optional(v.number()),
    title: v.string(),
    composer: v.optional(v.string()),
    artist: v.optional(v.string()),
    genre: v.optional(v.string()),
    year: v.optional(v.number()),
    description: v.optional(v.string()),
    cover: v.object({
      storageId: v.id("_storage"),
      filename: v.string(),
      mimeType: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
    }),
    tracks: v.array(
      v.object({
        title: v.string(),
        artist: v.optional(v.string()),
        trackNumber: v.number(),
        audio: v.object({
          storageId: v.id("_storage"),
          filename: v.string(),
          mimeType: v.optional(v.string()),
          sizeBytes: v.optional(v.number()),
          durationMs: v.optional(v.number()),
        }),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("El título es obligatorio.");
    if (args.tracks.length < 1 || args.tracks.length > 50) {
      throw new Error("El álbum debe contener entre 1 y 50 pistas.");
    }

    const ordered = [...args.tracks].sort(
      (a, b) => a.trackNumber - b.trackNumber,
    );
    const numbers = new Set();
    for (const track of ordered) {
      if (numbers.has(track.trackNumber)) {
        throw new Error(`Número de pista duplicado: ${track.trackNumber}.`);
      }
      numbers.add(track.trackNumber);
    }

    const now = Date.now();
    const albumId = await ctx.db.insert("musicAlbums", {
      title: args.title.trim(),
      composer: args.composer?.trim() || undefined,
      artist: args.artist?.trim() || undefined,
      genre: args.genre?.trim() || undefined,
      year: args.year,
      description: args.description?.trim() || undefined,
      coverStorageId: args.cover.storageId,
      coverFilename: args.cover.filename,
      coverMimeType: args.cover.mimeType,
      expectedTrackCount: ordered.length,
      trackCount: ordered.length,
      status: "published",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    for (const track of ordered) {
      await ctx.db.insert("musicTracks", {
        albumId,
        title: track.title.trim(),
        artist: track.artist?.trim() || undefined,
        trackNumber: Math.floor(track.trackNumber),
        audioStorageId: track.audio.storageId,
        filename: track.audio.filename,
        mimeType: track.audio.mimeType,
        sizeBytes: track.audio.sizeBytes,
        durationSeconds: track.audio.durationMs
          ? track.audio.durationMs / 1000
          : undefined,
        createdAt: now,
      });
    }

    return albumId;
  },
});

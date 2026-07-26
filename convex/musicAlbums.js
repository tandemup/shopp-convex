import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

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

export const createDraft = mutation({
  args: {
    title: v.string(),
    composer: v.optional(v.string()),
    artist: v.string(),
    year: v.optional(v.number()),
    genre: v.optional(v.string()),
    description: v.optional(v.string()),
    expectedTrackCount: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const userId = admin._id;

    if (args.expectedTrackCount < 1 || args.expectedTrackCount > 50) {
      throw new Error("El álbum debe contener entre 1 y 50 pistas.");
    }

    const now = Date.now();

    return await ctx.db.insert("musicAlbums", {
      title: cleanText(args.title, "El título"),
      composer: args.composer?.trim() || undefined,
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
    coverSizeBytes: v.optional(v.number()),
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
      coverSizeBytes: args.coverSizeBytes,
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

export const getForAdmin = query({
  args: {
    albumId: v.id("musicAlbums"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
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
          audioUrl: track.audioStorageId
            ? await ctx.storage.getUrl(track.audioStorageId)
            : null,
        })),
      ),
    };
  },
});

export const update = mutation({
  args: {
    albumId: v.id("musicAlbums"),
    title: v.string(),
    composer: v.optional(v.string()),
    artist: v.optional(v.string()),
    genre: v.optional(v.string()),
    year: v.optional(v.number()),
    description: v.optional(v.string()),
    expectedTrackCount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    const title = args.title.trim();
    const expectedTrackCount = Math.floor(args.expectedTrackCount);

    if (!title) {
      throw new Error("El título del álbum es obligatorio.");
    }

    if (expectedTrackCount < 0) {
      throw new Error("El número esperado de pistas no es válido.");
    }

    await ctx.db.patch(args.albumId, {
      title,
      composer: args.composer?.trim() || undefined,
      artist: args.artist?.trim() || undefined,
      genre: args.genre?.trim() || undefined,
      year: args.year,
      description: args.description?.trim() || undefined,
      expectedTrackCount,
      status: "hidden",
      updatedAt: Date.now(),
    });

    return args.albumId;
  },
});

export const exportJson = query({
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

    return {
      version: 1,
      albumId: album._id,
      album: {
        title: album.title,
        composer: album.composer || "",
        artist: album.artist || "",
        genre: album.genre || "",
        year: album.year,
        description: album.description || "",
      },
      cover: {
        storageId: album.coverStorageId,
        filename: album.coverFilename || "",
        mimeType: album.coverMimeType || "",
        sizeBytes: album.coverSizeBytes,
      },
      tracks: tracks.map((track) => ({
        operation: "update",
        trackId: track._id,

        title: track.title,
        cdTrackTitle: track.cdTrackTitle || "",
        artist: track.artist || "",

        discNumber: track.discNumber || 1,
        discTrackNumber: track.discTrackNumber || track.trackNumber,
        sortOrder: track.sortOrder || track.trackNumber,

        trackNumber: track.trackNumber,
        audioStorageId: track.audioStorageId,
        audioFilename: track.audioFilename,
        audioMimeType: track.audioMimeType || "",
        audioSizeBytes: track.audioSizeBytes,
        durationMs: track.durationMs,
      })),
    };
  },
});

export const importAlbumJson = mutation({
  args: {
    albumId: v.id("musicAlbums"),

    album: v.object({
      title: v.string(),
      composer: v.optional(v.string()),
      artist: v.optional(v.string()),
      genre: v.optional(v.string()),
      year: v.optional(v.number()),
      description: v.optional(v.string()),
    }),

    cover: v.object({
      storageId: v.optional(v.id("_storage")),
      filename: v.string(),
      mimeType: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
    }),

    tracks: v.array(
      v.object({
        operation: v.union(v.literal("update"), v.literal("create")),

        trackId: v.optional(v.id("musicTracks")),

        title: v.string(),
        cdTrackTitle: v.optional(v.string()),
        artist: v.optional(v.string()),

        discNumber: v.number(),
        discTrackNumber: v.number(),
        sortOrder: v.number(),

        audioStorageId: v.id("_storage"),
        audioFilename: v.string(),
        audioMimeType: v.optional(v.string()),
        audioSizeBytes: v.optional(v.number()),
        durationMs: v.optional(v.number()),
      }),
    ),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const album = await ctx.db.get(args.albumId);

    if (!album) {
      throw new Error("Álbum no encontrado.");
    }

    if (!args.album.title.trim()) {
      throw new Error("El título del álbum es obligatorio.");
    }

    if (
      String(args.cover.storageId || "") !== String(album.coverStorageId || "")
    ) {
      throw new Error(
        "El JSON no puede sustituir la carátula. Usa el selector de imagen.",
      );
    }

    if (args.tracks.length === 0) {
      throw new Error("El álbum debe contener al menos una pista.");
    }

    const existingTracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    const existingById = new Map(
      existingTracks.map((track) => [String(track._id), track]),
    );

    const seenTrackIds = new Set();
    const seenStorageIds = new Set();
    const seenDiscTracks = new Set();
    const seenSortOrders = new Set();

    for (const track of args.tracks) {
      const discNumber = Math.floor(track.discNumber);
      const discTrackNumber = Math.floor(track.discTrackNumber);
      const sortOrder = Math.floor(track.sortOrder);

      if (!track.title.trim()) {
        throw new Error(`La pista con orden ${sortOrder} no tiene título.`);
      }

      if (discNumber < 1 || discTrackNumber < 1 || sortOrder < 1) {
        throw new Error(
          "discNumber, discTrackNumber y sortOrder deben ser mayores o iguales que 1.",
        );
      }

      const discTrackKey = `${discNumber}:${discTrackNumber}`;

      if (seenDiscTracks.has(discTrackKey)) {
        throw new Error(
          `La pista ${discTrackNumber} del CD ${discNumber} está duplicada.`,
        );
      }

      if (seenSortOrders.has(sortOrder)) {
        throw new Error(`El orden global ${sortOrder} está duplicado.`);
      }

      seenDiscTracks.add(discTrackKey);
      seenSortOrders.add(sortOrder);

      const storageMetadata = await ctx.db.system.get(
        "_storage",
        track.audioStorageId,
      );

      if (!storageMetadata) {
        throw new Error(
          `No existe el archivo de audio del orden ${sortOrder} en File Storage.`,
        );
      }

      const storageKey = String(track.audioStorageId);

      if (seenStorageIds.has(storageKey)) {
        throw new Error(
          `El archivo de audio del orden ${sortOrder} está repetido.`,
        );
      }

      seenStorageIds.add(storageKey);

      if (track.operation === "update") {
        if (!track.trackId) {
          throw new Error(
            `La pista existente del orden ${sortOrder} no tiene trackId.`,
          );
        }

        const existingTrack = existingById.get(String(track.trackId));

        if (!existingTrack) {
          throw new Error(
            `La pista existente del orden ${sortOrder} no pertenece al álbum.`,
          );
        }

        if (
          String(existingTrack.audioStorageId) !== String(track.audioStorageId)
        ) {
          throw new Error(
            `El JSON no puede cambiar el MP3 de la pista existente del orden ${sortOrder}.`,
          );
        }

        const trackKey = String(track.trackId);

        if (seenTrackIds.has(trackKey)) {
          throw new Error("El JSON contiene trackId duplicados.");
        }

        seenTrackIds.add(trackKey);
      } else if (track.trackId) {
        throw new Error(
          `Una pista nueva no debe incluir trackId: orden ${sortOrder}.`,
        );
      }
    }

    const orderedTracks = [...args.tracks].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    for (let index = 0; index < orderedTracks.length; index += 1) {
      if (orderedTracks[index].sortOrder !== index + 1) {
        throw new Error("sortOrder debe comenzar en 1 y ser consecutivo.");
      }
    }

    const now = Date.now();

    await ctx.db.patch(args.albumId, {
      title: args.album.title.trim(),
      composer: args.album.composer?.trim() || undefined,
      artist: args.album.artist?.trim() || undefined,
      genre: args.album.genre?.trim() || undefined,
      year: args.album.year,
      description: args.album.description?.trim() || undefined,
      status: "hidden",
      expectedTrackCount: orderedTracks.length,
      updatedAt: now,
    });

    // Numeración temporal para evitar colisiones al reordenar.
    for (let index = 0; index < existingTracks.length; index += 1) {
      await ctx.db.patch(existingTracks[index]._id, {
        sortOrder: 100000 + index,
        trackNumber: 100000 + index,
        updatedAt: now,
      });
    }

    let createdTracks = 0;
    let updatedTracks = 0;

    for (const track of orderedTracks) {
      const commonFields = {
        title: track.title.trim(),
        cdTrackTitle: track.cdTrackTitle?.trim() || undefined,
        artist: track.artist?.trim() || undefined,

        discNumber: Math.floor(track.discNumber),
        discTrackNumber: Math.floor(track.discTrackNumber),
        sortOrder: Math.floor(track.sortOrder),

        // Compatibilidad con las pantallas existentes.
        trackNumber: Math.floor(track.sortOrder),

        updatedAt: now,
      };

      if (track.operation === "update") {
        await ctx.db.patch(track.trackId, commonFields);

        updatedTracks += 1;
      } else {
        await ctx.db.insert("musicTracks", {
          albumId: args.albumId,
          ...commonFields,

          audioStorageId: track.audioStorageId,
          audioFilename: track.audioFilename,
          audioMimeType: track.audioMimeType,
          audioSizeBytes: track.audioSizeBytes,
          durationMs: track.durationMs,

          createdAt: now,
        });

        createdTracks += 1;
      }
    }

    await ctx.db.patch(args.albumId, {
      trackCount: orderedTracks.length,
      expectedTrackCount: orderedTracks.length,
      updatedAt: Date.now(),
    });

    return {
      albumId: args.albumId,
      totalTracks: orderedTracks.length,
      createdTracks,
      updatedTracks,
    };
  },
});

# Listados actualizados - datos por usuario

## convex/schema.js

```js
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  chatMessages: defineTable({
    userId: v.optional(v.string()),

    room: v.string(),
    text: v.string(),
    username: v.string(),
    createdAt: v.float64(),

    status: v.optional(
      v.union(v.literal("visible"), v.literal("hidden"), v.literal("blocked")),
    ),

    messageStatus: v.optional(
      v.union(
        v.literal("clean"),
        v.literal("blocked"),
        v.literal("warning"),
        v.literal("pending_url_check"),
      ),
    ),

    urls: v.optional(
      v.array(
        v.object({
          originalUrl: v.string(),
          normalizedUrl: v.union(v.string(), v.null()),
          hostname: v.union(v.string(), v.null()),
          provider: v.string(),
          reason: v.string(),
          riskScore: v.float64(),
          checkedAt: v.float64(),

          status: v.optional(
            v.union(
              v.literal("trusted"),
              v.literal("safe"),
              v.literal("pending"),
              v.literal("suspicious"),
              v.literal("malicious"),
              v.literal("blocked"),
              v.literal("unknown"),
            ),
          ),
        }),
      ),
    ),

    checkedLocallyAt: v.optional(v.float64()),
    checkedExternallyAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),
    blockedReason: v.optional(v.string()),
  })
    .index("by_room_createdAt", ["room", "createdAt"])
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingPresence: defineTable({
    userId: v.string(),

    city: v.string(),
    zone: v.string(),

    alias: v.optional(v.string()),
    destination: v.optional(v.string()),

    status: v.optional(
      v.union(
        v.literal("heading"),
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),
        v.literal("offline"),
      ),
    ),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),

    createdAt: v.optional(v.float64()),
    updatedAt: v.float64(),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_city_zone_userId", ["city", "zone", "userId"])
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_userId", ["userId"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingSpots: defineTable({
    userId: v.optional(v.string()),

    city: v.string(),
    zone: v.string(),

    status: v.optional(
      v.union(
        v.literal("free"),
        v.literal("occupied"),
        v.literal("unknown"),
        v.literal("expired"),

        // Compatibilidad con documentos antiguos.
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),
        v.literal("heading"),
        v.literal("offline"),
      ),
    ),

    alias: v.optional(v.string()),
    destination: v.optional(v.string()),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),

    revealedBy: v.optional(v.string()),
    revealedAt: v.optional(v.float64()),

    occupiedBy: v.optional(v.string()),
    occupiedAt: v.optional(v.float64()),

    sourceMessageId: v.optional(v.id("parkingMessages")),

    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_city_zone_status_expiresAt", [
      "city",
      "zone",
      "status",
      "expiresAt",
    ])
    .index("by_city_zone_status_updatedAt", [
      "city",
      "zone",
      "status",
      "updatedAt",
    ])
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_userId", ["userId"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingMessages: defineTable({
    room: v.optional(v.string()),

    city: v.optional(v.string()),
    zone: v.optional(v.string()),

    userId: v.string(),
    alias: v.optional(v.string()),
    text: v.string(),
    createdAt: v.float64(),

    status: v.optional(
      v.union(
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),

        // Compatibilidad con documentos antiguos de tipo chat.
        v.literal("visible"),
        v.literal("hidden"),
        v.literal("blocked"),
      ),
    ),

    parkingStatus: v.optional(
      v.union(v.literal("looking"), v.literal("parked"), v.literal("leaving")),
    ),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),

    destination: v.optional(
      v.object({
        id: v.string(),
        name: v.string(),
        address: v.string(),
        lat: v.float64(),
        lng: v.float64(),
      }),
    ),
  })
    .index("by_room", ["room"])
    .index("by_city", ["city"])
    .index("by_zone", ["zone"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_createdAt", ["createdAt"])
    .index("by_city_zone_createdAt", ["city", "zone", "createdAt"])
    .index("by_city_zone_status_createdAt", [
      "city",
      "zone",
      "status",
      "createdAt",
    ])
    .index("by_status_createdAt", ["status", "createdAt"]),

  stores: defineTable({
    id: v.string(),
    name: v.string(),
    address: v.string(),
    city: v.string(),

    // Campo heredado. No usarlo para favoritos de usuario.
    favorite: v.optional(v.boolean()),

    provincia: v.optional(v.string()),
    zipcode: v.optional(v.union(v.string(), v.float64())),

    location: v.optional(
      v.object({
        lat: v.float64(),
        lng: v.float64(),
        source: v.optional(v.string()),
      }),
    ),
  })
    .index("by_storeId", ["id"])
    .index("by_city", ["city"])
    .index("by_name", ["name"]),

  userStoreFavorites: defineTable({
    userId: v.string(),
    storeId: v.string(),
    createdAt: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_storeId", ["userId", "storeId"])
    .index("by_storeId", ["storeId"]),

  scanHistory: defineTable({
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    source: v.optional(v.string()),
    rawData: v.optional(v.any()),

    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_barcode", ["barcode"])
    .index("by_createdAt", ["createdAt"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_barcode_updatedAt", ["barcode", "updatedAt"]),
});

```

## convex/chat.js

```js
// convex/chat.js

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const SELF_DELETE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_USERNAME = "anonymous";

function normalizeRoom(room) {
  const cleanRoom = String(room || "").trim();

  if (!cleanRoom) {
    return "general";
  }

  return cleanRoom;
}

function normalizeUsername(username) {
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername) {
    return DEFAULT_USERNAME;
  }

  return cleanUsername.slice(0, 40);
}

function normalizeText(text) {
  return String(text || "").trim();
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

async function getDisplayUsername(ctx, userId, fallbackUsername) {
  const user = await ctx.db.get(userId);

  return normalizeUsername(
    user?.name || user?.email || fallbackUsername || DEFAULT_USERNAME,
  );
}

export const listMessages = query({
  args: {
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const room = normalizeRoom(args.room);
    const now = Date.now();

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_createdAt", (q) => q.eq("room", room))
      .order("asc")
      .collect();

    return messages.filter((message) => {
      if (message.status && message.status !== "visible") {
        return false;
      }

      if (!message.expiresAt) {
        return true;
      }

      return message.expiresAt > now;
    });
  },
});

export const sendMessage = mutation({
  args: {
    room: v.string(),
    text: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const room = normalizeRoom(args.room);
    const username = await getDisplayUsername(ctx, userId, args.username);
    const text = normalizeText(args.text);

    if (!text) {
      throw new Error("El mensaje no puede estar vacío.");
    }

    if (text.length > 500) {
      throw new Error("El mensaje no puede superar 500 caracteres.");
    }

    const now = Date.now();

    return await ctx.db.insert("chatMessages", {
      userId,
      room,
      username,
      text,
      createdAt: now,
      status: "visible",
      messageStatus: "clean",
      checkedLocallyAt: now,
      expiresAt: now + SELF_DELETE_MS,
    });
  },
});

export const hideMessage = mutation({
  args: {
    id: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const message = await ctx.db.get(args.id);

    if (!message) {
      throw new Error("El mensaje no existe.");
    }

    if (message.userId && message.userId !== userId) {
      throw new Error("No puedes ocultar mensajes de otro usuario.");
    }

    await ctx.db.patch(args.id, {
      status: "hidden",
    });

    return args.id;
  },
});

export const blockMessage = mutation({
  args: {
    id: v.id("chatMessages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);

    await ctx.db.patch(args.id, {
      status: "blocked",
      messageStatus: "blocked",
      blockedReason: args.reason || "Mensaje bloqueado.",
    });

    return args.id;
  },
});

export const deleteExpiredMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const message of expiredMessages) {
      await ctx.db.delete(message._id);
    }

    return {
      deleted: expiredMessages.length,
    };
  },
});

```

## convex/parking.js

```js
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_CITY = "gijon";
const DEFAULT_ZONE = "general";

const LOOKING_TTL_MS = 10 * 60 * 1000;
const FREE_SPOT_TTL_MS = 10 * 60 * 1000;

const DEFAULT_OCCUPY_RADIUS_METERS = 35;
const DEFAULT_DUPLICATE_RADIUS_METERS = 10;

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_LIMIT = 200;
const MAX_SPOTS_LIMIT = 300;

const PRESENCE_TTL_MS = 10 * 60 * 1000;
const MAX_PRESENCE_LIMIT = 200;

const parkingMessageStatusValidator = v.union(
  v.literal("looking"),
  v.literal("parked"),
  v.literal("leaving"),
);

const parkingSpotStatusValidator = v.union(
  v.literal("free"),
  v.literal("occupied"),
  v.literal("unknown"),
  v.literal("expired"),
);

const parkingPresenceStatusValidator = v.union(
  v.literal("heading"),
  v.literal("looking"),
  v.literal("parked"),
  v.literal("leaving"),
);

function cleanText(value) {
  return String(value || "").trim();
}

function cleanCity(value) {
  return cleanText(value) || DEFAULT_CITY;
}

function cleanZone(value) {
  return cleanText(value) || DEFAULT_ZONE;
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

function cleanAlias(value) {
  const alias = cleanText(value);

  if (!alias) {
    return undefined;
  }

  return alias.slice(0, 40);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatitude(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

function hasValidCoords(lat, lng) {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

function safeAccuracy(value) {
  if (!isFiniteNumber(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(value, 10000));
}

function safeLocationSource(value) {
  const source = cleanText(value);

  if (!source) {
    return undefined;
  }

  return source.slice(0, 80);
}

function clampLimit(value, defaultValue, minValue, maxValue) {
  const numericValue = isFiniteNumber(value) ? Math.floor(value) : defaultValue;

  return Math.min(Math.max(numericValue, minValue), maxValue);
}

function clampRadius(value, defaultValue) {
  const numericValue = isFiniteNumber(value) ? value : defaultValue;

  return Math.max(1, Math.min(numericValue, 200));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  if (!hasValidCoords(lat1, lng1) || !hasValidCoords(lat2, lng2)) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters = 6371000;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

async function listActiveFreeSpotsForZone(ctx, city, zone, now) {
  return await ctx.db
    .query("parkingSpots")
    .withIndex("by_city_zone_status_expiresAt", (q) =>
      q
        .eq("city", city)
        .eq("zone", zone)
        .eq("status", "free")
        .gt("expiresAt", now),
    )
    .collect();
}

function findNearestSpot(spots, lat, lng, maxDistanceMeters) {
  let nearestSpot = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const spot of spots) {
    const distance = distanceMeters(lat, lng, spot.lat, spot.lng);

    if (distance <= maxDistanceMeters && distance < nearestDistance) {
      nearestSpot = spot;
      nearestDistance = distance;
    }
  }

  return {
    spot: nearestSpot,
    distanceMeters: nearestDistance,
  };
}

async function upsertParkingPresence(ctx, payload) {
  const now = Date.now();

  const city = cleanCity(payload.city);
  const zone = cleanZone(payload.zone);
  const userId = String(payload.userId);
  const alias = cleanAlias(payload.alias);
  const status = payload.status || "heading";

  const hasCoords = hasValidCoords(payload.lat, payload.lng);
  const accuracy = safeAccuracy(payload.accuracy);
  const locationSource = safeLocationSource(payload.locationSource);

  const existingPresence = await ctx.db
    .query("parkingPresence")
    .withIndex("by_city_zone_userId", (q) =>
      q.eq("city", city).eq("zone", zone).eq("userId", userId),
    )
    .first();

  const presenceData = {
    city,
    zone,
    userId,
    status,
    alias,

    lat: hasCoords ? payload.lat : undefined,
    lng: hasCoords ? payload.lng : undefined,
    accuracy,
    locationSource,

    updatedAt: now,
    expiresAt: now + PRESENCE_TTL_MS,
  };

  if (existingPresence) {
    await ctx.db.patch(existingPresence._id, presenceData);

    return existingPresence._id;
  }

  return await ctx.db.insert("parkingPresence", presenceData);
}

export const listParkingMessages = query({
  args: {
    city: v.string(),
    zone: v.string(),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const limit = clampLimit(args.limit, 80, 1, MAX_MESSAGES_LIMIT);

    const messages = await ctx.db
      .query("parkingMessages")
      .withIndex("by_city_zone_createdAt", (q) =>
        q.eq("city", city).eq("zone", zone),
      )
      .order("desc")
      .take(limit);

    return messages.reverse();
  },
});

export const listActiveParkingSpots = query({
  args: {
    city: v.string(),
    zone: v.string(),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const limit = clampLimit(args.limit, 20, 1, 100);

    const spots = await ctx.db
      .query("parkingSpots")
      .withIndex("by_city_zone_status_expiresAt", (q) =>
        q
          .eq("city", city)
          .eq("zone", zone)
          .eq("status", "free")
          .gt("expiresAt", now),
      )
      .order("asc")
      .take(limit);

    return spots.sort((a, b) => b.revealedAt - a.revealedAt);
  },
});

export const listParkingSpots = query({
  args: {
    city: v.string(),
    zone: v.string(),
    status: v.optional(parkingSpotStatusValidator),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const limit = clampLimit(args.limit, 100, 1, MAX_SPOTS_LIMIT);

    if (args.status) {
      return await ctx.db
        .query("parkingSpots")
        .withIndex("by_city_zone_status_updatedAt", (q) =>
          q.eq("city", city).eq("zone", zone).eq("status", args.status),
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("parkingSpots")
      .withIndex("by_city_zone_updatedAt", (q) =>
        q.eq("city", city).eq("zone", zone),
      )
      .order("desc")
      .take(limit);
  },
});

export const listDestinationPresence = query({
  args: {
    city: v.string(),
    zone: v.string(),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const limit = clampLimit(args.limit, 50, 1, MAX_PRESENCE_LIMIT);

    const presence = await ctx.db
      .query("parkingPresence")
      .withIndex("by_city_zone_updatedAt", (q) =>
        q
          .eq("city", city)
          .eq("zone", zone)
          .gt("updatedAt", now - PRESENCE_TTL_MS),
      )
      .order("desc")
      .take(limit);

    return presence
      .filter((item) => item.expiresAt > now)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const sendParkingMessage = mutation({
  args: {
    city: v.string(),
    zone: v.string(),
    text: v.string(),
    alias: v.optional(v.string()),

    status: v.optional(parkingMessageStatusValidator),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    occupyRadiusMeters: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const userId = await requireAuthUserId(ctx);
    const alias = cleanAlias(args.alias);
    const text = cleanText(args.text);

    const hasCoords = hasValidCoords(args.lat, args.lng);
    const accuracy = safeAccuracy(args.accuracy);
    const locationSource = safeLocationSource(args.locationSource);

    if (!text) {
      throw new Error("El mensaje no puede estar vacío.");
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
    }

    const messageId = await ctx.db.insert("parkingMessages", {
      city,
      zone,
      userId,
      alias,
      text,

      status: args.status,

      lat: hasCoords ? args.lat : undefined,
      lng: hasCoords ? args.lng : undefined,
      accuracy,
      locationSource,

      createdAt: now,
    });

    await upsertParkingPresence(ctx, {
      city,
      zone,
      userId,
      alias,
      status: args.status || "heading",
      lat: args.lat,
      lng: args.lng,
      accuracy: args.accuracy,
      locationSource: args.locationSource,
    });

    if (args.status === "leaving" && hasCoords) {
      const activeFreeSpots = await listActiveFreeSpotsForZone(
        ctx,
        city,
        zone,
        now,
      );

      const nearest = findNearestSpot(
        activeFreeSpots,
        args.lat,
        args.lng,
        DEFAULT_DUPLICATE_RADIUS_METERS,
      );

      if (nearest.spot) {
        await ctx.db.patch(nearest.spot._id, {
          lat: args.lat,
          lng: args.lng,
          accuracy,
          locationSource,

          status: "free",
          revealedBy: userId,
          revealedAt: now,
          updatedAt: now,
          expiresAt: now + FREE_SPOT_TTL_MS,

          occupiedBy: undefined,
          occupiedAt: undefined,

          sourceMessageId: messageId,
        });
      } else {
        await ctx.db.insert("parkingSpots", {
          city,
          zone,

          lat: args.lat,
          lng: args.lng,
          accuracy,
          locationSource,

          status: "free",

          revealedBy: userId,
          occupiedBy: undefined,

          revealedAt: now,
          occupiedAt: undefined,
          updatedAt: now,
          expiresAt: now + FREE_SPOT_TTL_MS,

          sourceMessageId: messageId,
        });
      }
    }

    if (args.status === "parked" && hasCoords) {
      const radius = clampRadius(
        args.occupyRadiusMeters,
        DEFAULT_OCCUPY_RADIUS_METERS,
      );

      const activeFreeSpots = await listActiveFreeSpotsForZone(
        ctx,
        city,
        zone,
        now,
      );

      const nearest = findNearestSpot(
        activeFreeSpots,
        args.lat,
        args.lng,
        radius,
      );

      if (nearest.spot) {
        await ctx.db.patch(nearest.spot._id, {
          status: "occupied",
          occupiedBy: userId,
          occupiedAt: now,
          updatedAt: now,
          expiresAt: now,
        });
      }
    }

    return {
      ok: true,
      messageId,
    };
  },
});

export const deleteExpiredLookingMessages = mutation({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const cutoff = Date.now() - LOOKING_TTL_MS;

    const city = args.city ? cleanCity(args.city) : null;
    const zone = args.zone ? cleanZone(args.zone) : null;

    let expiredMessages = [];

    if (city && zone) {
      expiredMessages = await ctx.db
        .query("parkingMessages")
        .withIndex("by_city_zone_status_createdAt", (q) =>
          q
            .eq("city", city)
            .eq("zone", zone)
            .eq("status", "looking")
            .lt("createdAt", cutoff),
        )
        .collect();
    } else {
      const allLookingMessages = await ctx.db
        .query("parkingMessages")
        .withIndex("by_status_createdAt", (q) =>
          q.eq("status", "looking").lt("createdAt", cutoff),
        )
        .collect();

      expiredMessages = allLookingMessages.filter((message) => {
        const sameCity = city ? message.city === city : true;
        const sameZone = zone ? message.zone === zone : true;

        return sameCity && sameZone;
      });
    }

    for (const message of expiredMessages) {
      await ctx.db.delete(message._id);
    }

    return {
      ok: true,
      deleted: expiredMessages.length,
    };
  },
});

export const expireOldFreeParkingSpots = mutation({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const city = args.city ? cleanCity(args.city) : null;
    const zone = args.zone ? cleanZone(args.zone) : null;

    let expiredSpots = [];

    if (city && zone) {
      expiredSpots = await ctx.db
        .query("parkingSpots")
        .withIndex("by_city_zone_status_expiresAt", (q) =>
          q
            .eq("city", city)
            .eq("zone", zone)
            .eq("status", "free")
            .lte("expiresAt", now),
        )
        .collect();
    } else {
      const candidates = await ctx.db
        .query("parkingSpots")
        .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
        .collect();

      expiredSpots = candidates.filter((spot) => {
        const sameCity = city ? spot.city === city : true;
        const sameZone = zone ? spot.zone === zone : true;

        return spot.status === "free" && sameCity && sameZone;
      });
    }

    for (const spot of expiredSpots) {
      await ctx.db.patch(spot._id, {
        status: "unknown",
        updatedAt: now,
      });
    }

    return {
      ok: true,
      updated: expiredSpots.length,
    };
  },
});

export const markParkingSpotOccupied = mutation({
  args: {
    spotId: v.id("parkingSpots"),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await requireAuthUserId(ctx);

    const spot = await ctx.db.get(args.spotId);

    if (!spot) {
      throw new Error("La plaza no existe.");
    }

    await ctx.db.patch(args.spotId, {
      status: "occupied",
      occupiedBy: userId,
      occupiedAt: now,
      updatedAt: now,
      expiresAt: now,
    });

    return {
      ok: true,
    };
  },
});

export const markParkingSpotFree = mutation({
  args: {
    spotId: v.id("parkingSpots"),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await requireAuthUserId(ctx);

    const spot = await ctx.db.get(args.spotId);

    if (!spot) {
      throw new Error("La plaza no existe.");
    }

    await ctx.db.patch(args.spotId, {
      status: "free",

      revealedBy: userId,
      revealedAt: now,

      occupiedBy: undefined,
      occupiedAt: undefined,

      updatedAt: now,
      expiresAt: now + FREE_SPOT_TTL_MS,
    });

    return {
      ok: true,
    };
  },
});

export const touchParkingPresence = mutation({
  args: {
    city: v.string(),
    zone: v.string(),
    alias: v.optional(v.string()),

    status: v.optional(parkingPresenceStatusValidator),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const presenceId = await upsertParkingPresence(ctx, {
      city: args.city,
      zone: args.zone,
      userId: await requireAuthUserId(ctx),
      alias: args.alias,
      status: args.status || "heading",
      lat: args.lat,
      lng: args.lng,
      accuracy: args.accuracy,
      locationSource: args.locationSource,
    });

    return {
      ok: true,
      presenceId,
    };
  },
});

export const deleteExpiredParkingPresence = mutation({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const expiredPresence = await ctx.db
      .query("parkingPresence")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .collect();

    const city = args.city ? cleanCity(args.city) : null;
    const zone = args.zone ? cleanZone(args.zone) : null;

    const filteredPresence = expiredPresence.filter((item) => {
      const sameCity = city ? item.city === city : true;
      const sameZone = zone ? item.zone === zone : true;

      return sameCity && sameZone;
    });

    for (const item of filteredPresence) {
      await ctx.db.delete(item._id);
    }

    return {
      ok: true,
      deleted: filteredPresence.length,
    };
  },
});

```

## convex/stores.js

```js
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_CITY = "gijon";
const DEFAULT_PROVINCIA = "Asturias";
const DEFAULT_ZIPCODE = 0;

const storeValidator = v.object({
  id: v.string(),
  name: v.string(),
  city: v.string(),
  provincia: v.string(),
  address: v.string(),
  zipcode: v.number(),

  location: v.object({
    lat: v.number(),
    lng: v.number(),
    source: v.string(),
  }),

  favorite: v.optional(v.boolean()),
});

function cleanText(value) {
  return String(value || "").trim();
}

function cleanStoreId(value) {
  return cleanText(value);
}

function cleanStoreName(value) {
  return cleanText(value);
}

function cleanCity(value) {
  return cleanText(value) || DEFAULT_CITY;
}

function cleanProvincia(value) {
  return cleanText(value) || DEFAULT_PROVINCIA;
}

function cleanAddress(value) {
  return cleanText(value);
}

function cleanLocationSource(value) {
  return cleanText(value) || "manual";
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatitude(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

function normalizeZipcode(value) {
  if (!isFiniteNumber(value)) {
    return DEFAULT_ZIPCODE;
  }

  return Math.trunc(value);
}

function normalizeStore(store) {
  const id = cleanStoreId(store.id);
  const name = cleanStoreName(store.name);

  if (!id) {
    throw new Error("La tienda no tiene id.");
  }

  if (!name) {
    throw new Error(`La tienda ${id} no tiene nombre.`);
  }

  const lat = store.location?.lat;
  const lng = store.location?.lng;

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    throw new Error(`La tienda ${name} tiene coordenadas no válidas.`);
  }

  return {
    id,
    name,

    city: cleanCity(store.city),
    provincia: cleanProvincia(store.provincia),
    address: cleanAddress(store.address),
    zipcode: normalizeZipcode(store.zipcode),

    location: {
      lat,
      lng,
      source: cleanLocationSource(store.location?.source),
    },

    // Campo heredado: las tiendas ya no guardan favoritos globales.
    favorite: false,
  };
}

function sortStoresByName(stores) {
  return [...stores].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    }),
  );
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

async function getFavoriteStoreIdsForUser(ctx, userId) {
  const favorites = await ctx.db
    .query("userStoreFavorites")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  return favorites.map((favorite) => favorite.storeId);
}

async function getStoreByPublicId(ctx, id) {
  return await ctx.db
    .query("stores")
    .withIndex("by_storeId", (q) => q.eq("id", id))
    .unique();
}

export const listStores = query({
  args: {},

  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();

    return sortStoresByName(stores).map((store) => ({
      ...store,
      favorite: false,
    }));
  },
});

export const listStoresWithMyFavorites = query({
  args: {},

  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    const userId = authUserId ? String(authUserId) : null;

    const stores = await ctx.db.query("stores").collect();
    const favoriteIds = userId
      ? new Set(await getFavoriteStoreIdsForUser(ctx, userId))
      : new Set();

    return sortStoresByName(stores).map((store) => ({
      ...store,
      favorite: favoriteIds.has(store.id),
    }));
  },
});

export const getStoreById = query({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const id = cleanStoreId(args.id);

    if (!id) {
      return null;
    }

    return await getStoreByPublicId(ctx, id);
  },
});

export const listStoresByCity = query({
  args: {
    city: v.string(),
  },

  handler: async (ctx, args) => {
    const city = cleanCity(args.city);
    const authUserId = await getAuthUserId(ctx);
    const userId = authUserId ? String(authUserId) : null;

    const stores = await ctx.db
      .query("stores")
      .withIndex("by_city", (q) => q.eq("city", city))
      .collect();

    const favoriteIds = userId
      ? new Set(await getFavoriteStoreIdsForUser(ctx, userId))
      : new Set();

    return sortStoresByName(stores).map((store) => ({
      ...store,
      favorite: favoriteIds.has(store.id),
    }));
  },
});

export const listMyFavoriteStoreIds = query({
  args: {},

  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    return await getFavoriteStoreIdsForUser(ctx, userId);
  },
});

export const listFavoriteStores = query({
  args: {},

  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const favoriteIds = await getFavoriteStoreIdsForUser(ctx, userId);
    const favoriteIdSet = new Set(favoriteIds);

    const stores = await ctx.db.query("stores").collect();

    return sortStoresByName(
      stores
        .filter((store) => favoriteIdSet.has(store.id))
        .map((store) => ({
          ...store,
          favorite: true,
        })),
    );
  },
});

export const upsertStores = mutation({
  args: {
    stores: v.array(storeValidator),
  },

  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawStore of args.stores) {
      const store = normalizeStore(rawStore);

      const existing = await getStoreByPublicId(ctx, store.id);

      if (existing) {
        await ctx.db.patch(existing._id, store);
        updated += 1;
      } else {
        await ctx.db.insert("stores", store);
        inserted += 1;
      }
    }

    return {
      ok: true,
      inserted,
      updated,
      skipped,
      total: args.stores.length,
    };
  },
});

export const setStoreFavorite = mutation({
  args: {
    id: v.string(),
    favorite: v.boolean(),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const id = cleanStoreId(args.id);

    if (!id) {
      throw new Error("Falta el id de la tienda.");
    }

    const existingStore = await getStoreByPublicId(ctx, id);

    if (!existingStore) {
      throw new Error("La tienda no existe.");
    }

    const existingFavorite = await ctx.db
      .query("userStoreFavorites")
      .withIndex("by_userId_storeId", (q) =>
        q.eq("userId", userId).eq("storeId", id),
      )
      .unique();

    if (args.favorite && !existingFavorite) {
      await ctx.db.insert("userStoreFavorites", {
        userId,
        storeId: id,
        createdAt: Date.now(),
      });
    }

    if (!args.favorite && existingFavorite) {
      await ctx.db.delete(existingFavorite._id);
    }

    return {
      ok: true,
      id,
      favorite: args.favorite,
    };
  },
});

export const toggleStoreFavorite = mutation({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const id = cleanStoreId(args.id);

    if (!id) {
      throw new Error("Falta el id de la tienda.");
    }

    const existingStore = await getStoreByPublicId(ctx, id);

    if (!existingStore) {
      throw new Error("La tienda no existe.");
    }

    const existingFavorite = await ctx.db
      .query("userStoreFavorites")
      .withIndex("by_userId_storeId", (q) =>
        q.eq("userId", userId).eq("storeId", id),
      )
      .unique();

    if (existingFavorite) {
      await ctx.db.delete(existingFavorite._id);

      return {
        ok: true,
        id,
        favorite: false,
      };
    }

    await ctx.db.insert("userStoreFavorites", {
      userId,
      storeId: id,
      createdAt: Date.now(),
    });

    return {
      ok: true,
      id,
      favorite: true,
    };
  },
});

export const toggleMyFavoriteStore = toggleStoreFavorite;

export const isMyFavoriteStore = query({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const id = cleanStoreId(args.id);

    if (!id) {
      return false;
    }

    const existingFavorite = await ctx.db
      .query("userStoreFavorites")
      .withIndex("by_userId_storeId", (q) =>
        q.eq("userId", userId).eq("storeId", id),
      )
      .unique();

    return Boolean(existingFavorite);
  },
});

export const deleteStoreById = mutation({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const id = cleanStoreId(args.id);

    if (!id) {
      throw new Error("Falta el id de la tienda.");
    }

    const existing = await getStoreByPublicId(ctx, id);

    if (!existing) {
      return {
        ok: true,
        deleted: false,
        id,
      };
    }

    await ctx.db.delete(existing._id);

    return {
      ok: true,
      deleted: true,
      id,
    };
  },
});

```

## src/context/StoresContext.js

```js
import React, { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const StoresContext = createContext();

const normalizeStores = (stores) => {
  if (!Array.isArray(stores)) return [];

  return stores.filter(
    (s) =>
      typeof s?.id === "string" &&
      s.id.length >= 8 &&
      typeof s.name === "string" &&
      typeof s.address === "string" &&
      s.location &&
      typeof s.location.lat === "number" &&
      typeof s.location.lng === "number",
  );
};

export const StoresProvider = ({ children }) => {
  const convexStores = useQuery(api.stores.listStoresWithMyFavorites);
  const toggleFavoriteMutation = useMutation(api.stores.toggleMyFavoriteStore);

  const stores = useMemo(() => normalizeStores(convexStores), [convexStores]);

  const ready = convexStores !== undefined;

  const favoriteStores = useMemo(() => {
    return stores.filter((store) => store.favorite === true);
  }, [stores]);

  const favoriteStoreIds = useMemo(() => {
    return favoriteStores.map((store) => store.id);
  }, [favoriteStores]);

  const toggleFavorite = async (storeId) => {
    if (!storeId) return null;

    return await toggleFavoriteMutation({ id: storeId });
  };

  const toggleFavoriteStore = toggleFavorite;

  const getStoreById = (storeId) =>
    stores.find((store) => store.id === storeId) || null;

  const isFavoriteStore = (storeId) => favoriteStoreIds.includes(storeId);

  const reloadStoresFromSeed = async () => {
    console.warn(
      "reloadStoresFromSeed ya no se usa: las tiendas se cargan desde Convex.",
    );
  };

  return (
    <StoresContext.Provider
      value={{
        stores,
        ready,
        favoriteStores,
        favoriteStoreIds,
        toggleFavorite,
        toggleFavoriteStore,
        isFavoriteStore,
        getStoreById,
        reloadStoresFromSeed,
      }}
    >
      {children}
    </StoresContext.Provider>
  );
};

export const useStores = () => {
  const ctx = useContext(StoresContext);

  if (!ctx) {
    throw new Error("useStores must be used within StoresProvider");
  }

  return ctx;
};

```

## src/context/ListsContext.js

```js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { loadLists, saveLists } from "@/src/storage/listsStorage";
import { STORAGE_KEYS, getUserScopedStorageKey } from "@/src/storage/storageKeys";
import { DEFAULT_CURRENCY } from "@/src/constants/currency";
import { buildPurchaseHistoryFromArchivedLists } from "@/src/utils/buildPurchaseHistoryFromArchivedLists";

/* -------------------------------------------------
   Context
-------------------------------------------------- */
const ListsContext = createContext(null);

/* -------------------------------------------------
   Provider
-------------------------------------------------- */
export function ListsProvider({ children }) {
  const currentUser = useQuery(api.users.current);
  const userStorageKey = useMemo(() => {
    return getUserScopedStorageKey(currentUser?._id || "anonymous", STORAGE_KEYS.LISTS);
  }, [currentUser?._id]);

  const [lists, setLists] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [isReady, setIsReady] = useState(false);

  /* -------------------------------------------------
     Rehidratación (solo listas)
  -------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setIsReady(false);

      try {
        const data = await loadLists(userStorageKey);

        if (!cancelled) {
          setLists(data);
        }
      } catch (err) {
        console.warn("Error loading lists", err);

        if (!cancelled) {
          setLists([]);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [userStorageKey]);

  /* -------------------------------------------------
     Persistencia (solo listas)
  -------------------------------------------------- */
  useEffect(() => {
    if (!isReady) return;
    saveLists(lists, userStorageKey);
  }, [lists, isReady, userStorageKey]);

  /* -------------------------------------------------
     Derivar purchaseHistory (NO persistido)
  -------------------------------------------------- */
  const archivedLists = useMemo(() => lists.filter((l) => l.archived), [lists]);

  useEffect(() => {
    const rebuilt = buildPurchaseHistoryFromArchivedLists(archivedLists);
    setPurchaseHistory(rebuilt);
  }, [archivedLists]);

  const activeLists = useMemo(() => lists.filter((l) => !l.archived), [lists]);

  /* -------------------------------------------------
     Helpers
  -------------------------------------------------- */
  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  /* -------------------------------------------------
     API pública — Listas
  -------------------------------------------------- */
  const createList = (name, currency) => {
    setLists((prev) => [
      ...prev,
      {
        id: generateId(),
        name,
        currency: currency ?? DEFAULT_CURRENCY,
        items: [],
        createdAt: Date.now(),
        archived: false,
        archivedAt: null,
        storeId: null,
      },
    ]);
  };

  const updateList = (listId, updates) => {
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)),
    );
  };

  const updateListStore = (listId, storeId) => {
    updateList(listId, { storeId });
  };

  const deleteList = (listId) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const archiveList = (listId) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        const checkedItems = Array.isArray(list.items)
          ? list.items.filter((item) => item?.checked === true)
          : [];

        return {
          ...list,
          items: checkedItems,
          archived: true,
          archivedAt: Date.now(),
        };
      }),
    );
  };

  const restoreList = (listId) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, archived: false, archivedAt: null } : l,
      ),
    );
  };

  const clearActiveListsState = () => {
    setLists((prev) => prev.filter((list) => list?.archived === true));
  };

  const clearArchivedListsState = () => {
    setLists((prev) => prev.filter((list) => list?.archived !== true));
  };

  const clearAllListsState = () => {
    setLists([]);
  };
  /* -------------------------------------------------
     API pública — Items
  -------------------------------------------------- */
  const addItem = (listId, item) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: [
                {
                  id: generateId(),
                  name: item?.name ?? "",
                  barcode: item?.barcode ?? "",

                  quantity: item?.quantity ?? item?.priceInfo?.qty ?? 1,
                  unitPrice: item?.unitPrice ?? item?.priceInfo?.unitPrice ?? 0,
                  unit: item?.unit ?? item?.priceInfo?.unit ?? "u",

                  priceInfo: item?.priceInfo ?? null,
                  checked: item?.checked ?? true,
                  promo: item?.promo ?? item?.priceInfo?.promo ?? null,

                  categoryId: item?.categoryId ?? null,
                  categoryName: item?.categoryName ?? null,
                  subcategoryId: item?.subcategoryId ?? null,
                  subcategoryName: item?.subcategoryName ?? null,
                },
                ...list.items,
              ],
            }
          : list,
      ),
    );
  };

  const updateItem = (listId, itemId, updates) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item,
              ),
            }
          : list,
      ),
    );
  };

  const deleteItem = (listId, itemId) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.filter((i) => i.id !== itemId),
            }
          : list,
      ),
    );
  };

  /* -------------------------------------------------
     Memo
  -------------------------------------------------- */
  const value = useMemo(
    () => ({
      lists,
      activeLists,
      archivedLists,
      purchaseHistory,
      isReady,

      createList,
      updateList,
      updateListStore,
      deleteList,
      archiveList,
      restoreList,

      clearActiveListsState,
      clearArchivedListsState,
      clearAllListsState,

      addItem,
      updateItem,
      deleteItem,
    }),
    [lists, activeLists, archivedLists, purchaseHistory, isReady],
  );

  return (
    <ListsContext.Provider value={value}>{children}</ListsContext.Provider>
  );
}

/* -------------------------------------------------
   Hook
-------------------------------------------------- */
export function useLists() {
  const ctx = useContext(ListsContext);
  if (!ctx) {
    throw new Error("useLists must be used inside ListsProvider");
  }
  return ctx;
}

```

## src/storage/storageKeys.js

```js
export const STORAGE_KEYS = {
  LISTS: "@shopping/lists",

  SEARCH_SETTINGS: "@shopping/searchSettings",
  SEARCH_ENGINE: "@shopping/searchEngine",
  SEARCH_GENERAL_ENGINE: "@shopping/search-general-engine",
  SEARCH_BOOK_ENGINE: "@shopping/search-book-engine",

  HISTORY: "@shopping/history",
  FAVORITES: "@shopping/favorites",
  FAVORITE_STORES: "@shopping/favorite-stores",

  PRODUCT_LEARNING: "@shopping/productLearning",

  STORES: "@shopping/stores",
  PURCHASES: "@shopping/purchases",
  SCANNED_ITEMS: "@shopping/scanned-items",

  STORES_DISTANCE_CACHE: "@shopping/stores-distance-cache",
  LOCATION_CACHE: "@shopping/location-cache",
  HOME_LOCATION: "@shopping/home-location",
  SHOPPING_LOCATION: "@shopping/shopping-location",

  BARCODE_SETTINGS: "@shopping/barcode-settings",
};

export function getUserScopedStorageKey(userId, key) {
  const cleanUserId = String(userId || "anonymous").trim() || "anonymous";
  const cleanKey = String(key || "").trim();

  if (!cleanKey) {
    return `@shopping/users/${cleanUserId}`;
  }

  return `@shopping/users/${cleanUserId}/${cleanKey.replace(/^@shopping\//, "")}`;
}

```

## src/storage/listsStorage.js

```js
import { storage } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";

export async function loadLists(storageKey = STORAGE_KEYS.LISTS) {
  return await storage.getJSON(storageKey, []);
}

export async function saveLists(lists, storageKey = STORAGE_KEYS.LISTS) {
  return await storage.setJSON(storageKey, lists);
}

```

## src/screens/parking/ParkingSettingsScreen.js

```js
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocation } from "@/src/context/LocationContext";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";
import { ROUTES } from "@/src/navigation/ROUTES";
import {
  DEFAULT_PARKING_DESTINATION,
  DEFAULT_PARKING_USER_ID,
  loadParkingPreferences,
  saveParkingPreferences,
} from "@/src/screens/parking/parkingPreferences";

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const DEFAULT_CITY = "gijon";
const DEFAULT_DESTINATION = "palacio-deportes";
const DEFAULT_USER_ID = "anonymous";

const DESTINATION_OPTIONS = [
  {
    id: "palacio-deportes",
    label: "Palacio de los Deportes",
    category: "Deporte",
    address: "Paseo del Doctor Fleming, 929, 33203 Gijón, Asturias",
    latitude: 43.53502,
    longitude: -5.63586,
  },
  {
    id: "el-corte-ingles",
    label: "El Corte Inglés",
    category: "Centro comercial",
    address: "C/ Ramón Areces, 2, 33211 Gijón, Asturias",
    latitude: 43.5361,
    longitude: -5.6844,
  },
  {
    id: "los-fresnos",
    label: "C.C. Los Fresnos",
    category: "Centro comercial",
    address: "C. Río de Oro, 3, Centro, 33209 Gijón, Asturias",
    latitude: 43.5321,
    longitude: -5.6619,
  },
  {
    id: "el-molinon",
    label: "El Molinón",
    category: "Estadio",
    address: "C/ Luis Adaro Falcó, 33203 Gijón, Asturias",
    latitude: 43.536329,
    longitude: -5.637417,
  },
  {
    id: "hospital-cabuenes",
    label: "Hospital de Cabueñes",
    category: "Hospital",
    address: "Calle Los Prados, 395, 33203 Gijón, Asturias",
    latitude: 43.525186,
    longitude: -5.606614,
  },
  {
    id: "iglesia-san-julian",
    label: "Iglesia de San Julian",
    category: "Iglesia",
    address:
      "Iglesia de San Julián de Somió, Av. Dionisio Cifuentes, 19, Periurbano - Rural, 33203 Gijón, Asturias",
    latitude: 43.535538,
    longitude: -5.62342,
  },
];

function blurActiveElement() {
  if (Platform.OS !== "web") return;

  if (
    typeof document !== "undefined" &&
    document.activeElement &&
    typeof document.activeElement.blur === "function"
  ) {
    document.activeElement.blur();
  }
}

export default function ParkingSettingsScreen({ navigation, route }) {
  const [selectedDestination, setSelectedDestination] = useState(
    route?.params?.activeDestination || DEFAULT_PARKING_DESTINATION,
  );
  const [destinationPickerVisible, setDestinationPickerVisible] =
    useState(false);
  const [draftUserId, setDraftUserId] = useState(
    route?.params?.activeUserId || DEFAULT_PARKING_USER_ID,
  );

  const { location } = useLocation();

  const touchParkingPresence = useMutation(api.parking.touchParkingPresence);

  const userCoords =
    location?.lat != null && location?.lng != null
      ? {
          lat: location.lat,
          lng: location.lng,
        }
      : null;

  const activeDestinationData = useMemo(() => {
    return (
      DESTINATION_OPTIONS.find((destination) => {
        return destination.id === selectedDestination;
      }) || DESTINATION_OPTIONS[0]
    );
  }, [selectedDestination]);

  const activeParkingSpotsResult = useQuery(
    api.parking.listActiveParkingSpots,
    {
      city: DEFAULT_CITY,
      zone: selectedDestination,
      limit: 20,
    },
  );

  const destinationPresenceResult = useQuery(
    api.parking.listDestinationPresence,
    {
      city: DEFAULT_CITY,
      zone: selectedDestination,
      limit: 50,
    },
  );

  const activeParkingSpots = Array.isArray(activeParkingSpotsResult)
    ? activeParkingSpotsResult
    : [];

  const destinationPresence = Array.isArray(destinationPresenceResult)
    ? destinationPresenceResult
    : [];

  const cleanDraftUserId = draftUserId.trim() || DEFAULT_USER_ID;

  const activeFriendsCount = destinationPresence.filter((item) => {
    return item.userId !== cleanDraftUserId;
  }).length;

  const mapCenter = {
    lat: activeDestinationData?.latitude || 43.5453,
    lng: activeDestinationData?.longitude || -5.6615,
  };

  function getTrafficLevel(activeUsersCount) {
    if (activeUsersCount <= 0) {
      return {
        label: "Sin actividad",
        advice: "No hay señales de congestión colaborativa.",
      };
    }

    if (activeUsersCount <= 2) {
      return {
        label: "Tráfico bajo",
        advice: "Parece razonable ir ahora.",
      };
    }

    if (activeUsersCount <= 5) {
      return {
        label: "Tráfico medio",
        advice: "Puede haber más competencia por aparcar.",
      };
    }

    return {
      label: "Tráfico alto",
      advice: "Quizá conviene esperar o elegir otro destino.",
    };
  }

  const trafficInfo = getTrafficLevel(activeFriendsCount);

  async function handleSave() {
    blurActiveElement();

    const cleanUserId = draftUserId.trim() || DEFAULT_PARKING_USER_ID;

    const nextSettings = {
      userId: cleanUserId,
      destinationId: selectedDestination,
      destinationName: activeDestinationData.label,
      destinationAddress: activeDestinationData.address,
      destinationLatitude: activeDestinationData.latitude,
      destinationLongitude: activeDestinationData.longitude,
      customDestination: "",
    };

    await AsyncStorage.setItem(
      PARKING_SETTINGS_STORAGE_KEY,
      JSON.stringify(nextSettings),
    );

    await saveParkingPreferences({
      activeDestination: selectedDestination,
      activeUserId: cleanUserId,
    });

    await touchParkingPresence({
      city: "gijon",
      zone: selectedDestination,
      alias: cleanUserId,
      status: "heading",
      lat: userCoords?.lat,
      lng: userCoords?.lng,
      locationSource: userCoords ? "gps" : "settings",
    });

    navigation.navigate(ROUTES.PARKING_SCREEN, {
      activeDestination: selectedDestination,
      activeUserId: cleanUserId,
    });
  }

  function formatSpotTimeLeft(expiresAt) {
    if (!expiresAt) {
      return "";
    }

    const diff = expiresAt - Date.now();

    if (diff <= 0) {
      return "expirada";
    }

    const minutes = Math.max(1, Math.ceil(diff / 60000));

    if (minutes === 1) {
      return "válida 1 min";
    }

    return `válida ${minutes} min`;
  }

  function renderDestinationButton(destination) {
    const selected = destination.id === selectedDestination;

    return (
      <Pressable
        key={destination.id}
        onPress={() => {
          blurActiveElement();
          setSelectedDestination(destination.id);
          setDestinationPickerVisible(false);
        }}
        style={({ pressed }) => [
          styles.destinationButton,
          selected && styles.destinationButtonSelected,
          pressed && styles.selectorButtonPressed,
        ]}
      >
        <View style={styles.destinationButtonIcon}>
          <Ionicons
            name={selected ? "checkmark-circle" : "navigate-circle-outline"}
            size={22}
            color={selected ? "#ffffff" : "#15803d"}
          />
        </View>

        <View style={styles.destinationButtonTextBlock}>
          <Text
            style={[
              styles.destinationButtonText,
              selected && styles.destinationButtonTextSelected,
            ]}
          >
            {destination.label}
          </Text>

          <Text
            style={[
              styles.destinationButtonMeta,
              selected && styles.destinationButtonMetaSelected,
            ]}
          >
            {destination.category}
          </Text>

          <Text
            style={[
              styles.destinationAddress,
              selected && styles.destinationAddressSelected,
            ]}
            numberOfLines={2}
          >
            {destination.address || "Sin dirección definida"}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderSelectedDestinationCard() {
    return (
      <View style={styles.selectedDestinationCard}>
        <View style={styles.selectedDestinationIcon}>
          <Ionicons name="navigate-circle" size={24} color="#15803d" />
        </View>

        <View style={styles.selectedDestinationTextBlock}>
          <Text style={styles.selectedDestinationLabel}>
            {activeDestinationData.label}
          </Text>

          <Text style={styles.selectedDestinationCategory}>
            {activeDestinationData.category}
          </Text>

          <Text style={styles.selectedDestinationAddress} numberOfLines={2}>
            {activeDestinationData.address || "Sin dirección definida"}
          </Text>
        </View>
      </View>
    );
  }

  function renderDestinationPickerScreen() {
    if (!destinationPickerVisible) {
      return null;
    }

    return (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Pressable
              onPress={() => {
                blurActiveElement();
                setDestinationPickerVisible(false);
              }}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#14532d" />
              <Text style={styles.backButtonText}>Ajustes</Text>
            </Pressable>

            <Text style={styles.pickerTitle}>Elegir destino</Text>

            <Text style={styles.pickerSubtitle}>
              Selecciona el lugar al que vas para revisar actividad y plazas
              recientes.
            </Text>
          </View>

          <ScrollView
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {DESTINATION_OPTIONS.map(renderDestinationButton)}
          </ScrollView>
        </View>
      </View>
    );
  }

  function renderActiveSpots() {
    if (!activeParkingSpots.length) {
      return (
        <View style={styles.freeSpotsEmpty}>
          <Ionicons name="leaf-outline" size={18} color="#6b7280" />

          <Text style={styles.freeSpotsEmptyText}>
            No hay plazas libres reveladas ahora mismo.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.freeSpotsBlock}>
        <Text style={styles.freeSpotsTitle}>Plazas libres reveladas</Text>

        {activeParkingSpots.map((spot) => {
          return (
            <View key={spot._id} style={styles.freeSpotRow}>
              <View style={styles.freeSpotBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#15803d" />

                <View style={styles.freeSpotTextBlock}>
                  <Text style={styles.freeSpotTitle}>
                    Libre · {formatSpotTimeLeft(spot.expiresAt)}
                  </Text>

                  <Text style={styles.freeSpotCoords}>
                    {Number.isFinite(spot.lat) ? spot.lat.toFixed(5) : "-"},{" "}
                    {Number.isFinite(spot.lng) ? spot.lng.toFixed(5) : "-"}
                  </Text>
                </View>
              </View>

              <Text style={styles.freeSpotMeta}>
                Avisó: {spot.revealedBy || "anonymous"}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateSettings() {
      const preferences = await loadParkingPreferences();

      if (!isMounted) {
        return;
      }

      if (!route?.params?.activeDestination) {
        setSelectedDestination(preferences.activeDestination);
      }

      if (!route?.params?.activeUserId) {
        setDraftUserId(preferences.activeUserId);
      }
    }

    hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, [route?.params?.activeDestination, route?.params?.activeUserId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenShell}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                blurActiveElement();
                navigation.goBack();
              }}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#14532d" />

              <Text style={styles.backButtonText}>Parking</Text>
            </Pressable>

            <Text style={styles.title}>Ajustes</Text>

            <Text style={styles.subtitle}>
              Elige destino y revisa las plazas recientes antes de volver al
              chat.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <View style={styles.destinationHeader}>
                <Text style={styles.fieldLabel}>Destino</Text>

                <Pressable
                  onPress={() => {
                    blurActiveElement();
                    setDestinationPickerVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.changeDestinationButton,
                    pressed && styles.selectorButtonPressed,
                  ]}
                >
                  <Text style={styles.changeDestinationButtonText}>
                    Cambiar
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#15803d" />
                </Pressable>
              </View>

              {renderSelectedDestinationCard()}
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>User ID</Text>

              <TextInput
                value={draftUserId}
                onChangeText={setDraftUserId}
                placeholder="anonymous"
                placeholderTextColor="#888"
                style={styles.usernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
              />
            </View>

            <View style={styles.trafficCard}>
              <View style={styles.trafficIcon}>
                <Ionicons name="people-outline" size={22} color="#14532d" />
              </View>

              <View style={styles.trafficTextBlock}>
                <Text style={styles.trafficTitle}>
                  {activeFriendsCount} amigos activos en este destino
                </Text>

                <Text style={styles.trafficLabel}>{trafficInfo.label}</Text>

                <Text style={styles.trafficAdvice}>{trafficInfo.advice}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.mapHeader}>
                <View style={styles.mapTitleBlock}>
                  <Text style={styles.mapTitle}>Aparcamientos recientes</Text>

                  <Text style={styles.mapSubtitle}>
                    {activeDestinationData.label}
                  </Text>

                  <Text style={styles.mapAddress} numberOfLines={2}>
                    {activeDestinationData.address}
                  </Text>
                </View>
              </View>

              <View style={styles.mapContainer}>
                <StoreMapPreview
                  key={`parking-settings-map-${selectedDestination}-${mapCenter.lat}-${mapCenter.lng}`}
                  lat={mapCenter.lat}
                  lng={mapCenter.lng}
                  userLat={userCoords?.lat}
                  userLng={userCoords?.lng}
                  parkingSpots={activeParkingSpots}
                />
              </View>

              {renderActiveSpots()}
            </View>

            <Text style={styles.roomHint}>
              Canal: parking · destino: {selectedDestination}
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                blurActiveElement();
                navigation.goBack();
              }}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.footerButtonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.footerButtonPressed,
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />

              <Text style={styles.saveButtonText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {renderDestinationPickerScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e9e9e9",
  },

  screenShell: {
    flex: 1,
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: Platform.OS === "web" ? 16 : 0,
    paddingVertical: Platform.OS === "web" ? 16 : 0,
    backgroundColor: Platform.OS === "web" ? "#e9e9e9" : "#f8fafc",
  },

  container: {
    flex: 1,
    width: Platform.OS === "web" ? "100%" : undefined,
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    maxHeight: Platform.OS === "web" ? 860 : undefined,
    borderRadius: Platform.OS === "web" ? 26 : 0,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 10,
    minHeight: 34,
    paddingRight: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },

  backButtonPressed: {
    opacity: 0.75,
  },

  backButtonText: {
    color: "#14532d",
    fontSize: 14,
    fontWeight: "900",
  },

  title: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 14,
    paddingBottom: 24,
    gap: 14,
  },

  card: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 10,
  },

  fieldLabel: {
    color: "#14532d",
    fontSize: 13,
    fontWeight: "800",
  },

  selectorButtonPressed: {
    opacity: 0.75,
  },

  destinationGrid: {
    gap: 8,
  },

  destinationButton: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  destinationButtonSelected: {
    borderColor: "#15803d",
    backgroundColor: "#14532d",
  },

  destinationButtonIcon: {
    width: 28,
    alignItems: "center",
  },

  destinationButtonTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  destinationButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  destinationButtonTextSelected: {
    color: "#ffffff",
  },

  destinationButtonMeta: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "800",
  },

  destinationButtonMetaSelected: {
    color: "#dcfce7",
  },

  destinationAddress: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },

  destinationAddressSelected: {
    color: "#f0fdf4",
  },

  usernameInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 15,
  },

  trafficCard: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#86efac",
    flexDirection: "row",
    gap: 10,
  },

  trafficIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },

  trafficTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  trafficTitle: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "900",
  },

  trafficLabel: {
    marginTop: 2,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  trafficAdvice: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  mapHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  mapTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  mapTitle: {
    color: "#14532d",
    fontSize: 17,
    fontWeight: "900",
  },

  mapSubtitle: {
    marginTop: 2,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  mapAddress: {
    marginTop: 3,
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  mapContainer: {
    height: 240,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },

  freeSpotsBlock: {
    marginTop: 2,
    gap: 8,
  },

  freeSpotsTitle: {
    color: "#14532d",
    fontSize: 14,
    fontWeight: "900",
  },

  freeSpotRow: {
    gap: 4,
  },

  freeSpotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  freeSpotTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  freeSpotTitle: {
    color: "#14532d",
    fontSize: 12,
    fontWeight: "900",
  },

  freeSpotCoords: {
    marginTop: 2,
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "800",
  },

  freeSpotMeta: {
    marginLeft: 4,
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
  },

  freeSpotsEmpty: {
    marginTop: 2,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  freeSpotsEmptyText: {
    flex: 1,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  roomHint: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "900",
  },

  saveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  footerButtonPressed: {
    opacity: 0.8,
  },

  destinationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  changeDestinationButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  changeDestinationButtonText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "900",
  },

  selectedDestinationCard: {
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  selectedDestinationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDestinationTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  selectedDestinationLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },

  selectedDestinationCategory: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
  },

  selectedDestinationAddress: {
    marginTop: 3,
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f8fafc",
    zIndex: 50,
  },

  pickerContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  pickerHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },

  pickerTitle: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "900",
  },

  pickerSubtitle: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  pickerScroll: {
    flex: 1,
  },

  pickerScrollContent: {
    padding: 14,
    paddingBottom: 32,
    gap: 10,
  },
});

```


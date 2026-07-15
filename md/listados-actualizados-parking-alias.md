# Listados actualizados: Parking con alias público y userId interno

Cambios principales:

- `userId` real: lo calcula Convex Auth en backend y no se muestra.
- `parkingAlias`: lo elige el usuario y se muestra en Parking.
- `phone`: se guarda en `userProfiles` como dato privado opcional.
- Las queries de Parking no devuelven `userId` real; devuelven `alias` e `isOwnUser`.


## `convex/schema.js`

```js
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,


  userProfiles: defineTable({
    userId: v.string(),
    alias: v.string(),
    phone: v.optional(v.string()),
    phoneVisible: v.optional(v.boolean()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_alias", ["alias"])
    .index("by_phone", ["phone"]),

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


## `convex/users.js`

```js
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function cleanText(value) {
  return String(value || "").trim();
}

function cleanAlias(value) {
  const alias = cleanText(value);
  return alias ? alias.slice(0, 40) : "anonymous";
}

function cleanPhone(value) {
  const phone = cleanText(value);
  return phone ? phone.slice(0, 30) : undefined;
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

async function getProfileByUserId(ctx, userId) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);

    if (authUserId === null) {
      return null;
    }

    const user = await ctx.db.get(authUserId);

    if (!user) {
      return null;
    }

    const userId = String(authUserId);
    const profile = await getProfileByUserId(ctx, userId);

    return {
      _id: user._id,
      _creationTime: user._creationTime,

      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,

      emailVerificationTime: user.emailVerificationTime ?? null,
      phone: profile?.phone ?? user.phone ?? null,
      phoneVerificationTime: user.phoneVerificationTime ?? null,
      isAnonymous: user.isAnonymous ?? false,

      profile: profile
        ? {
            _id: profile._id,
            alias: profile.alias,
            phone: profile.phone ?? null,
            phoneVisible: profile.phoneVisible ?? false,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : null,
    };
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, String(userId));

    if (!profile) {
      return null;
    }

    return {
      _id: profile._id,
      alias: profile.alias,
      phone: profile.phone ?? null,
      phoneVisible: profile.phoneVisible ?? false,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  },
});

export const upsertMyProfile = mutation({
  args: {
    alias: v.string(),
    phone: v.optional(v.string()),
    phoneVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();

    const alias = cleanAlias(args.alias);
    const phone = cleanPhone(args.phone);
    const phoneVisible = args.phoneVisible === true;

    const existingProfile = await getProfileByUserId(ctx, userId);

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        alias,
        phone,
        phoneVisible,
        updatedAt: now,
      });

      return {
        ok: true,
        profileId: existingProfile._id,
      };
    }

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      alias,
      phone,
      phoneVisible,
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      profileId,
    };
  },
});

```


## `convex/parking.js`

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
    const authUserId = await getAuthUserId(ctx);
    const currentUserId = authUserId ? String(authUserId) : null;

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

    return messages.reverse().map((message) => ({
      _id: message._id,
      _creationTime: message._creationTime,
      city: message.city,
      zone: message.zone,
      alias: message.alias || "anonymous",
      text: message.text,
      createdAt: message.createdAt,
      status: message.status,
      parkingStatus: message.parkingStatus,
      lat: message.lat,
      lng: message.lng,
      accuracy: message.accuracy,
      locationSource: message.locationSource,
      destination: message.destination,
      isOwnUser: currentUserId ? message.userId === currentUserId : false,
    }));
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

    const authUserId = await getAuthUserId(ctx);
    const currentUserId = authUserId ? String(authUserId) : null;

    return presence
      .filter((item) => item.expiresAt > now)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((item) => ({
        _id: item._id,
        _creationTime: item._creationTime,
        city: item.city,
        zone: item.zone,
        alias: item.alias || "anonymous",
        status: item.status,
        lat: item.lat,
        lng: item.lng,
        accuracy: item.accuracy,
        locationSource: item.locationSource,
        updatedAt: item.updatedAt,
        expiresAt: item.expiresAt,
        isOwnUser: currentUserId ? item.userId === currentUserId : false,
      }));
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


## `src/screens/auth/RegisterScreen.js`

```js
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuthActions();
  const upsertMyProfile = useMutation(api.users.upsertMyProfile);

  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 900;
  const isTablet = width >= 700 && width < 900;
  const isSmallMobile = width < 390;

  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedAlias = alias.trim();
  const normalizedPhone = phone.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const aliasIsValid = normalizedAlias.length >= 3;
  const emailIsValid = normalizedEmail.includes("@");
  const passwordIsValid = password.length >= 8;

  const canSubmit = aliasIsValid && emailIsValid && passwordIsValid && !submitting;

  const layoutStyles = useMemo(() => {
    return {
      screen: [
        styles.screen,
        isDesktop && styles.screenDesktop,
        isTablet && styles.screenTablet,
      ],
      shell: [
        styles.shell,
        isDesktop && styles.shellDesktop,
        isTablet && styles.shellTablet,
      ],
      brandPanel: [
        styles.brandPanel,
        isDesktop && styles.brandPanelDesktop,
        !isDesktop && styles.brandPanelMobile,
      ],
      formPanel: [
        styles.formPanel,
        isDesktop && styles.formPanelDesktop,
        isTablet && styles.formPanelTablet,
        isSmallMobile && styles.formPanelSmallMobile,
      ],
      title: [
        styles.title,
        isDesktop && styles.titleDesktop,
        isSmallMobile && styles.titleSmallMobile,
      ],
      subtitle: [
        styles.subtitle,
        isDesktop && styles.subtitleDesktop,
        isSmallMobile && styles.subtitleSmallMobile,
      ],
    };
  }, [isDesktop, isTablet, isSmallMobile]);

  const handleRegister = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await signIn("password", {
        email: normalizedEmail,
        password,
        flow: "signUp",
      });

      try {
        await upsertMyProfile({
          alias: normalizedAlias,
          phone: normalizedPhone || undefined,
          phoneVisible: false,
        });
      } catch (profileError) {
        console.warn("Profile creation after sign up failed:", profileError);
      }
    } catch (error) {
      console.error("Register error:", error);

      setErrorMessage(
        "No se pudo crear la cuenta. Puede que el email ya esté registrado.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={layoutStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: height,
          },
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        <View style={layoutStyles.shell}>
          <View style={layoutStyles.brandPanel}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add-outline" size={42} color="#ffffff" />
            </View>

            <Text style={styles.brandTitle}>Shopp</Text>

            <Text style={styles.brandSubtitle}>
              Crea tu cuenta para sincronizar listas, tiendas, escaneos,
              historial y preferencias.
            </Text>

            {isDesktop ? (
              <View style={styles.desktopFeatureBox}>
                <View style={styles.featureRow}>
                  <Ionicons
                    name="cloud-done-outline"
                    size={20}
                    color="#bfdbfe"
                  />
                  <Text style={styles.featureText}>
                    Guarda tus datos de forma sincronizada.
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons name="cart-outline" size={20} color="#bfdbfe" />
                  <Text style={styles.featureText}>
                    Recupera tus listas desde otros dispositivos.
                  </Text>
                </View>

                <View style={styles.featureRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#bfdbfe"
                  />
                  <Text style={styles.featureText}>
                    Accede con tu email y contraseña.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={layoutStyles.formPanel}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="#64748b" />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>

            <Text style={layoutStyles.title}>Crear cuenta</Text>

            <Text style={layoutStyles.subtitle}>
              Regístrate para sincronizar tus datos de Shopp.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Alias público</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={alias}
                    onChangeText={setAlias}
                    placeholder="Ej. 4104-BZG"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="nickname"
                    maxLength={40}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.fieldHelp}>
                  Se mostrará en Chat y Parking. No uses tu nombre real si no
                  quieres identificarte.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Teléfono móvil opcional</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Solo si quieres añadir contacto"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    maxLength={30}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.fieldHelp}>
                  Se guarda privado. En Parking no se muestra salvo que lo
                  actives expresamente más adelante.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.passwordHintBox}>
                <Ionicons
                  name={
                    passwordIsValid
                      ? "checkmark-circle-outline"
                      : "information-circle-outline"
                  }
                  size={18}
                  color={passwordIsValid ? "#16a34a" : "#64748b"}
                />

                <Text
                  style={[
                    styles.helperText,
                    passwordIsValid && styles.helperTextValid,
                  ]}
                >
                  La contraseña debe tener al menos 8 caracteres.
                </Text>
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#991b1b"
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.primaryButton,
                  !canSubmit && styles.disabledButton,
                ]}
                onPress={handleRegister}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Crear cuenta</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </Pressable>

              <View style={styles.loginBox}>
                <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>

                <Pressable onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Entrar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  screenDesktop: {
    backgroundColor: "#e2e8f0",
  },

  screenTablet: {
    backgroundColor: "#eef2ff",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },

  scrollContentDesktop: {
    paddingHorizontal: 48,
    paddingVertical: 48,
  },

  shell: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },

  shellDesktop: {
    maxWidth: 1040,
    minHeight: 620,
    flexDirection: "row",
  },

  shellTablet: {
    maxWidth: 560,
  },

  brandPanel: {
    backgroundColor: "#2563eb",
  },

  brandPanelDesktop: {
    flex: 1,
    paddingHorizontal: 46,
    paddingVertical: 48,
    justifyContent: "center",
  },

  brandPanelMobile: {
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 28,
    alignItems: "center",
  },

  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },

  brandTitle: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
  },

  brandSubtitle: {
    marginTop: 12,
    maxWidth: 360,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#dbeafe",
    textAlign: "center",
  },

  desktopFeatureBox: {
    marginTop: 34,
    gap: 16,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  featureText: {
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "#eff6ff",
  },

  formPanel: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },

  formPanelDesktop: {
    flex: 1,
    paddingHorizontal: 52,
    paddingVertical: 48,
    justifyContent: "center",
  },

  formPanelTablet: {
    paddingHorizontal: 34,
    paddingVertical: 36,
  },

  formPanelSmallMobile: {
    paddingHorizontal: 18,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    paddingVertical: 6,
    paddingRight: 10,
  },

  backText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "left",
  },

  titleDesktop: {
    fontSize: 34,
    lineHeight: 40,
  },

  titleSmallMobile: {
    fontSize: 25,
    lineHeight: 31,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: "#64748b",
  },

  subtitleDesktop: {
    fontSize: 16,
    lineHeight: 24,
  },

  subtitleSmallMobile: {
    fontSize: 14,
    lineHeight: 20,
  },

  form: {
    marginTop: 28,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  inputBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    color: "#0f172a",
    outlineStyle: "none",
  },

  fieldHelp: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#64748b",
  },

  passwordHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -6,
    marginBottom: 18,
  },

  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#64748b",
  },

  helperTextValid: {
    color: "#16a34a",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#991b1b",
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2563eb",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 4,
  },

  disabledButton: {
    opacity: 0.55,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  loginBox: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  loginText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },

  loginLink: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2563eb",
  },
});

```


## `src/screens/parking/parkingPreferences.js`

```js
import AsyncStorage from "@react-native-async-storage/async-storage";

export const PARKING_PREFERENCES_KEY = "shopp_parking_preferences_v1";

export const DEFAULT_PARKING_CITY = "gijon";
export const DEFAULT_PARKING_DESTINATION = "palacio-deportes";
export const DEFAULT_PARKING_ALIAS = "anonymous";

function normalizeAlias(value) {
  const alias = String(value || "").trim();
  return alias || DEFAULT_PARKING_ALIAS;
}

export async function loadParkingPreferences() {
  try {
    const rawValue = await AsyncStorage.getItem(PARKING_PREFERENCES_KEY);

    if (!rawValue) {
      return {
        activeDestination: DEFAULT_PARKING_DESTINATION,
        parkingAlias: DEFAULT_PARKING_ALIAS,
      };
    }

    const parsedValue = JSON.parse(rawValue);

    // Compatibilidad con versiones anteriores: antes se guardaba como activeUserId.
    const alias = parsedValue?.parkingAlias || parsedValue?.activeUserId;

    return {
      activeDestination:
        parsedValue?.activeDestination || DEFAULT_PARKING_DESTINATION,
      parkingAlias: normalizeAlias(alias),
    };
  } catch (error) {
    console.error("Error cargando preferencias de parking:", error);

    return {
      activeDestination: DEFAULT_PARKING_DESTINATION,
      parkingAlias: DEFAULT_PARKING_ALIAS,
    };
  }
}

export async function saveParkingPreferences({
  activeDestination,
  parkingAlias,
  activeUserId,
}) {
  const cleanAlias = normalizeAlias(parkingAlias || activeUserId);

  try {
    const cleanPreferences = {
      activeDestination: activeDestination || DEFAULT_PARKING_DESTINATION,
      parkingAlias: cleanAlias,
    };

    await AsyncStorage.setItem(
      PARKING_PREFERENCES_KEY,
      JSON.stringify(cleanPreferences),
    );

    return cleanPreferences;
  } catch (error) {
    console.error("Error guardando preferencias de parking:", error);

    return {
      activeDestination: activeDestination || DEFAULT_PARKING_DESTINATION,
      parkingAlias: cleanAlias,
    };
  }
}

```


## `src/screens/parking/ParkingSettingsScreen.js`

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
  DEFAULT_PARKING_ALIAS,
  loadParkingPreferences,
  saveParkingPreferences,
} from "@/src/screens/parking/parkingPreferences";

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const DEFAULT_CITY = "gijon";
const DEFAULT_DESTINATION = "palacio-deportes";

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
  const [draftParkingAlias, setDraftParkingAlias] = useState(
    route?.params?.activeParkingAlias ||
      route?.params?.activeUserId ||
      DEFAULT_PARKING_ALIAS,
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

  const activeFriendsCount = destinationPresence.filter((item) => {
    return item.isOwnUser !== true;
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

    const cleanParkingAlias = draftParkingAlias.trim() || DEFAULT_PARKING_ALIAS;

    const nextSettings = {
      parkingAlias: cleanParkingAlias,
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
      parkingAlias: cleanParkingAlias,
    });

    await touchParkingPresence({
      city: "gijon",
      zone: selectedDestination,
      alias: cleanParkingAlias,
      status: "heading",
      lat: userCoords?.lat,
      lng: userCoords?.lng,
      locationSource: userCoords ? "gps" : "settings",
    });

    navigation.navigate(ROUTES.PARKING_SCREEN, {
      activeDestination: selectedDestination,
      parkingAlias: cleanParkingAlias,
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

      if (!route?.params?.activeParkingAlias && !route?.params?.activeUserId) {
        setDraftParkingAlias(preferences.parkingAlias);
      }
    }

    hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, [
    route?.params?.activeDestination,
    route?.params?.activeParkingAlias,
    route?.params?.activeUserId,
  ]);

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
              <Text style={styles.fieldLabel}>Alias público</Text>

              <TextInput
                value={draftParkingAlias}
                onChangeText={setDraftParkingAlias}
                placeholder="Ej. 4104-BZG"
                placeholderTextColor="#888"
                style={styles.usernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
              />

              <Text style={styles.fieldHelp}>
                Este alias se muestra a otros usuarios. El identificador real de
                Convex Auth queda oculto y solo se usa internamente.
              </Text>
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

  fieldHelp: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
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


## `src/screens/parking/ParkingScreen.js`

```js
// screens/ParkingScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import moment from "moment";
import "moment/locale/es";

import { safeAlert } from "@/src/components/ui/alert/safeAlert";
import { ROUTES } from "@/src/navigation/ROUTES";
import StoreMapPreview from "@/src/components/features/maps/StoreMapPreview";

moment.locale("es");

const PARKING_SETTINGS_STORAGE_KEY = "@shopp/parking/settings";
const PARKING_LOCAL_EVENTS_STORAGE_KEY = "@shopp/parking/events";
const PARKING_LOCAL_STATE_STORAGE_KEY = "@shopp/parking/current-state";

const PARKING_STATUS = {
  LOOKING: "looking",
  PARKED: "parked",
  LEAVING: "leaving",
  ABANDONED: "abandoned",
  CANCELLED: "cancelled",
  INACTIVE: "inactive",
};

const PARKING_STATUS_LABELS = {
  [PARKING_STATUS.LOOKING]: "Buscando plaza",
  [PARKING_STATUS.PARKED]: "Aparqué",
  [PARKING_STATUS.LEAVING]: "Salí / dejo plaza",
  [PARKING_STATUS.ABANDONED]: "Búsqueda abandonada",
  [PARKING_STATUS.CANCELLED]: "Búsqueda cancelada",
  [PARKING_STATUS.INACTIVE]: "Inactivo",
};

const PARKING_STATUS_DESCRIPTIONS = {
  [PARKING_STATUS.LOOKING]: "Estás buscando una plaza cerca de tu destino.",
  [PARKING_STATUS.PARKED]:
    "Has aparcado. Puedes compartir la posición aproximada de la plaza.",
  [PARKING_STATUS.LEAVING]:
    "Estás saliendo y puedes avisar de que esa plaza queda libre.",
  [PARKING_STATUS.ABANDONED]:
    "Has abandonado la búsqueda porque no encontraste aparcamiento.",
  [PARKING_STATUS.CANCELLED]: "Has cancelado una búsqueda iniciada por error.",
  [PARKING_STATUS.INACTIVE]: "No estás compartiendo actividad de parking.",
};

const PARKING_STATUS_COLORS = {
  [PARKING_STATUS.LOOKING]: "#2563eb",
  [PARKING_STATUS.PARKED]: "#16a34a",
  [PARKING_STATUS.LEAVING]: "#f97316",
  [PARKING_STATUS.ABANDONED]: "#7c3aed",
  [PARKING_STATUS.CANCELLED]: "#6b7280",
  [PARKING_STATUS.INACTIVE]: "#6b7280",
};

const LOCATION_WATCH_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60000,
  distanceInterval: 75,
};

const LOCATION_SINGLE_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
};

const WEB_LOCATION_POLL_INTERVAL_MS = 60000;
const WEB_LOCATION_DISTANCE_INTERVAL_METERS = 75;

const TRACKING_STATUSES = new Set([PARKING_STATUS.LOOKING]);

const STOPPED_STATUSES = new Set([
  PARKING_STATUS.PARKED,
  PARKING_STATUS.LEAVING,
  PARKING_STATUS.ABANDONED,
  PARKING_STATUS.CANCELLED,
  PARKING_STATUS.INACTIVE,
]);

const DEFAULT_REGION = {
  latitude: 43.5322,
  longitude: -5.6611,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

const DEFAULT_SETTINGS = {
  parkingAlias: "",
  destinationId: "",
  destinationName: "",
  destinationAddress: "",
  destinationLatitude: null,
  destinationLongitude: null,
  customDestination: "",
};

const DEFAULT_CURRENT_STATE = {
  status: PARKING_STATUS.LOOKING,
  latitude: null,
  longitude: null,
  accuracy: null,
  updatedAt: null,
};

function normalizeText(value) {
  return String(value || "").trim();
}

const capitalizeFirst = (text) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatDateTime = (value) => {
  if (!value) return "Sin datos";

  const date = moment(value);

  if (!date.isValid()) return "Fecha no válida";

  return capitalizeFirst(date.format("ddd D MMM HH:mm"));
};

const formatElapsedTime = (value) => {
  if (!value) return "Sin datos";

  const date = moment(value);

  if (!date.isValid()) return "Fecha no válida";

  return date.fromNow();
};

function getDisplayParkingAlias(settings) {
  const alias = normalizeText(settings?.parkingAlias || settings?.userId);
  return alias || "anonymous";
}

function getDisplayDestination(settings) {
  const destinationName = normalizeText(settings?.destinationName);
  const customDestination = normalizeText(settings?.customDestination);

  return destinationName || customDestination || "Sin destino definido";
}

function getAvailableNextStatuses(currentStatus) {
  switch (currentStatus) {
    case PARKING_STATUS.LOOKING:
      return [
        PARKING_STATUS.PARKED,
        PARKING_STATUS.ABANDONED,
        PARKING_STATUS.CANCELLED,
      ];

    case PARKING_STATUS.PARKED:
      return [PARKING_STATUS.LEAVING];

    case PARKING_STATUS.LEAVING:
    case PARKING_STATUS.ABANDONED:
    case PARKING_STATUS.CANCELLED:
    case PARKING_STATUS.INACTIVE:
      return [PARKING_STATUS.LOOKING];

    default:
      return [PARKING_STATUS.LOOKING];
  }
}

function isValidStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;

  const availableStatuses = getAvailableNextStatuses(currentStatus);
  return availableStatuses.includes(nextStatus);
}

function buildEventMessage(status, destination) {
  if (status === PARKING_STATUS.LOOKING) {
    return `Estoy buscando plaza cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.PARKED) {
    return `He aparcado cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.LEAVING) {
    return `Estoy saliendo. Puede quedar una plaza libre cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.ABANDONED) {
    return `Abandono la búsqueda porque no encontré aparcamiento cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.CANCELLED) {
    return `Cancelo la búsqueda iniciada por error cerca de ${destination}.`;
  }

  if (status === PARKING_STATUS.INACTIVE) {
    return `Estoy inactivo en Parking cerca de ${destination}.`;
  }

  return `Estado actualizado cerca de ${destination}.`;
}

function createLocalEvent({
  parkingAlias,
  status,
  destinationName,
  destinationAddress,
  note,
  latitude,
  longitude,
  accuracy,
}) {
  const now = Date.now();

  return {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    parkingAlias,
    status,
    destinationName,
    destinationAddress,
    note,
    latitude,
    longitude,
    accuracy,
    createdAt: now,
  };
}

function normalizeExpoLocation(location) {
  if (!location?.coords) return null;

  const latitude = Number(location.coords.latitude);
  const longitude = Number(location.coords.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy:
      typeof location.coords.accuracy === "number"
        ? location.coords.accuracy
        : null,
    updatedAt: Date.now(),
  };
}

function getDistanceMeters(fromLocation, toLocation) {
  if (
    typeof fromLocation?.latitude !== "number" ||
    typeof fromLocation?.longitude !== "number" ||
    typeof toLocation?.latitude !== "number" ||
    typeof toLocation?.longitude !== "number"
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;

  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(toLocation.latitude);
  const deltaLat = toRadians(toLocation.latitude - fromLocation.latitude);
  const deltaLng = toRadians(toLocation.longitude - fromLocation.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function StatusBadge({ status }) {
  const color = PARKING_STATUS_COLORS[status] || "#6b7280";

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusBadgeText, { color }]}>
        {PARKING_STATUS_LABELS[status] || "Sin estado"}
      </Text>
    </View>
  );
}

function LocationSummary({
  userLatitude,
  userLongitude,
  userAccuracy,
  destinationName,
  destinationAddress,
  destinationLatitude,
  destinationLongitude,
}) {
  const hasUserLocation =
    typeof userLatitude === "number" && typeof userLongitude === "number";

  const hasDestinationLocation =
    typeof destinationLatitude === "number" &&
    typeof destinationLongitude === "number";

  return (
    <View style={styles.locationSummaryBlock}>
      <Text style={styles.locationSummaryTitle}>Coordenadas del usuario</Text>

      {hasUserLocation ? (
        <View style={styles.coordsBox}>
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Latitud usuario</Text>
            <Text style={styles.coordValue}>{userLatitude.toFixed(6)}</Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Longitud usuario</Text>
            <Text style={styles.coordValue}>{userLongitude.toFixed(6)}</Text>
          </View>

          {typeof userAccuracy === "number" ? (
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Precisión</Text>
              <Text style={styles.coordValue}>
                {Math.round(userAccuracy)} m
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.locationEmpty}>
          <Ionicons name="location-outline" size={18} color="#6b7280" />
          <Text style={styles.locationEmptyText}>
            Todavía no hay coordenadas del usuario.
          </Text>
        </View>
      )}

      <Text
        style={[styles.locationSummaryTitle, styles.locationSummaryTitleSpaced]}
      >
        Coordenadas del destino
      </Text>

      {hasDestinationLocation ? (
        <View style={styles.coordsBox}>
          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Destino</Text>
            <Text style={styles.coordValue} numberOfLines={1}>
              {destinationName || "Destino"}
            </Text>
          </View>

          {destinationAddress ? (
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Dirección</Text>
              <Text style={styles.coordValue} numberOfLines={2}>
                {destinationAddress}
              </Text>
            </View>
          ) : null}

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Latitud destino</Text>
            <Text style={styles.coordValue}>
              {destinationLatitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.coordRow}>
            <Text style={styles.coordLabel}>Longitud destino</Text>
            <Text style={styles.coordValue}>
              {destinationLongitude.toFixed(6)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.locationEmpty}>
          <Ionicons name="navigate-outline" size={18} color="#6b7280" />
          <Text style={styles.locationEmptyText}>
            Todavía no hay coordenadas del destino.
          </Text>
        </View>
      )}
    </View>
  );
}

function LocationSection({
  expanded,
  onToggle,
  latitude,
  longitude,
  accuracy,
  onRefreshLocation,
  loadingLocation,
  selectedDestination,
  selectedDestinationName,
  selectedDestinationAddress,
  destinationCoords,
  mapCenter,
  userCoords,
  activeParkingSpots,
}) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.collapsibleHeader} onPress={onToggle}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="map-outline" size={22} color="#2563eb" />

          <View>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <Text style={styles.sectionSubtitle}>
              Coordenadas aproximadas de la plaza.
            </Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#111827"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.locationContent}>
          <LocationSummary
            userLatitude={latitude}
            userLongitude={longitude}
            userAccuracy={accuracy}
            destinationName={selectedDestinationName}
            destinationAddress={selectedDestinationAddress}
            destinationLatitude={destinationCoords?.lat}
            destinationLongitude={destinationCoords?.lng}
          />

          <Pressable
            style={[
              styles.secondaryActionButton,
              loadingLocation && styles.actionButtonDisabled,
            ]}
            onPress={onRefreshLocation}
            disabled={loadingLocation}
          >
            <Ionicons name="locate-outline" size={18} color="#2563eb" />

            <Text style={styles.secondaryActionButtonText}>
              {loadingLocation
                ? "Obteniendo ubicación..."
                : "Actualizar ubicación"}
            </Text>
          </Pressable>

          <View style={styles.mapContainer}>
            <StoreMapPreview
              key={`parking-map-${selectedDestination || "no-destination"}-${mapCenter.lat}-${mapCenter.lng}-${userCoords?.lat || "no-user"}-${userCoords?.lng || "no-user"}`}
              lat={mapCenter.lat}
              lng={mapCenter.lng}
              userLat={userCoords?.lat}
              userLng={userCoords?.lng}
              parkingSpots={activeParkingSpots}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EventCard({ event, isOwnUser }) {
  const color = PARKING_STATUS_COLORS[event.status] || "#6b7280";
  const hasLocation =
    typeof event.latitude === "number" && typeof event.longitude === "number";

  return (
    <View style={[styles.eventCard, isOwnUser && styles.eventCardOwn]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventUserBlock}>
          <Text style={styles.eventUser}>
            {event.parkingAlias || event.userId}
            {isOwnUser ? " (Tú)" : ""}
          </Text>

          <Text style={styles.eventDate}>
            {formatDateTime(event.createdAt)}
          </Text>
        </View>

        <View
          style={[styles.eventStatusPill, { backgroundColor: `${color}16` }]}
        >
          <Text style={[styles.eventStatusPillText, { color }]}>
            {PARKING_STATUS_LABELS[event.status] || "Estado"}
          </Text>
        </View>
      </View>

      <Text style={styles.eventMessage}>{event.note}</Text>

      {event.destinationName ? (
        <View style={styles.eventMetaRow}>
          <Ionicons name="navigate-outline" size={15} color="#6b7280" />
          <Text style={styles.eventMetaText}>{event.destinationName}</Text>
        </View>
      ) : null}

      {event.destinationAddress ? (
        <View style={styles.eventMetaRow}>
          <Ionicons name="business-outline" size={15} color="#6b7280" />
          <Text style={styles.eventMetaText}>{event.destinationAddress}</Text>
        </View>
      ) : null}

      {hasLocation ? (
        <View style={styles.eventCoords}>
          <Text style={styles.eventCoordsText}>
            {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ParkingScreen({ navigation }) {
  const scrollRef = useRef(null);
  const locationWatcherRef = useRef(null);
  const currentStateRef = useRef(DEFAULT_CURRENT_STATE);
  const latestUserLocationRef = useRef(null);
  const parkedSpotLocationRef = useRef(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentState, setCurrentState] = useState(DEFAULT_CURRENT_STATE);
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState(null);

  useEffect(() => {
    currentStateRef.current = currentState;

    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      latestUserLocationRef.current = {
        latitude: currentState.latitude,
        longitude: currentState.longitude,
        accuracy: currentState.accuracy,
        updatedAt: currentState.updatedAt,
      };

      if (currentState.status === PARKING_STATUS.PARKED) {
        parkedSpotLocationRef.current = {
          latitude: currentState.latitude,
          longitude: currentState.longitude,
          accuracy: currentState.accuracy,
          updatedAt: currentState.updatedAt,
        };
      }
    }
  }, [currentState]);

  const displayParkingAlias = useMemo(
    () => getDisplayParkingAlias(settings),
    [settings],
  );

  const displayDestination = useMemo(
    () => getDisplayDestination(settings),
    [settings],
  );

  const destinationAddress = useMemo(
    () => normalizeText(settings.destinationAddress),
    [settings.destinationAddress],
  );

  const destinationCoords = useMemo(() => {
    const lat = Number(settings.destinationLatitude);
    const lng = Number(settings.destinationLongitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }, [settings.destinationLatitude, settings.destinationLongitude]);

  const mapCenter = useMemo(() => {
    if (destinationCoords) {
      return destinationCoords;
    }

    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      return {
        lat: currentState.latitude,
        lng: currentState.longitude,
      };
    }

    return {
      lat: DEFAULT_REGION.latitude,
      lng: DEFAULT_REGION.longitude,
    };
  }, [destinationCoords, currentState.latitude, currentState.longitude]);

  const userCoords = useMemo(() => {
    if (
      typeof currentState.latitude === "number" &&
      typeof currentState.longitude === "number"
    ) {
      return {
        lat: currentState.latitude,
        lng: currentState.longitude,
      };
    }

    return null;
  }, [currentState.latitude, currentState.longitude]);

  const activeParkingSpots = useMemo(() => {
    return events
      .filter((event) => {
        return (
          event.status === PARKING_STATUS.LEAVING &&
          typeof event.latitude === "number" &&
          typeof event.longitude === "number"
        );
      })
      .map((event) => ({
        id: event.id,
        lat: event.latitude,
        lng: event.longitude,
        revealedBy: event.parkingAlias || event.userId,
        status: event.status,
        createdAt: event.createdAt,
      }));
  }, [events]);
  const availableNextStatuses = useMemo(
    () => getAvailableNextStatuses(currentState.status),
    [currentState.status],
  );

  const hasUserSettings = useMemo(() => {
    return Boolean(normalizeText(settings.parkingAlias || settings.userId));
  }, [settings.parkingAlias, settings.userId]);

  const hasDestination = useMemo(() => {
    return displayDestination !== "Sin destino definido";
  }, [displayDestination]);

  const canPublish = hasUserSettings && hasDestination;

  const persistCurrentState = useCallback(async (nextState) => {
    currentStateRef.current = nextState;
    setCurrentState(nextState);

    try {
      await AsyncStorage.setItem(
        PARKING_LOCAL_STATE_STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error saving current state:", error);
    }
  }, []);

  const persistEvents = useCallback(async (nextEvents) => {
    setEvents(nextEvents);

    try {
      await AsyncStorage.setItem(
        PARKING_LOCAL_EVENTS_STORAGE_KEY,
        JSON.stringify(nextEvents),
      );
    } catch (error) {
      console.warn("[ParkingScreen] Error saving events:", error);
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationPermissionStatus(permission.status);

    if (permission.status !== "granted") {
      safeAlert(
        "Permiso de ubicación necesario",
        "Activa la ubicación para poder compartir coordenadas de parking.",
      );

      return false;
    }

    return true;
  }, []);

  const stopLocationWatcher = useCallback(() => {
    const subscription = locationWatcherRef.current;
    locationWatcherRef.current = null;

    if (!subscription) {
      return;
    }

    try {
      if (typeof subscription.remove === "function") {
        subscription.remove();
      }
    } catch (error) {
      console.warn(
        "[ParkingScreen] Error stopping location watcher:",
        error?.message || error,
      );
    }
  }, []);

  const applyLocationToCurrentState = useCallback(
    async (location, options = {}) => {
      if (!location) return null;

      const nextState = {
        ...currentStateRef.current,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        updatedAt: location.updatedAt || Date.now(),
      };

      latestUserLocationRef.current = {
        latitude: nextState.latitude,
        longitude: nextState.longitude,
        accuracy: nextState.accuracy,
        updatedAt: nextState.updatedAt,
      };

      if (options.saveAsParkedSpot) {
        parkedSpotLocationRef.current = latestUserLocationRef.current;
      }

      await persistCurrentState(nextState);

      return latestUserLocationRef.current;
    },
    [persistCurrentState],
  );

  const readCurrentLocation = useCallback(async () => {
    const position = await Location.getCurrentPositionAsync(
      LOCATION_SINGLE_OPTIONS,
    );

    return normalizeExpoLocation(position);
  }, []);

  const getCurrentLocation = useCallback(
    async ({ persist = true, saveAsParkedSpot = false } = {}) => {
      try {
        setLoadingLocation(true);

        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
          return null;
        }

        const position = await Location.getCurrentPositionAsync(
          LOCATION_SINGLE_OPTIONS,
        );

        const normalizedLocation = normalizeExpoLocation(position);

        if (!normalizedLocation) {
          return null;
        }

        latestUserLocationRef.current = normalizedLocation;

        if (saveAsParkedSpot) {
          parkedSpotLocationRef.current = normalizedLocation;
        }

        if (persist) {
          await applyLocationToCurrentState(normalizedLocation, {
            saveAsParkedSpot,
          });
        }

        return normalizedLocation;
      } catch (error) {
        console.warn("[ParkingScreen] Error getting location:", error);

        safeAlert(
          "Ubicación no disponible",
          "No se ha podido obtener la ubicación actual.",
        );

        return null;
      } finally {
        setLoadingLocation(false);
      }
    },
    [applyLocationToCurrentState, requestLocationPermission],
  );

  const startLocationWatcher = useCallback(async () => {
    if (locationWatcherRef.current) {
      return;
    }

    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      return;
    }

    if (Platform.OS === "web") {
      try {
        const initialLocation = await readCurrentLocation();

        if (initialLocation) {
          await applyLocationToCurrentState(initialLocation);
        }
      } catch (error) {
        console.warn(
          "[ParkingScreen] Error getting initial web location:",
          error,
        );
      }

      const intervalId = setInterval(async () => {
        try {
          const activeStatus = currentStateRef.current?.status;

          if (activeStatus !== PARKING_STATUS.LOOKING) {
            stopLocationWatcher();
            return;
          }

          const nextLocation = await readCurrentLocation();

          if (!nextLocation) {
            return;
          }

          const previousLocation =
            latestUserLocationRef.current ||
            (typeof currentStateRef.current?.latitude === "number" &&
            typeof currentStateRef.current?.longitude === "number"
              ? {
                  latitude: currentStateRef.current.latitude,
                  longitude: currentStateRef.current.longitude,
                  accuracy: currentStateRef.current.accuracy,
                  updatedAt: currentStateRef.current.updatedAt,
                }
              : null);

          const distanceMeters = getDistanceMeters(
            previousLocation,
            nextLocation,
          );

          if (
            !previousLocation ||
            distanceMeters >= WEB_LOCATION_DISTANCE_INTERVAL_METERS
          ) {
            await applyLocationToCurrentState(nextLocation);
          }
        } catch (error) {
          console.warn(
            "[ParkingScreen] Error polling web location:",
            error?.message || error,
          );
        }
      }, WEB_LOCATION_POLL_INTERVAL_MS);

      locationWatcherRef.current = {
        remove: () => clearInterval(intervalId),
      };

      return;
    }

    try {
      const initialPosition = await Location.getCurrentPositionAsync(
        LOCATION_SINGLE_OPTIONS,
      );

      const initialLocation = normalizeExpoLocation(initialPosition);

      if (initialLocation) {
        await applyLocationToCurrentState(initialLocation);
      }
    } catch (error) {
      console.warn("[ParkingScreen] Error getting initial location:", error);
    }

    try {
      const subscription = await Location.watchPositionAsync(
        LOCATION_WATCH_OPTIONS,
        async (position) => {
          const watchedLocation = normalizeExpoLocation(position);

          if (!watchedLocation) {
            return;
          }

          const activeStatus = currentStateRef.current?.status;

          if (activeStatus !== PARKING_STATUS.LOOKING) {
            stopLocationWatcher();
            return;
          }

          await applyLocationToCurrentState(watchedLocation);
        },
      );

      locationWatcherRef.current = subscription;
    } catch (error) {
      console.warn("[ParkingScreen] Error starting location watcher:", error);

      safeAlert(
        "Ubicación no disponible",
        "No se ha podido iniciar el seguimiento de ubicación.",
      );
    }
  }, [
    applyLocationToCurrentState,
    readCurrentLocation,
    requestLocationPermission,
    stopLocationWatcher,
  ]);

  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PARKING_SETTINGS_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);
        const parkingAlias = parsed?.parkingAlias || parsed?.userId || "";

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          parkingAlias,
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.warn("[ParkingScreen] Error loading settings:", error);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  const loadLocalState = useCallback(async () => {
    try {
      const [rawState, rawEvents] = await Promise.all([
        AsyncStorage.getItem(PARKING_LOCAL_STATE_STORAGE_KEY),
        AsyncStorage.getItem(PARKING_LOCAL_EVENTS_STORAGE_KEY),
      ]);

      if (rawState) {
        const parsedState = JSON.parse(rawState);
        const nextState = {
          ...DEFAULT_CURRENT_STATE,
          ...parsedState,
        };

        currentStateRef.current = nextState;
        setCurrentState(nextState);
      }

      if (rawEvents) {
        const parsedEvents = JSON.parse(rawEvents);
        setEvents(Array.isArray(parsedEvents) ? parsedEvents : []);
      }
    } catch (error) {
      console.warn("[ParkingScreen] Error loading local parking data:", error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadLocalState();
  }, [loadSettings, loadLocalState]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => {
      loadSettings();
    });

    return unsubscribe;
  }, [navigation, loadSettings]);

  useEffect(() => {
    if (TRACKING_STATUSES.has(currentState.status)) {
      startLocationWatcher();
      return;
    }

    if (STOPPED_STATUSES.has(currentState.status)) {
      stopLocationWatcher();
    }
  }, [currentState.status, startLocationWatcher, stopLocationWatcher]);

  useEffect(() => {
    return () => {
      stopLocationWatcher();
    };
  }, [stopLocationWatcher]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    });
  };

  const openSettings = () => {
    if (navigation?.navigate) {
      navigation.navigate(ROUTES.PARKING_SETTINGS);
    }
  };

  const showInvalidTransitionAlert = (nextStatus) => {
    const currentLabel =
      PARKING_STATUS_LABELS[currentState.status] || currentState.status;
    const nextLabel = PARKING_STATUS_LABELS[nextStatus] || nextStatus;

    safeAlert(
      "Cambio de estado no permitido",
      `No puedes pasar directamente de "${currentLabel}" a "${nextLabel}".`,
    );
  };

  const updateLocationOnly = async () => {
    const location = await getCurrentLocation({
      persist: true,
      saveAsParkedSpot: currentState.status === PARKING_STATUS.PARKED,
    });

    if (location) {
      setLocationExpanded(true);
    }
  };

  const publishStatus = async (nextStatus) => {
    if (!canPublish) {
      safeAlert(
        "Configura Parking",
        "Antes de publicar tu estado, introduce un alias público y un destino en Ajustes.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Abrir Ajustes",
            onPress: openSettings,
          },
        ],
      );
      return;
    }

    if (!isValidStatusTransition(currentState.status, nextStatus)) {
      showInvalidTransitionAlert(nextStatus);
      return;
    }

    let nextLocation = {
      latitude: currentState.latitude,
      longitude: currentState.longitude,
      accuracy: currentState.accuracy,
      updatedAt: currentState.updatedAt,
    };

    if (nextStatus === PARKING_STATUS.LOOKING) {
      await startLocationWatcher();

      const freshLocation =
        latestUserLocationRef.current ||
        (await getCurrentLocation({ persist: true }));

      if (freshLocation) {
        nextLocation = freshLocation;
      }
    }

    if (nextStatus === PARKING_STATUS.PARKED) {
      const parkedLocation =
        latestUserLocationRef.current ||
        (await getCurrentLocation({
          persist: false,
          saveAsParkedSpot: true,
        }));

      if (parkedLocation) {
        nextLocation = parkedLocation;
        parkedSpotLocationRef.current = parkedLocation;
      }

      stopLocationWatcher();
    }

    if (nextStatus === PARKING_STATUS.LEAVING) {
      stopLocationWatcher();

      const releasedSpotLocation =
        parkedSpotLocationRef.current ||
        latestUserLocationRef.current ||
        nextLocation;

      if (
        typeof releasedSpotLocation?.latitude === "number" &&
        typeof releasedSpotLocation?.longitude === "number"
      ) {
        nextLocation = releasedSpotLocation;
      }
    }

    if (
      nextStatus === PARKING_STATUS.ABANDONED ||
      nextStatus === PARKING_STATUS.CANCELLED ||
      nextStatus === PARKING_STATUS.INACTIVE
    ) {
      stopLocationWatcher();
    }

    const cleanedNote = normalizeText(note);

    const event = createLocalEvent({
      parkingAlias: displayParkingAlias,
      status: nextStatus,
      destinationName: displayDestination,
      destinationAddress,
      note: cleanedNote || buildEventMessage(nextStatus, displayDestination),
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      accuracy: nextLocation.accuracy,
    });

    const nextState = {
      status: nextStatus,
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      accuracy: nextLocation.accuracy,
      updatedAt: Date.now(),
    };

    await persistCurrentState(nextState);
    await persistEvents([event, ...events].slice(0, 100));

    setNote("");
    setLocationExpanded(true);
    scrollToBottom();
  };

  const resetFlow = async () => {
    const latestLocation =
      latestUserLocationRef.current ||
      (await getCurrentLocation({ persist: false }));

    const nextState = {
      ...currentState,
      status: PARKING_STATUS.LOOKING,
      latitude:
        typeof latestLocation?.latitude === "number"
          ? latestLocation.latitude
          : currentState.latitude,
      longitude:
        typeof latestLocation?.longitude === "number"
          ? latestLocation.longitude
          : currentState.longitude,
      accuracy:
        typeof latestLocation?.accuracy === "number"
          ? latestLocation.accuracy
          : currentState.accuracy,
      updatedAt: Date.now(),
    };

    await persistCurrentState(nextState);
    await startLocationWatcher();

    const event = createLocalEvent({
      parkingAlias: displayParkingAlias,
      status: PARKING_STATUS.LOOKING,
      destinationName: displayDestination,
      destinationAddress,
      note: buildEventMessage(PARKING_STATUS.LOOKING, displayDestination),
      latitude: nextState.latitude,
      longitude: nextState.longitude,
      accuracy: nextState.accuracy,
    });

    await persistEvents([event, ...events].slice(0, 100));
    scrollToBottom();
  };

  const clearLocalEvents = () => {
    safeAlert(
      "Limpiar actividad",
      "¿Quieres borrar solo la actividad local de parking? Los ajustes no se borrarán.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(PARKING_LOCAL_EVENTS_STORAGE_KEY);
              setEvents([]);
            } catch (error) {
              console.warn("[ParkingScreen] Error clearing events:", error);
            }
          },
        },
      ],
    );
  };

  const renderStatusButton = (status, iconName) => {
    const active = currentState.status === status;
    const allowed = active || availableNextStatuses.includes(status);
    const color = PARKING_STATUS_COLORS[status];

    return (
      <Pressable
        key={status}
        style={[
          styles.statusButton,
          active && {
            backgroundColor: `${color}18`,
            borderColor: color,
          },
          !allowed && styles.statusButtonDisabled,
        ]}
        onPress={() => publishStatus(status)}
        disabled={!allowed}
      >
        <Ionicons
          name={iconName}
          size={20}
          color={allowed ? color : "#9ca3af"}
        />

        <View style={styles.statusButtonTextBlock}>
          <Text
            style={[
              styles.statusButtonTitle,
              active && { color },
              !allowed && styles.statusButtonTitleDisabled,
            ]}
          >
            {PARKING_STATUS_LABELS[status]}
          </Text>

          <Text
            style={[
              styles.statusButtonSubtitle,
              !allowed && styles.statusButtonSubtitleDisabled,
            ]}
          >
            {active
              ? "Estado actual"
              : allowed
                ? "Cambiar estado"
                : "No disponible"}
          </Text>
        </View>
      </Pressable>
    );
  };

  const canShowRestartButton =
    currentState.status === PARKING_STATUS.LEAVING ||
    currentState.status === PARKING_STATUS.ABANDONED ||
    currentState.status === PARKING_STATUS.CANCELLED ||
    currentState.status === PARKING_STATUS.INACTIVE;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Parking</Text>
            <Text style={styles.subtitle}>
              Comparte si estás buscando plaza, si aparcaste, si dejas una plaza
              libre o si abandonas la búsqueda.
            </Text>
          </View>

          <Pressable style={styles.settingsButton} onPress={openSettings}>
            <Ionicons name="settings-outline" size={22} color="#111827" />
          </Pressable>
        </View>

        {!settingsLoaded ? (
          <View style={styles.card}>
            <Text style={styles.loadingText}>Cargando ajustes...</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.currentHeader}>
            <View>
              <Text style={styles.cardEyebrow}>Estado actual</Text>
              <Text style={styles.currentUser}>{displayParkingAlias}</Text>
            </View>

            <StatusBadge status={currentState.status} />
          </View>

          <Text style={styles.currentDescription}>
            {PARKING_STATUS_DESCRIPTIONS[currentState.status]}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Destino</Text>
              <Text style={styles.infoValue}>{displayDestination}</Text>

              {destinationAddress ? (
                <Text style={styles.infoExtra}>{destinationAddress}</Text>
              ) : null}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Última actualización</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(currentState.updatedAt)}
              </Text>

              {currentState.updatedAt ? (
                <Text style={styles.infoExtra}>
                  {formatElapsedTime(currentState.updatedAt)}
                </Text>
              ) : null}
            </View>
          </View>

          {locationPermissionStatus === "denied" ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#b45309" />
              <Text style={styles.warningText}>
                El permiso de ubicación está denegado. Puedes seguir usando
                Parking, pero no se actualizará tu posición.
              </Text>
            </View>
          ) : null}

          {!hasUserSettings || !hasDestination ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#b45309" />
              <Text style={styles.warningText}>
                Falta configurar alias público o destino. Abre Ajustes antes de
                publicar.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color="#2563eb"
            />
            <Text style={styles.sectionTitle}>Cambiar estado</Text>
          </View>

          <View style={styles.statusButtons}>
            {renderStatusButton(PARKING_STATUS.LOOKING, "search-outline")}
            {renderStatusButton(PARKING_STATUS.PARKED, "car-outline")}
            {renderStatusButton(PARKING_STATUS.LEAVING, "exit-outline")}
            {renderStatusButton(PARKING_STATUS.ABANDONED, "walk-outline")}
            {renderStatusButton(
              PARKING_STATUS.CANCELLED,
              "close-circle-outline",
            )}
          </View>

          {canShowRestartButton ? (
            <Pressable style={styles.resetButton} onPress={resetFlow}>
              <Ionicons name="refresh-outline" size={18} color="#2563eb" />
              <Text style={styles.resetButtonText}>
                Empezar de nuevo como buscando plaza
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#2563eb"
            />
            <Text style={styles.sectionTitle}>Mensaje opcional</Text>
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ejemplo: estoy en doble fila, salgo en 2 minutos..."
            placeholderTextColor="#9ca3af"
            style={styles.noteInput}
            multiline
            maxLength={180}
          />

          <Text style={styles.charCounter}>{note.length}/180</Text>
        </View>

        <LocationSection
          expanded={locationExpanded}
          onToggle={() => setLocationExpanded((prev) => !prev)}
          latitude={currentState.latitude}
          longitude={currentState.longitude}
          accuracy={currentState.accuracy}
          onRefreshLocation={updateLocationOnly}
          loadingLocation={loadingLocation}
          selectedDestination={settings.destinationId}
          selectedDestinationName={displayDestination}
          selectedDestinationAddress={destinationAddress}
          destinationCoords={destinationCoords}
          mapCenter={mapCenter}
          userCoords={userCoords}
          activeParkingSpots={activeParkingSpots}
        />

        <View style={styles.card}>
          <View style={styles.activityHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={22} color="#2563eb" />

              <View>
                <Text style={styles.sectionTitle}>Actividad</Text>
                <Text style={styles.sectionSubtitle}>
                  Últimos cambios de estado de parking.
                </Text>
              </View>
            </View>

            {events.length > 0 ? (
              <Pressable onPress={clearLocalEvents}>
                <Text style={styles.clearText}>Limpiar</Text>
              </Pressable>
            ) : null}
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbox-outline" size={24} color="#9ca3af" />
              <Text style={styles.emptyTitle}>Sin actividad todavía</Text>
              <Text style={styles.emptyText}>
                Publica un estado para crear el primer mensaje.
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isOwnUser={(event.parkingAlias || event.userId) === displayParkingAlias}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },

  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",

    ...Platform.select({
      web: {
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",

    ...Platform.select({
      web: {
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },

  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },

  currentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  cardEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  currentUser: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  currentDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
    marginBottom: 14,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  infoGrid: {
    gap: 10,
  },

  infoBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  infoExtra: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },

  warningBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },

  statusButtons: {
    gap: 10,
  },

  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },

  statusButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    opacity: 0.7,
  },

  statusButtonTextBlock: {
    flex: 1,
  },

  statusButtonTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 2,
  },

  statusButtonTitleDisabled: {
    color: "#9ca3af",
  },

  statusButtonSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },

  statusButtonSubtitleDisabled: {
    color: "#9ca3af",
  },

  resetButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  resetButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },

  noteInput: {
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    color: "#111827",
    textAlignVertical: "top",
  },

  charCounter: {
    alignSelf: "flex-end",
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },

  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  locationContent: {
    marginTop: 14,
  },

  locationEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  locationEmptyText: {
    flex: 1,
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "700",
  },

  coordsBox: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },

  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  coordLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "800",
  },

  coordValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "900",
  },

  secondaryActionButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },

  actionButtonDisabled: {
    opacity: 0.6,
  },

  mapContainer: {
    marginTop: 12,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#e5e7eb",
  },

  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  clearText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#b91c1c",
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  emptyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
  },

  eventsList: {
    gap: 10,
  },

  eventCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },

  eventCardOwn: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },

  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  eventUserBlock: {
    flex: 1,
  },

  eventUser: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  eventDate: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },

  eventStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },

  eventStatusPillText: {
    fontSize: 11,
    fontWeight: "900",
  },

  eventMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 8,
  },

  eventMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },

  eventMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
    fontWeight: "700",
  },

  eventCoords: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  eventCoordsText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "900",
  },

  locationSummaryBlock: {
    gap: 8,
  },

  locationSummaryTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  locationSummaryTitleSpaced: {
    marginTop: 10,
  },
});

export {
  PARKING_SETTINGS_STORAGE_KEY,
  PARKING_LOCAL_EVENTS_STORAGE_KEY,
  PARKING_LOCAL_STATE_STORAGE_KEY,
  PARKING_STATUS,
  PARKING_STATUS_LABELS,
};

```

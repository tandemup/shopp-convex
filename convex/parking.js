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

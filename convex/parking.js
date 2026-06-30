import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_CITY = "Gijón";
const DEFAULT_ZONE = "general";
const DEFAULT_USER_ID = "anonymous";

const LOOKING_TTL_MS = 10 * 60 * 1000;
const FREE_SPOT_TTL_MS = 10 * 60 * 1000;

const DEFAULT_OCCUPY_RADIUS_METERS = 35;
const DEFAULT_DUPLICATE_RADIUS_METERS = 10;

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_LIMIT = 200;
const MAX_SPOTS_LIMIT = 300;

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

function cleanText(value) {
  return String(value || "").trim();
}

function cleanCity(value) {
  return cleanText(value) || DEFAULT_CITY;
}

function cleanZone(value) {
  return cleanText(value) || DEFAULT_ZONE;
}

function cleanUserId(value) {
  return cleanText(value) || DEFAULT_USER_ID;
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

export const sendParkingMessage = mutation({
  args: {
    city: v.string(),
    zone: v.string(),
    userId: v.string(),
    text: v.string(),

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
    const userId = cleanUserId(args.userId);
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
      text,

      status: args.status,

      lat: hasCoords ? args.lat : undefined,
      lng: hasCoords ? args.lng : undefined,
      accuracy,
      locationSource,

      createdAt: now,
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
    userId: v.string(),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const spot = await ctx.db.get(args.spotId);

    if (!spot) {
      throw new Error("La plaza no existe.");
    }

    await ctx.db.patch(args.spotId, {
      status: "occupied",
      occupiedBy: cleanUserId(args.userId),
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
    userId: v.string(),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const spot = await ctx.db.get(args.spotId);

    if (!spot) {
      throw new Error("La plaza no existe.");
    }

    await ctx.db.patch(args.spotId, {
      status: "free",

      revealedBy: cleanUserId(args.userId),
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

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_CITY = "gijon";
const DEFAULT_ZONE = "general";

const LOOKING_TTL_MS = 10 * 60 * 1000;
const FREE_SPOT_TTL_MS = 10 * 60 * 1000;
const OCCUPIED_SPOT_TTL_MS = 60 * 60 * 1000;
const PRESENCE_TTL_MS = 10 * 60 * 1000;
const WATCHER_TTL_MS = 20 * 60 * 1000;
const PARKING_NOTIFICATION_TTL_MS = 10 * 60 * 1000;

const DEFAULT_OCCUPY_RADIUS_METERS = 35;
const DEFAULT_DUPLICATE_RADIUS_METERS = 10;
const DEFAULT_NOTIFICATION_RADIUS_METERS = 350;

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_LIMIT = 200;
const MAX_SPOTS_LIMIT = 300;
const MAX_PRESENCE_LIMIT = 200;
const MAX_NOTIFICATIONS_LIMIT = 100;

const parkingMessageStatusValidator = v.union(
  v.literal("looking"),
  v.literal("parked"),
  v.literal("leaving"),
);

const parkingSpotStatusValidator = v.union(
  v.literal("free"),
  v.literal("occupied"),
  v.literal("leaving"),
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

  return Math.max(1, Math.min(numericValue, 2000));
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

function buildAreaKey(lat, lng) {
  if (!hasValidCoords(lat, lng)) {
    return `${DEFAULT_CITY}:${DEFAULT_ZONE}`;
  }

  return `${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}`;
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
    const spotLat = typeof spot.lat === "number" ? spot.lat : spot.latitude;

    const spotLng = typeof spot.lng === "number" ? spot.lng : spot.longitude;

    const distance = distanceMeters(lat, lng, spotLat, spotLng);

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

async function incrementAreaParkedCount(ctx, { city, zone, lat, lng }) {
  const now = Date.now();
  const areaKey = buildAreaKey(lat, lng);

  const existing = await ctx.db
    .query("parkingAreaStats")
    .withIndex("by_areaKey", (q) => q.eq("areaKey", areaKey))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      parkedCount: (existing.parkedCount || 0) + 1,
      updatedAt: now,
    });

    return existing._id;
  }

  return await ctx.db.insert("parkingAreaStats", {
    areaKey,
    city,
    zone,
    parkedCount: 1,
    leavingCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

async function moveAreaParkedToLeaving(ctx, { city, zone, lat, lng }) {
  const now = Date.now();
  const areaKey = buildAreaKey(lat, lng);

  const existing = await ctx.db
    .query("parkingAreaStats")
    .withIndex("by_areaKey", (q) => q.eq("areaKey", areaKey))
    .first();

  if (!existing) {
    return null;
  }

  await ctx.db.patch(existing._id, {
    parkedCount: Math.max(0, (existing.parkedCount || 0) - 1),
    leavingCount: (existing.leavingCount || 0) + 1,
    updatedAt: now,
  });

  return existing._id;
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

    location: hasCoords
      ? {
          lat: payload.lat,
          lng: payload.lng,
          source: locationSource,
        }
      : undefined,

    updatedAt: now,
    expiresAt: now + PRESENCE_TTL_MS,
  };

  if (existingPresence) {
    await ctx.db.patch(existingPresence._id, presenceData);

    return existingPresence._id;
  }

  return await ctx.db.insert("parkingPresence", {
    ...presenceData,
    createdAt: now,
  });
}

async function markWatcherInactiveByIdentity(ctx, { userId, alias }) {
  const parkingAlias = cleanAlias(alias) || userId;

  const existing = await ctx.db
    .query("parkingWatchers")
    .withIndex("by_parkingAlias", (q) => q.eq("parkingAlias", parkingAlias))
    .first();

  if (!existing) {
    return null;
  }

  const now = Date.now();

  await ctx.db.patch(existing._id, {
    status: "inactive",
    updatedAt: now,
    expiresAt: now,
  });

  return existing._id;
}

async function notifyNearbyLookingDrivers(
  ctx,
  {
    ownerUserId,
    ownerAlias,
    city,
    zone,
    lat,
    lng,
    spotId,
    destinationName,
    destinationAddress,
  },
) {
  const now = Date.now();

  const watchers = await ctx.db
    .query("parkingWatchers")
    .withIndex("by_status", (q) => q.eq("status", "looking"))
    .collect();

  const nearbyWatchers = watchers.filter((watcher) => {
    if (watcher.expiresAt && watcher.expiresAt <= now) {
      return false;
    }

    if (ownerAlias && watcher.parkingAlias === ownerAlias) {
      return false;
    }

    if (ownerUserId && watcher.userId === ownerUserId) {
      return false;
    }

    const watcherLat =
      typeof watcher.latitude === "number" ? watcher.latitude : watcher.lat;

    const watcherLng =
      typeof watcher.longitude === "number" ? watcher.longitude : watcher.lng;

    if (!hasValidCoords(watcherLat, watcherLng)) {
      return false;
    }

    const radius = clampRadius(
      watcher.radiusMeters,
      DEFAULT_NOTIFICATION_RADIUS_METERS,
    );

    return distanceMeters(lat, lng, watcherLat, watcherLng) <= radius;
  });

  await Promise.all(
    nearbyWatchers.map((watcher) =>
      ctx.db.insert("parkingNotifications", {
        recipientAlias: watcher.parkingAlias,
        recipientUserId: watcher.userId,

        type: "spot_released",
        spotId,

        title: "Plaza liberada cerca",
        body: `Un conductor está dejando una plaza cerca de ${
          destinationName || watcher.destinationName || "tu zona de búsqueda"
        }.`,

        latitude: lat,
        longitude: lng,
        lat,
        lng,

        city,
        zone,
        areaKey: buildAreaKey(lat, lng),

        read: false,
        createdAt: now,
        expiresAt: now + PARKING_NOTIFICATION_TTL_MS,
      }),
    ),
  );

  return nearbyWatchers.length;
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

    return spots.sort((a, b) => (b.revealedAt || 0) - (a.revealedAt || 0));
  },
});

export const listReleasedParkingSpots = query({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    radiusMeters: v.optional(v.float64()),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const city = args.city ? cleanCity(args.city) : null;
    const zone = args.zone ? cleanZone(args.zone) : null;
    const limit = clampLimit(args.limit, 50, 1, MAX_SPOTS_LIMIT);
    const radius = clampRadius(
      args.radiusMeters,
      DEFAULT_NOTIFICATION_RADIUS_METERS,
    );

    const candidates = await ctx.db
      .query("parkingSpots")
      .withIndex("by_status_updatedAt", (q) => q.eq("status", "free"))
      .order("desc")
      .take(MAX_SPOTS_LIMIT);

    return candidates
      .filter((spot) => {
        if (spot.expiresAt && spot.expiresAt <= now) {
          return false;
        }

        if (city && spot.city !== city) {
          return false;
        }

        if (zone && spot.zone !== zone) {
          return false;
        }

        if (hasValidCoords(args.lat, args.lng)) {
          const spotLat =
            typeof spot.lat === "number" ? spot.lat : spot.latitude;

          const spotLng =
            typeof spot.lng === "number" ? spot.lng : spot.longitude;

          return distanceMeters(args.lat, args.lng, spotLat, spotLng) <= radius;
        }

        return true;
      })
      .slice(0, limit);
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

export const upsertLookingWatcher = mutation({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    alias: v.optional(v.string()),

    lat: v.float64(),
    lng: v.float64(),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),

    radiusMeters: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const userId = await requireAuthUserId(ctx);
    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const parkingAlias = cleanAlias(args.alias) || userId;

    if (!hasValidCoords(args.lat, args.lng)) {
      throw new Error("Coordenadas no válidas.");
    }

    const existing = await ctx.db
      .query("parkingWatchers")
      .withIndex("by_parkingAlias", (q) => q.eq("parkingAlias", parkingAlias))
      .first();

    const accuracy = safeAccuracy(args.accuracy);
    const radiusMeters = clampRadius(
      args.radiusMeters,
      DEFAULT_NOTIFICATION_RADIUS_METERS,
    );

    const payload = {
      userId,
      parkingAlias,

      city,
      zone,
      areaKey: buildAreaKey(args.lat, args.lng),

      latitude: args.lat,
      longitude: args.lng,
      lat: args.lat,
      lng: args.lng,
      accuracy,

      destinationName: cleanText(args.destinationName) || undefined,
      destinationAddress: cleanText(args.destinationAddress) || undefined,

      status: "looking",
      radiusMeters,

      updatedAt: now,
      expiresAt: now + WATCHER_TTL_MS,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);

      return {
        ok: true,
        watcherId: existing._id,
      };
    }

    const watcherId = await ctx.db.insert("parkingWatchers", {
      ...payload,
      createdAt: now,
    });

    return {
      ok: true,
      watcherId,
    };
  },
});

export const markInactiveWatcher = mutation({
  args: {
    alias: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const watcherId = await markWatcherInactiveByIdentity(ctx, {
      userId,
      alias: args.alias,
    });

    return {
      ok: true,
      watcherId,
    };
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

    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),
    watcherRadiusMeters: v.optional(v.float64()),
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
    const ownerAlias = alias || userId;

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
      parkingStatus: args.status,

      lat: hasCoords ? args.lat : undefined,
      lng: hasCoords ? args.lng : undefined,
      accuracy,
      locationSource,

      location: hasCoords
        ? {
            lat: args.lat,
            lng: args.lng,
            source: locationSource,
          }
        : undefined,

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

    if (args.status === "looking" && hasCoords) {
      const existingWatcher = await ctx.db
        .query("parkingWatchers")
        .withIndex("by_parkingAlias", (q) => q.eq("parkingAlias", ownerAlias))
        .first();

      const watcherPayload = {
        userId,
        parkingAlias: ownerAlias,

        city,
        zone,
        areaKey: buildAreaKey(args.lat, args.lng),

        latitude: args.lat,
        longitude: args.lng,
        lat: args.lat,
        lng: args.lng,
        accuracy,

        destinationName: cleanText(args.destinationName) || undefined,
        destinationAddress: cleanText(args.destinationAddress) || undefined,

        status: "looking",
        radiusMeters: clampRadius(
          args.watcherRadiusMeters,
          DEFAULT_NOTIFICATION_RADIUS_METERS,
        ),

        updatedAt: now,
        expiresAt: now + WATCHER_TTL_MS,
      };

      if (existingWatcher) {
        await ctx.db.patch(existingWatcher._id, watcherPayload);
      } else {
        await ctx.db.insert("parkingWatchers", {
          ...watcherPayload,
          createdAt: now,
        });
      }
    }

    if (args.status === "leaving" && hasCoords) {
      let releasedSpotId = null;

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
          latitude: args.lat,
          longitude: args.lng,
          accuracy,
          locationSource,

          location: {
            lat: args.lat,
            lng: args.lng,
            source: locationSource,
          },

          status: "free",
          revealedBy: userId,
          releasedBy: userId,
          revealedAt: now,
          releasedAt: now,
          updatedAt: now,
          expiresAt: now + FREE_SPOT_TTL_MS,

          occupiedBy: undefined,
          occupiedAt: undefined,

          sourceMessageId: messageId,
        });

        releasedSpotId = nearest.spot._id;
      } else {
        releasedSpotId = await ctx.db.insert("parkingSpots", {
          city,
          zone,
          areaKey: buildAreaKey(args.lat, args.lng),

          userId,
          ownerAlias,
          parkingAlias: ownerAlias,

          alias,
          destination: cleanText(args.destinationName) || undefined,
          destinationName: cleanText(args.destinationName) || undefined,
          destinationAddress: cleanText(args.destinationAddress) || undefined,

          lat: args.lat,
          lng: args.lng,
          latitude: args.lat,
          longitude: args.lng,
          accuracy,
          locationSource,

          location: {
            lat: args.lat,
            lng: args.lng,
            source: locationSource,
          },

          status: "free",

          revealedBy: userId,
          releasedBy: userId,

          revealedAt: now,
          releasedAt: now,

          occupiedBy: undefined,
          occupiedAt: undefined,

          createdAt: now,
          updatedAt: now,
          expiresAt: now + FREE_SPOT_TTL_MS,

          sourceMessageId: messageId,
        });
      }

      await moveAreaParkedToLeaving(ctx, {
        city,
        zone,
        lat: args.lat,
        lng: args.lng,
      });

      const notifiedCount = await notifyNearbyLookingDrivers(ctx, {
        ownerUserId: userId,
        ownerAlias,
        city,
        zone,
        lat: args.lat,
        lng: args.lng,
        spotId: releasedSpotId,
        destinationName: cleanText(args.destinationName) || undefined,
        destinationAddress: cleanText(args.destinationAddress) || undefined,
      });

      await markWatcherInactiveByIdentity(ctx, {
        userId,
        alias,
      });

      return {
        ok: true,
        messageId,
        spotId: releasedSpotId,
        notifiedCount,
      };
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

      let occupiedSpotId = null;

      if (nearest.spot) {
        await ctx.db.patch(nearest.spot._id, {
          lat: args.lat,
          lng: args.lng,
          latitude: args.lat,
          longitude: args.lng,
          accuracy,
          locationSource,

          location: {
            lat: args.lat,
            lng: args.lng,
            source: locationSource,
          },

          status: "occupied",
          occupiedBy: userId,
          occupiedAt: now,

          ownerAlias,
          parkingAlias: ownerAlias,
          alias,

          updatedAt: now,
          expiresAt: now + OCCUPIED_SPOT_TTL_MS,

          sourceMessageId: messageId,
        });

        occupiedSpotId = nearest.spot._id;
      } else {
        occupiedSpotId = await ctx.db.insert("parkingSpots", {
          city,
          zone,
          areaKey: buildAreaKey(args.lat, args.lng),

          userId,
          ownerAlias,
          parkingAlias: ownerAlias,

          alias,
          destination: cleanText(args.destinationName) || undefined,
          destinationName: cleanText(args.destinationName) || undefined,
          destinationAddress: cleanText(args.destinationAddress) || undefined,

          lat: args.lat,
          lng: args.lng,
          latitude: args.lat,
          longitude: args.lng,
          accuracy,
          locationSource,

          location: {
            lat: args.lat,
            lng: args.lng,
            source: locationSource,
          },

          status: "occupied",

          occupiedBy: userId,
          occupiedAt: now,

          revealedBy: undefined,
          revealedAt: undefined,

          createdAt: now,
          updatedAt: now,
          expiresAt: now + OCCUPIED_SPOT_TTL_MS,

          sourceMessageId: messageId,
        });
      }

      await incrementAreaParkedCount(ctx, {
        city,
        zone,
        lat: args.lat,
        lng: args.lng,
      });

      await markWatcherInactiveByIdentity(ctx, {
        userId,
        alias,
      });

      return {
        ok: true,
        messageId,
        spotId: occupiedSpotId,
      };
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

export const expireOldWatchers = mutation({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const expiredWatchers = await ctx.db
      .query("parkingWatchers")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .collect();

    const city = args.city ? cleanCity(args.city) : null;
    const zone = args.zone ? cleanZone(args.zone) : null;

    const filteredWatchers = expiredWatchers.filter((watcher) => {
      const sameCity = city ? watcher.city === city : true;
      const sameZone = zone ? watcher.zone === zone : true;

      return watcher.status === "looking" && sameCity && sameZone;
    });

    for (const watcher of filteredWatchers) {
      await ctx.db.patch(watcher._id, {
        status: "inactive",
        updatedAt: now,
      });
    }

    return {
      ok: true,
      updated: filteredWatchers.length,
    };
  },
});

export const expireOldParkingNotifications = mutation({
  args: {},

  handler: async (ctx) => {
    const now = Date.now();

    const expiredNotifications = await ctx.db
      .query("parkingNotifications")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .collect();

    for (const notification of expiredNotifications) {
      await ctx.db.delete(notification._id);
    }

    return {
      ok: true,
      deleted: expiredNotifications.length,
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
      expiresAt: now + OCCUPIED_SPOT_TTL_MS,
    });

    if (hasValidCoords(spot.lat, spot.lng)) {
      await incrementAreaParkedCount(ctx, {
        city: spot.city || DEFAULT_CITY,
        zone: spot.zone || DEFAULT_ZONE,
        lat: spot.lat,
        lng: spot.lng,
      });
    }

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

    const lat = typeof spot.lat === "number" ? spot.lat : spot.latitude;
    const lng = typeof spot.lng === "number" ? spot.lng : spot.longitude;

    await ctx.db.patch(args.spotId, {
      status: "free",

      revealedBy: userId,
      releasedBy: userId,
      revealedAt: now,
      releasedAt: now,

      occupiedBy: undefined,
      occupiedAt: undefined,

      updatedAt: now,
      expiresAt: now + FREE_SPOT_TTL_MS,
    });

    if (hasValidCoords(lat, lng)) {
      await moveAreaParkedToLeaving(ctx, {
        city: spot.city || DEFAULT_CITY,
        zone: spot.zone || DEFAULT_ZONE,
        lat,
        lng,
      });

      const notifiedCount = await notifyNearbyLookingDrivers(ctx, {
        ownerUserId: userId,
        ownerAlias: spot.ownerAlias || spot.parkingAlias || spot.alias,
        city: spot.city || DEFAULT_CITY,
        zone: spot.zone || DEFAULT_ZONE,
        lat,
        lng,
        spotId: args.spotId,
        destinationName: spot.destinationName || spot.destination,
        destinationAddress: spot.destinationAddress,
      });

      return {
        ok: true,
        notifiedCount,
      };
    }

    return {
      ok: true,
      notifiedCount: 0,
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

export const listMyParkingNotifications = query({
  args: {
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const limit = clampLimit(args.limit, 20, 1, MAX_NOTIFICATIONS_LIMIT);

    const notificationsByUserId = await ctx.db
      .query("parkingNotifications")
      .withIndex("by_recipientUserId", (q) => q.eq("recipientUserId", userId))
      .order("desc")
      .take(limit);

    return notificationsByUserId;
  },
});

export const listMyParkingNotificationsByAlias = query({
  args: {
    alias: v.string(),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const alias = cleanAlias(args.alias);

    if (!alias) {
      return [];
    }

    const limit = clampLimit(args.limit, 20, 1, MAX_NOTIFICATIONS_LIMIT);

    return await ctx.db
      .query("parkingNotifications")
      .withIndex("by_recipientAlias", (q) => q.eq("recipientAlias", alias))
      .order("desc")
      .take(limit);
  },
});

export const markParkingNotificationRead = mutation({
  args: {
    notificationId: v.id("parkingNotifications"),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("La notificación no existe.");
    }

    if (
      notification.recipientUserId &&
      notification.recipientUserId !== userId
    ) {
      throw new Error("No puedes modificar esta notificación.");
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
    });

    return {
      ok: true,
    };
  },
});

export const listParkingAreaStats = query({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const city = args.city ? cleanCity(args.city) : null;
    const zone = args.zone ? cleanZone(args.zone) : null;
    const limit = clampLimit(args.limit, 100, 1, 300);

    if (city && zone) {
      return await ctx.db
        .query("parkingAreaStats")
        .withIndex("by_city_zone", (q) => q.eq("city", city).eq("zone", zone))
        .take(limit);
    }

    return await ctx.db.query("parkingAreaStats").take(limit);
  },
});

export const createValidParkingSpot = mutation({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),

    alias: v.optional(v.string()),

    lat: v.float64(),
    lng: v.float64(),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await requireAuthUserId(ctx);

    const city = cleanCity(args.city);
    const zone = cleanZone(args.zone);
    const alias = cleanAlias(args.alias);
    const accuracy = safeAccuracy(args.accuracy);
    const locationSource = safeLocationSource(args.locationSource);

    if (!hasValidCoords(args.lat, args.lng)) {
      throw new Error("Coordenadas no válidas.");
    }

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
        latitude: args.lat,
        longitude: args.lng,
        accuracy,
        locationSource,

        location: {
          lat: args.lat,
          lng: args.lng,
          source: locationSource,
        },

        status: "free",

        revealedBy: userId,
        releasedBy: userId,
        revealedAt: now,
        releasedAt: now,

        alias,
        ownerAlias: alias || userId,
        parkingAlias: alias || userId,

        destination: cleanText(args.destinationName) || undefined,
        destinationName: cleanText(args.destinationName) || undefined,
        destinationAddress: cleanText(args.destinationAddress) || undefined,

        updatedAt: now,
        expiresAt: now + FREE_SPOT_TTL_MS,
      });

      return {
        ok: true,
        spotId: nearest.spot._id,
        updated: true,
      };
    }

    const spotId = await ctx.db.insert("parkingSpots", {
      city,
      zone,
      areaKey: buildAreaKey(args.lat, args.lng),

      userId,
      ownerAlias: alias || userId,
      parkingAlias: alias || userId,

      alias,
      destination: cleanText(args.destinationName) || undefined,
      destinationName: cleanText(args.destinationName) || undefined,
      destinationAddress: cleanText(args.destinationAddress) || undefined,

      lat: args.lat,
      lng: args.lng,
      latitude: args.lat,
      longitude: args.lng,
      accuracy,
      locationSource,

      location: {
        lat: args.lat,
        lng: args.lng,
        source: locationSource,
      },

      status: "free",

      revealedBy: userId,
      releasedBy: userId,

      revealedAt: now,
      releasedAt: now,

      occupiedBy: undefined,
      occupiedAt: undefined,

      createdAt: now,
      updatedAt: now,
      expiresAt: now + FREE_SPOT_TTL_MS,
    });

    return {
      ok: true,
      spotId,
      updated: false,
    };
  },
});

export const listValidParkingSpots = query({
  args: {
    city: v.optional(v.string()),
    zone: v.optional(v.string()),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    radiusMeters: v.optional(v.float64()),

    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const city = args.city ? cleanCity(args.city) : DEFAULT_CITY;
    const zone = args.zone ? cleanZone(args.zone) : DEFAULT_ZONE;
    const limit = clampLimit(args.limit, 100, 1, MAX_SPOTS_LIMIT);
    const radius = clampRadius(args.radiusMeters, 800);

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

    return spots
      .filter((spot) => {
        const spotLat = typeof spot.lat === "number" ? spot.lat : spot.latitude;

        const spotLng =
          typeof spot.lng === "number" ? spot.lng : spot.longitude;

        if (!hasValidCoords(spotLat, spotLng)) {
          return false;
        }

        if (hasValidCoords(args.lat, args.lng)) {
          return distanceMeters(args.lat, args.lng, spotLat, spotLng) <= radius;
        }

        return true;
      })
      .map((spot) => ({
        _id: spot._id,
        id: String(spot._id),

        city: spot.city,
        zone: spot.zone,

        lat: typeof spot.lat === "number" ? spot.lat : spot.latitude,
        lng: typeof spot.lng === "number" ? spot.lng : spot.longitude,

        accuracy: spot.accuracy,
        status: spot.status,

        revealedBy: spot.alias || spot.parkingAlias || spot.revealedBy,
        revealedAt: spot.revealedAt,
        updatedAt: spot.updatedAt,
        expiresAt: spot.expiresAt,

        destinationName: spot.destinationName || spot.destination,
        destinationAddress: spot.destinationAddress,
      }))
      .sort((a, b) => (b.revealedAt || 0) - (a.revealedAt || 0));
  },
});

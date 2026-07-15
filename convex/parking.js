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

const INITIAL_PARKING_DESTINATIONS = [
  {
    externalId: "palacio-deportes",
    label: "Palacio de los Deportes",
    category: "Deporte",
    address: "Paseo del Doctor Fleming, 929, 33203 Gijón, Asturias",
    lat: 43.53502,
    lng: -5.63586,
  },
  {
    externalId: "el-corte-ingles",
    label: "El Corte Inglés",
    category: "Centro comercial",
    address: "C/ Ramón Areces, 2, 33211 Gijón, Asturias",
    lat: 43.5361,
    lng: -5.6844,
  },
  {
    externalId: "los-fresnos",
    label: "C.C. Los Fresnos",
    category: "Centro comercial",
    address: "C. Río de Oro, 3, Centro, 33209 Gijón, Asturias",
    lat: 43.5321,
    lng: -5.6619,
  },
  {
    externalId: "el-molinon",
    label: "El Molinón",
    category: "Estadio",
    address: "C/ Luis Adaro Falcó, 33203 Gijón, Asturias",
    lat: 43.536329,
    lng: -5.637417,
  },
  {
    externalId: "hospital-cabuenes",
    label: "Hospital de Cabueñes",
    category: "Hospital",
    address: "Calle Los Prados, 395, 33203 Gijón, Asturias",
    lat: 43.525186,
    lng: -5.606614,
  },
  {
    externalId: "iglesia-san-julian",
    label: "Iglesia de San Julian",
    category: "Iglesia",
    address:
      "Iglesia de San Julián de Somió, Av. Dionisio Cifuentes, 19, Periurbano - Rural, 33203 Gijón, Asturias",
    lat: 43.535538,
    lng: -5.62342,
  },
];

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

async function requireAdminUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  const user = await ctx.db.get(userId);

  if (!user || user.role !== "admin") {
    throw new Error("Se requiere el rol de administrador.");
  }

  return userId;
}

export const listParkingDestinations = query({
  args: {
    city: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);

    const city = cleanCity(args.city);
    const destinations = await ctx.db
      .query("parkingDestinations")
      .withIndex("by_city_enabled_sortOrder", (q) =>
        q.eq("city", city).eq("enabled", true),
      )
      .collect();

    return destinations.map((destination) => ({
      _id: destination._id,
      id: destination.externalId,
      label: destination.label,
      category: destination.category,
      address: destination.address,
      city: destination.city,
      latitude: destination.location.lat,
      longitude: destination.location.lng,
      location: destination.location,
      sortOrder: destination.sortOrder,
    }));
  },
});

export const seedParkingDestinations = mutation({
  args: {},

  handler: async (ctx) => {
    const adminUserId = await requireAdminUserId(ctx);
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (
      let index = 0;
      index < INITIAL_PARKING_DESTINATIONS.length;
      index += 1
    ) {
      const destination = INITIAL_PARKING_DESTINATIONS[index];
      const existing = await ctx.db
        .query("parkingDestinations")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", destination.externalId),
        )
        .unique();

      const values = {
        label: destination.label,
        category: destination.category,
        address: destination.address,
        city: DEFAULT_CITY,
        location: {
          lat: destination.lat,
          lng: destination.lng,
          source: "seed",
        },
        enabled: true,
        sortOrder: index + 1,
        updatedBy: adminUserId,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, values);
        updated += 1;
      } else {
        await ctx.db.insert("parkingDestinations", {
          externalId: destination.externalId,
          ...values,
          createdBy: adminUserId,
          createdAt: now,
        });
        inserted += 1;
      }
    }

    return {
      ok: true,
      inserted,
      updated,
      total: INITIAL_PARKING_DESTINATIONS.length,
    };
  },
});

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

const VALID_LOCATION_SOURCES = new Set([
  "gps",
  "manual",
  "message",
  "shared",
  "test",
  "unknown",
]);

function safeLocationSource(value, fallback = "unknown") {
  const source = cleanText(value).toLowerCase();

  return VALID_LOCATION_SOURCES.has(source) ? source : fallback;
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
    const spotLat = spot.location?.lat;
    const spotLng = spot.location?.lng;

    if (!hasValidCoords(spotLat, spotLng)) {
      continue;
    }

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
          const spotLat = spot.location?.lat;
          const spotLng = spot.location?.lng;

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
          location: {
            lat: args.lat,
            lng: args.lng,
            source: safeLocationSource(args.locationSource, "message"),
            accuracy: accuracy ?? null,
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
          destinationName: cleanText(args.destinationName) || undefined,
          destinationAddress: cleanText(args.destinationAddress) || undefined,

          location: {
            lat: args.lat,
            lng: args.lng,
            source: safeLocationSource(args.locationSource, "message"),
            accuracy: accuracy ?? null,
          },

          status: "free",

          revealedBy: userId,
          releasedBy: userId,

          revealedAt: now,
          releasedAt: now,

          occupiedBy: undefined,
          occupiedAt: undefined,

          isTest: false,

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
          location: {
            lat: args.lat,
            lng: args.lng,
            source: safeLocationSource(args.locationSource, "message"),
            accuracy: accuracy ?? null,
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
          destinationName: cleanText(args.destinationName) || undefined,
          destinationAddress: cleanText(args.destinationAddress) || undefined,

          location: {
            lat: args.lat,
            lng: args.lng,
            source: safeLocationSource(args.locationSource, "message"),
            accuracy: accuracy ?? null,
          },

          status: "occupied",

          occupiedBy: userId,
          occupiedAt: now,

          revealedBy: undefined,
          revealedAt: undefined,

          isTest: false,

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

    const lat = spot.location?.lat;
    const lng = spot.location?.lng;

    if (hasValidCoords(lat, lng)) {
      await incrementAreaParkedCount(ctx, {
        city: spot.city || DEFAULT_CITY,
        zone: spot.zone || DEFAULT_ZONE,
        lat,
        lng,
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

    const lat = spot.location?.lat;
    const lng = spot.location?.lng;

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
        destinationName: spot.destinationName,
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
        location: {
          lat: args.lat,
          lng: args.lng,
          source: safeLocationSource(args.locationSource, "gps"),
          accuracy: accuracy ?? null,
        },

        areaKey: buildAreaKey(args.lat, args.lng),
        status: "free",

        revealedBy: userId,
        releasedBy: userId,
        revealedAt: now,
        releasedAt: now,

        alias,
        ownerAlias: alias || userId,
        parkingAlias: alias || userId,

        destinationName: cleanText(args.destinationName) || undefined,
        destinationAddress: cleanText(args.destinationAddress) || undefined,

        isTest: false,

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
      destinationName: cleanText(args.destinationName) || undefined,
      destinationAddress: cleanText(args.destinationAddress) || undefined,

      location: {
        lat: args.lat,
        lng: args.lng,
        source: safeLocationSource(args.locationSource, "gps"),
        accuracy: accuracy ?? null,
      },

      status: "free",

      revealedBy: userId,
      releasedBy: userId,

      revealedAt: now,
      releasedAt: now,

      occupiedBy: undefined,
      occupiedAt: undefined,

      isTest: false,

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
        const spotLat = spot.location?.lat;
        const spotLng = spot.location?.lng;

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

        lat: spot.location.lat,
        lng: spot.location.lng,

        accuracy: spot.location.accuracy ?? null,
        locationSource: spot.location.source,
        status: spot.status,

        revealedBy: spot.alias || spot.parkingAlias || spot.revealedBy,
        revealedAt: spot.revealedAt,
        updatedAt: spot.updatedAt,
        expiresAt: spot.expiresAt,

        destinationName: spot.destinationName,
        destinationAddress: spot.destinationAddress,
      }))
      .sort((a, b) => (b.revealedAt || 0) - (a.revealedAt || 0));
  },
});

const optionalGpsNumberValidator = v.optional(v.union(v.float64(), v.null()));

function normalizeOptionalGpsNumber(value) {
  return isFiniteNumber(value) ? value : null;
}

export const createParkingGpsMeasurement = mutation({
  args: {
    destinationId: v.string(),
    lat: v.float64(),
    lng: v.float64(),
    accuracy: optionalGpsNumberValidator,
    altitude: optionalGpsNumberValidator,
    altitudeAccuracy: optionalGpsNumberValidator,
    heading: optionalGpsNumberValidator,
    speed: optionalGpsNumberValidator,
    source: v.optional(v.string()),
    platform: v.optional(v.string()),
    accuracyMode: v.optional(
      v.union(v.literal("maximum"), v.literal("normal")),
    ),
    note: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const adminUserId = await requireAdminUserId(ctx);

    if (!hasValidCoords(args.lat, args.lng)) {
      throw new Error("Coordenadas no válidas.");
    }

    const destinationId = cleanText(args.destinationId);
    const destination = await ctx.db
      .query("parkingDestinations")
      .withIndex("by_externalId", (q) => q.eq("externalId", destinationId))
      .unique();

    if (!destination || destination.enabled !== true) {
      throw new Error("El destino no existe o no está activo.");
    }

    const now = Date.now();
    const measurementId = await ctx.db.insert("parkingGpsMeasurements", {
      destinationId: destination.externalId,
      destinationRef: destination._id,
      destinationName: destination.label,
      city: destination.city,
      location: {
        lat: args.lat,
        lng: args.lng,
        accuracy: normalizeOptionalGpsNumber(args.accuracy),
        altitude: normalizeOptionalGpsNumber(args.altitude),
        altitudeAccuracy: normalizeOptionalGpsNumber(args.altitudeAccuracy),
        heading: normalizeOptionalGpsNumber(args.heading),
        speed: normalizeOptionalGpsNumber(args.speed),
        source: cleanText(args.source) || "gps",
      },
      platform: cleanText(args.platform) || undefined,
      accuracyMode: args.accuracyMode,
      note: cleanText(args.note).slice(0, 240) || undefined,
      measuredBy: adminUserId,
      measuredAt: now,
      createdAt: now,
    });

    return { ok: true, measurementId };
  },
});

export const listParkingGpsMeasurements = query({
  args: {
    destinationId: v.string(),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    await requireAdminUserId(ctx);

    const destinationId = cleanText(args.destinationId);
    const limit = clampLimit(args.limit, 100, 1, 300);
    const measurements = await ctx.db
      .query("parkingGpsMeasurements")
      .withIndex("by_destination_measuredAt", (q) =>
        q.eq("destinationId", destinationId),
      )
      .order("desc")
      .take(limit);

    return measurements.map((measurement) => ({
      _id: measurement._id,
      id: String(measurement._id),
      destinationId: measurement.destinationId,
      destinationName: measurement.destinationName,
      city: measurement.city,
      lat: measurement.location.lat,
      lng: measurement.location.lng,
      accuracy: measurement.location.accuracy ?? null,
      altitude: measurement.location.altitude ?? null,
      altitudeAccuracy: measurement.location.altitudeAccuracy ?? null,
      heading: measurement.location.heading ?? null,
      speed: measurement.location.speed ?? null,
      locationSource: measurement.location.source,
      platform: measurement.platform,
      accuracyMode: measurement.accuracyMode,
      note: measurement.note,
      measuredAt: measurement.measuredAt,
      createdAt: measurement.createdAt,
    }));
  },
});

export const deleteParkingGpsMeasurement = mutation({
  args: {
    measurementId: v.id("parkingGpsMeasurements"),
  },

  handler: async (ctx, args) => {
    await requireAdminUserId(ctx);

    const measurement = await ctx.db.get(args.measurementId);

    if (!measurement) {
      throw new Error("La medición GPS no existe.");
    }

    await ctx.db.delete(args.measurementId);

    return { ok: true, measurementId: args.measurementId };
  },
});

// Funciones heredadas de GPS Debug. Se conservan temporalmente para no romper
// versiones antiguas del cliente; la nueva pantalla usa parkingGpsMeasurements.
export const createGpsDebugParkingSpot = mutation({
  args: {
    lat: v.float64(),
    lng: v.float64(),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    note: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await requireAuthUserId(ctx);

    if (!hasValidCoords(args.lat, args.lng)) {
      throw new Error("Coordenadas no válidas.");
    }

    const accuracy = safeAccuracy(args.accuracy);
    const spotId = await ctx.db.insert("parkingSpots", {
      city: DEFAULT_CITY,
      zone: "gps-debug",
      areaKey: buildAreaKey(args.lat, args.lng),

      userId,
      ownerAlias: userId,
      parkingAlias: userId,

      alias: "gps-debug",
      destinationName: "GPS debug",
      destinationAddress: cleanText(args.note) || undefined,

      location: {
        lat: args.lat,
        lng: args.lng,
        source: "test",
        accuracy: accuracy ?? null,
      },

      status: "free",

      revealedBy: userId,
      releasedBy: userId,

      revealedAt: now,
      releasedAt: now,

      occupiedBy: undefined,
      occupiedAt: undefined,

      isTest: true,
      testGroup: "gps-debug",

      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      spotId,
    };
  },
});

export const listGpsDebugParkingSpots = query({
  args: {
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const limit = clampLimit(args.limit, 100, 1, MAX_SPOTS_LIMIT);

    const spots = await ctx.db
      .query("parkingSpots")
      .withIndex("by_userId_city_zone_updatedAt", (q) =>
        q.eq("userId", userId).eq("city", DEFAULT_CITY).eq("zone", "gps-debug"),
      )
      .order("desc")
      .take(limit);

    return spots.map((spot) => ({
      _id: spot._id,
      id: String(spot._id),

      lat: spot.location.lat,
      lng: spot.location.lng,

      accuracy: spot.location.accuracy ?? null,
      locationSource: spot.location.source,

      status: spot.status,

      createdAt: spot.createdAt,
      updatedAt: spot.updatedAt,
      revealedAt: spot.revealedAt,

      note: spot.destinationAddress,
    }));
  },
});

export const deleteGpsDebugParkingSpot = mutation({
  args: {
    spotId: v.id("parkingSpots"),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const spot = await ctx.db.get(args.spotId);

    if (!spot) {
      throw new Error("La muestra no existe.");
    }

    if (spot.userId !== userId) {
      throw new Error("No puedes borrar una muestra de otro usuario.");
    }

    if (spot.zone !== "gps-debug") {
      throw new Error("Solo se pueden borrar muestras GPS debug.");
    }

    await ctx.db.delete(args.spotId);

    return {
      ok: true,
      spotId: args.spotId,
    };
  },
});

export const seedCabuenesTestParkingSpots = mutation({
  args: {},

  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();

    const existingSpots = await ctx.db
      .query("parkingSpots")
      .withIndex("by_testGroup_updatedAt", (q) =>
        q.eq("testGroup", "cabuenes-test"),
      )
      .collect();

    if (existingSpots.length > 0) {
      return {
        ok: true,
        inserted: 0,
        existing: existingSpots.length,
        message: "Las plazas de prueba de Cabueñes ya existen.",
      };
    }

    const spots = [
      {
        alias: "Cabueñes prueba 01",
        lat: 43.525374,
        lng: -5.607285,
        accuracy: 5,
      },
      {
        alias: "Cabueñes prueba 02",
        lat: 43.525733,
        lng: -5.606851,
        accuracy: 6,
      },
      {
        alias: "Cabueñes prueba 03",
        lat: 43.525958,
        lng: -5.606294,
        accuracy: 4,
      },
      {
        alias: "Cabueñes prueba 04",
        lat: 43.525823,
        lng: -5.605612,
        accuracy: 7,
      },
      {
        alias: "Cabueñes prueba 05",
        lat: 43.525464,
        lng: -5.605117,
        accuracy: 5,
      },
      {
        alias: "Cabueñes prueba 06",
        lat: 43.52497,
        lng: -5.604745,
        accuracy: 8,
      },
      {
        alias: "Cabueñes prueba 07",
        lat: 43.524476,
        lng: -5.605055,
        accuracy: 6,
      },
      {
        alias: "Cabueñes prueba 08",
        lat: 43.524116,
        lng: -5.605612,
        accuracy: 5,
      },
      {
        alias: "Cabueñes prueba 09",
        lat: 43.523892,
        lng: -5.606232,
        accuracy: 7,
      },
      {
        alias: "Cabueñes prueba 10",
        lat: 43.524072,
        lng: -5.606913,
        accuracy: 4,
      },
      {
        alias: "Cabueñes prueba 11",
        lat: 43.524521,
        lng: -5.607471,
        accuracy: 6,
      },
      {
        alias: "Cabueñes prueba 12",
        lat: 43.525015,
        lng: -5.607719,
        accuracy: 5,
      },
    ];

    const insertedIds = [];

    for (const spot of spots) {
      const spotId = await ctx.db.insert("parkingSpots", {
        userId,
        ownerAlias: "Pruebas Cabueñes",
        parkingAlias: "cabuenes-test",

        city: "gijon",
        zone: "general",
        areaKey: buildAreaKey(spot.lat, spot.lng),

        status: "free",

        location: {
          lat: spot.lat,
          lng: spot.lng,
          source: "test",
          accuracy: spot.accuracy,
        },

        alias: spot.alias,
        destinationName: "Hospital Universitario de Cabueñes",
        destinationAddress: "Calle Los Prados 395, Gijón",

        revealedBy: userId,
        revealedAt: now,

        releasedBy: userId,
        releasedAt: now,

        isTest: true,
        testGroup: "cabuenes-test",

        createdAt: now,
        updatedAt: now,

        // Sin expiresAt: se conservan hasta borrarlas manualmente.
      });

      insertedIds.push(spotId);
    }

    return {
      ok: true,
      inserted: insertedIds.length,
      spotIds: insertedIds,
    };
  },
});

export const deleteCabuenesTestParkingSpots = mutation({
  args: {},

  handler: async (ctx) => {
    await requireAuthUserId(ctx);

    const spots = await ctx.db
      .query("parkingSpots")
      .withIndex("by_testGroup_updatedAt", (q) =>
        q.eq("testGroup", "cabuenes-test"),
      )
      .collect();

    for (const spot of spots) {
      await ctx.db.delete(spot._id);
    }

    return {
      ok: true,
      deleted: spots.length,
    };
  },
});

const CABUENES_TEST_SPOTS = [
  {
    alias: "Cabueñes prueba 01",
    lat: 43.525374,
    lng: -5.607285,
    accuracy: 5,
  },
  {
    alias: "Cabueñes prueba 02",
    lat: 43.525733,
    lng: -5.606851,
    accuracy: 6,
  },
  {
    alias: "Cabueñes prueba 03",
    lat: 43.525958,
    lng: -5.606294,
    accuracy: 4,
  },
  {
    alias: "Cabueñes prueba 04",
    lat: 43.525823,
    lng: -5.605612,
    accuracy: 7,
  },
  {
    alias: "Cabueñes prueba 05",
    lat: 43.525464,
    lng: -5.605117,
    accuracy: 5,
  },
  {
    alias: "Cabueñes prueba 06",
    lat: 43.52497,
    lng: -5.604745,
    accuracy: 8,
  },
  {
    alias: "Cabueñes prueba 07",
    lat: 43.524476,
    lng: -5.605055,
    accuracy: 6,
  },
  {
    alias: "Cabueñes prueba 08",
    lat: 43.524116,
    lng: -5.605612,
    accuracy: 5,
  },
  {
    alias: "Cabueñes prueba 09",
    lat: 43.523892,
    lng: -5.606232,
    accuracy: 7,
  },
  {
    alias: "Cabueñes prueba 10",
    lat: 43.524072,
    lng: -5.606913,
    accuracy: 4,
  },
  {
    alias: "Cabueñes prueba 11",
    lat: 43.524521,
    lng: -5.607471,
    accuracy: 6,
  },
  {
    alias: "Cabueñes prueba 12",
    lat: 43.525015,
    lng: -5.607719,
    accuracy: 5,
  },
];

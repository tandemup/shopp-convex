import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const urlInfoValidator = v.object({
  originalUrl: v.string(),
  normalizedUrl: v.union(v.string(), v.null()),
  hostname: v.union(v.string(), v.null()),

  status: v.union(
    v.literal("pending"),
    v.literal("safe"),
    v.literal("suspicious"),
    v.literal("malicious"),
  ),

  riskScore: v.float64(),
  reason: v.string(),
  provider: v.string(),
  checkedAt: v.float64(),
});

const messageStatusValidator = v.union(
  v.literal("clean"),
  v.literal("blocked"),
  v.literal("warning"),
  v.literal("pending_url_check"),
);

const chatVisibilityStatusValidator = v.union(
  v.literal("visible"),
  v.literal("hidden"),
  v.literal("blocked"),
);

const parkingMessageStatusValidator = v.union(
  v.literal("looking"),
  v.literal("parked"),
  v.literal("leaving"),
);

const parkingPresenceStatusValidator = v.union(
  v.literal("heading"),
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

export default defineSchema({
  ...authTables,

  // Aquí conservas tus otras tablas:
  // chatMessages: defineTable({...}),
  // parkingUsers: defineTable({...}),
  // parkingEvents: defineTable({...}),
  // stores: defineTable({...}),
  // scanHistory: defineTable({...}),

  stores: defineTable({
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

    favorite: v.boolean(),
  })
    .index("by_storeId", ["id"])
    .index("by_city", ["city"]),

  scanHistory: defineTable({
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    source: v.string(),
    rawData: v.optional(v.any()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barcode", ["barcode"])
    .index("by_barcode_updatedAt", ["barcode", "updatedAt"])
    .index("by_updatedAt", ["updatedAt"]),

  chatMessages: defineTable({
    room: v.string(),
    username: v.string(),
    text: v.string(),
    createdAt: v.float64(),

    expiresAt: v.optional(v.float64()),

    // IMPORTANTE:
    // Este campo debe ser opcional porque ya tienes mensajes antiguos
    // guardados en Convex que no contienen "status".
    status: v.optional(chatVisibilityStatusValidator),

    messageStatus: v.optional(messageStatusValidator),

    checkedLocallyAt: v.optional(v.float64()),
    checkedExternallyAt: v.optional(v.float64()),

    urls: v.optional(v.array(urlInfoValidator)),
  })
    .index("by_room_createdAt", ["room", "createdAt"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingMessages: defineTable({
    city: v.string(),
    zone: v.string(),
    userId: v.string(),
    text: v.string(),

    status: v.optional(parkingMessageStatusValidator),

    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    locationSource: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_city_zone_createdAt", ["city", "zone", "createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_city_zone_status_createdAt", [
      "city",
      "zone",
      "status",
      "createdAt",
    ]),

  parkingPresence: defineTable({
    city: v.string(),
    zone: v.string(),
    userId: v.string(),

    status: parkingPresenceStatusValidator,

    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    locationSource: v.optional(v.string()),

    updatedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_city_zone_userId", ["city", "zone", "userId"])
    .index("by_city_zone_status_updatedAt", [
      "city",
      "zone",
      "status",
      "updatedAt",
    ])
    .index("by_expiresAt", ["expiresAt"]),

  parkingSpots: defineTable({
    city: v.string(),
    zone: v.string(),

    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    locationSource: v.optional(v.string()),

    status: parkingSpotStatusValidator,

    revealedBy: v.string(),
    occupiedBy: v.optional(v.string()),

    revealedAt: v.number(),
    occupiedAt: v.optional(v.number()),
    updatedAt: v.number(),
    expiresAt: v.number(),

    sourceMessageId: v.optional(v.id("parkingMessages")),
  })
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_city_zone_status", ["city", "zone", "status"])
    .index("by_city_zone_status_updatedAt", [
      "city",
      "zone",
      "status",
      "updatedAt",
    ])
    .index("by_city_zone_status_expiresAt", [
      "city",
      "zone",
      "status",
      "expiresAt",
    ])
    .index("by_expiresAt", ["expiresAt"]),
});

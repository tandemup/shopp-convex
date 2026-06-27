import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chatMessages: defineTable({
    room: v.string(),
    username: v.string(),
    text: v.string(),
    createdAt: v.number(),
    status: v.optional(v.string()),
  }).index("by_room_createdAt", ["room", "createdAt"]),

  stores: defineTable({
    id: v.optional(v.string()),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    provincia: v.optional(v.string()),
    zipcode: v.optional(v.union(v.string(), v.number())),
    favorite: v.optional(v.boolean()),

    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
        source: v.optional(v.string()),
      }),
    ),

    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }),

  scanHistory: defineTable({
    barcode: v.string(),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    source: v.optional(v.string()),
    rawData: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_barcode", ["barcode"]),

  parkingMessages: defineTable({
    city: v.string(),
    zone: v.string(),
    userId: v.string(),
    text: v.string(),
    status: v.optional(v.string()),

    // Preparado para geolocalización futura
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_city_zone_createdAt", ["city", "zone", "createdAt"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),
});

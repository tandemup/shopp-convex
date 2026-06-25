import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scanHistory: defineTable({
    barcode: v.string(),
    format: v.optional(v.string()),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    source: v.optional(v.string()),
    rawData: v.optional(v.any()),

    username: v.string(),
    deviceId: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),

    scannedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barcode", ["barcode"])
    .index("by_barcode_updatedAt", ["barcode", "updatedAt"])
    .index("by_username_scannedAt", ["username", "scannedAt"])
    .index("by_deviceId_scannedAt", ["deviceId", "scannedAt"]),

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

  chatMessages: defineTable({
    room: v.string(),
    username: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_room_createdAt", ["room", "createdAt"]),
});

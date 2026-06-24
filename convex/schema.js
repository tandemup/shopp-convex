import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chatMessages: defineTable({
    room: v.string(),
    username: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_room_createdAt", ["room", "createdAt"]),

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
    .index("by_city", ["city"])
    .index("by_name", ["name"]),

  scanHistory: defineTable({
    barcode: v.string(),
    format: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.optional(v.string()),

    username: v.string(),
    deviceId: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),

    scannedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_barcode", ["barcode"])
    .index("by_username_scannedAt", ["username", "scannedAt"])
    .index("by_deviceId_scannedAt", ["deviceId", "scannedAt"]),
});

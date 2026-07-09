import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  products: defineTable({
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    image: v.optional(v.string()),

    unit: v.optional(v.string()),
    quantity: v.optional(v.string()),

    source: v.optional(v.string()), // "user", "openfoodfacts", "manual", etc.

    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_barcode", ["barcode"]),

  productContributions: defineTable({
    userId: v.string(),

    barcode: v.string(),

    productSnapshot: v.object({
      name: v.optional(v.string()),
      brand: v.optional(v.string()),
      category: v.optional(v.string()),
      subcategory: v.optional(v.string()),
      image: v.optional(v.string()),
      unit: v.optional(v.string()),
      quantity: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),

    consent: v.object({
      accepted: v.boolean(),
      consentVersion: v.string(),
      consentText: v.string(),
      consentedAt: v.float64(),
      revokedAt: v.optional(v.float64()),
    }),

    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_barcode", ["barcode"])
    .index("by_user_barcode", ["userId", "barcode"]),

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
    // Compatibilidad con datos antiguos y nuevo flujo de plazas.
    userId: v.optional(v.string()),
    ownerAlias: v.optional(v.string()),
    parkingAlias: v.optional(v.string()),

    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    areaKey: v.optional(v.string()),

    status: v.optional(
      v.union(
        // Nuevo flujo de plaza.
        v.literal("free"),
        v.literal("occupied"),
        v.literal("leaving"),
        v.literal("unknown"),
        v.literal("expired"),

        // Compatibilidad con documentos antiguos.
        v.literal("looking"),
        v.literal("parked"),
        v.literal("heading"),
        v.literal("offline"),
      ),
    ),

    alias: v.optional(v.string()),
    destination: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    accuracy: v.optional(v.union(v.float64(), v.null())),
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

    releasedBy: v.optional(v.string()),
    releasedAt: v.optional(v.float64()),

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
    .index("by_ownerAlias", ["ownerAlias"])
    .index("by_areaKey", ["areaKey"])
    .index("by_status", ["status"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .index("by_city_zone", ["city", "zone"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingWatchers: defineTable({
    // Conductores que están buscando plaza en una zona.
    userId: v.optional(v.string()),
    parkingAlias: v.string(),

    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    areaKey: v.optional(v.string()),

    latitude: v.float64(),
    longitude: v.float64(),
    accuracy: v.optional(v.union(v.float64(), v.null())),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),

    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),

    status: v.union(v.literal("looking"), v.literal("inactive")),

    radiusMeters: v.optional(v.float64()),

    createdAt: v.optional(v.float64()),
    updatedAt: v.float64(),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_parkingAlias", ["parkingAlias"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .index("by_city_zone_status", ["city", "zone", "status"])
    .index("by_areaKey_status", ["areaKey", "status"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingNotifications: defineTable({
    // Avisos dirigidos a conductores que están buscando plaza.
    recipientAlias: v.string(),
    recipientUserId: v.optional(v.string()),

    type: v.union(v.literal("spot_released"), v.literal("spot_available")),

    spotId: v.id("parkingSpots"),

    title: v.string(),
    body: v.string(),

    latitude: v.float64(),
    longitude: v.float64(),

    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),

    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    areaKey: v.optional(v.string()),

    read: v.boolean(),

    createdAt: v.float64(),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_recipientAlias", ["recipientAlias"])
    .index("by_recipientAlias_read", ["recipientAlias", "read"])
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_spotId", ["spotId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_expiresAt", ["expiresAt"]),

  parkingAreaStats: defineTable({
    // Contadores agregados por zona aproximada.
    areaKey: v.string(),

    city: v.optional(v.string()),
    zone: v.optional(v.string()),
    destinationName: v.optional(v.string()),

    parkedCount: v.float64(),
    leavingCount: v.float64(),

    createdAt: v.optional(v.float64()),
    updatedAt: v.float64(),
  })
    .index("by_areaKey", ["areaKey"])
    .index("by_city_zone", ["city", "zone"]),

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

  barcodeScans: defineTable({
    barcode: v.string(),

    format: v.optional(v.string()), // EAN_13, QR_CODE, UPC_A, etc.
    source: v.optional(v.string()), // scanner, manual, imported

    productName: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),

    userId: v.optional(v.string()), // alias privado o id lógico del usuario
    username: v.optional(v.string()),

    consent: v.object({
      accepted: v.boolean(),
      acceptedAt: v.float64(),
      version: v.optional(v.string()),
      purpose: v.optional(v.string()),
    }),

    rawResult: v.optional(
      v.object({
        data: v.optional(v.string()),
        type: v.optional(v.string()),
        bounds: v.optional(v.any()),
        cornerPoints: v.optional(v.any()),
      }),
    ),

    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_barcode", ["barcode"])
    .index("by_user", ["userId"])
    .index("by_store", ["storeId"])
    .index("by_createdAt", ["createdAt"]),
});

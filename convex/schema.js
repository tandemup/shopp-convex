import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  chatMessages: defineTable({
    room: v.string(),
    username: v.string(),
    text: v.string(),
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
              v.literal("pending"),
              v.literal("clean"),
              v.literal("blocked"),
              v.literal("warning"),
            ),
          ),
        }),
      ),
    ),

    checkedLocallyAt: v.optional(v.float64()),
    checkedExternallyAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),
  })
    .index("by_room", ["room"])
    .index("by_createdAt", ["createdAt"]),

  parkingMessages: defineTable({
    // Formato nuevo / recomendado
    room: v.optional(v.string()),

    // Formato existente en tus documentos actuales
    city: v.optional(v.string()),
    zone: v.optional(v.string()),

    userId: v.string(),
    text: v.string(),
    createdAt: v.float64(),

    // En tus documentos actuales status contiene:
    // "looking", "parked", "leaving"
    //
    // En versiones anteriores también puede haberse usado como estado visual:
    // "visible", "hidden", "blocked"
    //
    // Por compatibilidad, se aceptan ambos grupos.
    status: v.optional(
      v.union(
        v.literal("looking"),
        v.literal("parked"),
        v.literal("leaving"),
        v.literal("visible"),
        v.literal("hidden"),
        v.literal("blocked"),
      ),
    ),

    // Campo recomendado para parking en versiones nuevas.
    parkingStatus: v.optional(
      v.union(v.literal("looking"), v.literal("parked"), v.literal("leaving")),
    ),

    // Coordenadas planas, como las que ya existen en tus documentos.
    lat: v.optional(v.float64()),
    lng: v.optional(v.float64()),
    accuracy: v.optional(v.float64()),
    locationSource: v.optional(v.string()),

    // Coordenadas anidadas, por si alguna pantalla nueva las usa.
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
    .index("by_createdAt", ["createdAt"]),

  stores: defineTable({
    id: v.string(),
    name: v.string(),
    address: v.string(),
    city: v.string(),

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
    .index("by_city", ["city"])
    .index("by_name", ["name"]),

  scanHistory: defineTable({
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
    source: v.optional(v.string()),
  })
    .index("by_barcode", ["barcode"])
    .index("by_createdAt", ["createdAt"]),
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Tabla de Convex Auth ampliada con el rol de la aplicación.
  // El campo es opcional para que los usuarios existentes sigan siendo válidos;
  // cuando no existe, la aplicación lo interpreta como "user".
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
  }).index("email", ["email"]),

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
    scanHistorySyncEnabled: v.optional(v.boolean()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_alias", ["alias"])
    .index("by_phone", ["phone"]),

  userScanHistory: defineTable({
    userId: v.string(),
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    url: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    thumbnailUri: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),

    source: v.optional(v.string()),
    lookupSource: v.optional(v.union(v.string(), v.null())),
    dataSource: v.optional(v.string()),

    scannedAt: v.string(),
    updatedAt: v.string(),
    scanCount: v.float64(),
    createdAt: v.float64(),
    updatedAtMs: v.float64(),
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_user_barcode", ["userId", "barcode"])
    .index("by_barcode", ["barcode"]),

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

  // Adjuntos temporales para comunicaciones privadas con la administración.
  // Se eliminan del almacenamiento después de enviar el correo, incluso si
  // Resend devuelve un error.
  rightsReportAttachments: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.float64(),
    createdAt: v.float64(),
    expiresAt: v.float64(),
  })
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

  // Destinos permanentes de la utilidad Parking.
  // `externalId` es el identificador estable que usa la aplicación como zona.
  parkingDestinations: defineTable({
    externalId: v.string(),
    label: v.string(),
    category: v.string(),
    address: v.string(),
    city: v.string(),

    location: v.object({
      lat: v.float64(),
      lng: v.float64(),
      source: v.optional(v.string()),
    }),

    enabled: v.boolean(),
    sortOrder: v.float64(),

    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_city", ["city"])
    .index("by_city_enabled_sortOrder", ["city", "enabled", "sortOrder"]),

  // Lecturas GPS tomadas in situ por administradores.
  parkingGpsMeasurements: defineTable({
    destinationId: v.string(),
    destinationRef: v.optional(v.id("parkingDestinations")),
    destinationName: v.string(),
    city: v.string(),

    location: v.object({
      lat: v.float64(),
      lng: v.float64(),
      accuracy: v.optional(v.union(v.float64(), v.null())),
      altitude: v.optional(v.union(v.float64(), v.null())),
      altitudeAccuracy: v.optional(v.union(v.float64(), v.null())),
      heading: v.optional(v.union(v.float64(), v.null())),
      speed: v.optional(v.union(v.float64(), v.null())),
      source: v.string(),
    }),

    platform: v.optional(v.string()),
    accuracyMode: v.optional(
      v.union(v.literal("maximum"), v.literal("normal")),
    ),
    note: v.optional(v.string()),
    measuredBy: v.id("users"),
    measuredAt: v.float64(),
    createdAt: v.float64(),
  })
    .index("by_destination_measuredAt", ["destinationId", "measuredAt"])
    .index("by_measuredBy_measuredAt", ["measuredBy", "measuredAt"])
    .index("by_city_measuredAt", ["city", "measuredAt"]),

  parkingSpots: defineTable({
    /**
     * Usuario que publica o genera la plaza.
     *
     * Se mantiene como string porque en el proyecto se emplean
     * identificadores lógicos además de los identificadores de Convex Auth.
     */
    userId: v.string(),

    /**
     * Alias visible del usuario que publica la plaza.
     */
    ownerAlias: v.optional(v.string()),

    /**
     * Alias específico empleado por la utilidad Parking.
     */
    parkingAlias: v.optional(v.string()),

    /**
     * Clasificación geográfica y funcional.
     *
     * Ejemplo:
     * city: "gijon"
     * zone: "general"
     * areaKey: "gijon:43.536:-5.606"
     */
    city: v.string(),
    zone: v.string(),
    areaKey: v.optional(v.string()),

    /**
     * Estado del lugar de aparcamiento.
     *
     * free:
     *   La plaza está disponible.
     *
     * occupied:
     *   La plaza ha sido ocupada.
     *
     * leaving:
     *   El vehículo sigue en la plaza, pero su propietario
     *   ha anunciado que va a abandonarla.
     *
     * unknown:
     *   No se puede confirmar el estado actual.
     *
     * expired:
     *   La información ha caducado.
     */
    status: v.union(
      v.literal("free"),
      v.literal("occupied"),
      v.literal("leaving"),
      v.literal("unknown"),
      v.literal("expired"),
    ),

    /**
     * Coordenadas canónicas WGS 84 / EPSG:4326.
     */
    location: v.object({
      lat: v.float64(),
      lng: v.float64(),

      source: v.union(
        v.literal("gps"),
        v.literal("manual"),
        v.literal("message"),
        v.literal("shared"),
        v.literal("test"),
        v.literal("unknown"),
      ),

      /**
       * Precisión estimada en metros.
       * Puede ser null cuando el origen no proporciona precisión.
       */
      accuracy: v.optional(v.union(v.float64(), v.null())),
    }),

    /**
     * Nombre descriptivo opcional de la plaza.
     *
     * Ejemplo:
     * "Plaza junto a la entrada principal"
     */
    alias: v.optional(v.string()),

    /**
     * Lugar cercano utilizado como referencia.
     */
    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),

    /**
     * Usuario que hizo visible o publicó la plaza.
     */
    revealedBy: v.optional(v.string()),
    revealedAt: v.optional(v.float64()),

    /**
     * Usuario que ocupó la plaza.
     */
    occupiedBy: v.optional(v.string()),
    occupiedAt: v.optional(v.float64()),

    /**
     * Usuario que notificó la liberación de la plaza.
     */
    releasedBy: v.optional(v.string()),
    releasedAt: v.optional(v.float64()),

    /**
     * Mensaje de Parking que originó el registro.
     */
    sourceMessageId: v.optional(v.id("parkingMessages")),

    /**
     * Identificación explícita de datos de prueba.
     */
    isTest: v.boolean(),
    testGroup: v.optional(v.string()),

    /**
     * Fechas Unix en milisegundos.
     */
    createdAt: v.float64(),
    updatedAt: v.float64(),

    /**
     * Fecha de caducidad.
     *
     * Puede omitirse para plazas de prueba que deban conservarse
     * indefinidamente.
     */
    expiresAt: v.optional(v.float64()),
  })
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
    .index("by_city_zone_updatedAt", ["city", "zone", "updatedAt"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"])
    .index("by_userId_city_zone_updatedAt", [
      "userId",
      "city",
      "zone",
      "updatedAt",
    ])
    .index("by_ownerAlias_updatedAt", ["ownerAlias", "updatedAt"])
    .index("by_areaKey_status_updatedAt", ["areaKey", "status", "updatedAt"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .index("by_testGroup_updatedAt", ["testGroup", "updatedAt"])
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

  shoppingItemsImport: defineTable({
    userId: v.id("users"),
    importBatchId: v.string(),
    importKey: v.string(),

    listId: v.optional(v.string()),
    listName: v.optional(v.string()),
    listArchived: v.optional(v.boolean()),
    listCreatedAt: v.optional(v.float64()),
    listArchivedAt: v.optional(v.union(v.float64(), v.null())),
    storeId: v.optional(v.union(v.string(), v.null())),

    itemId: v.optional(v.string()),
    name: v.optional(v.string()),
    barcode: v.optional(v.string()),
    quantity: v.optional(v.float64()),
    unit: v.optional(v.string()),
    unitPrice: v.optional(v.float64()),
    checked: v.optional(v.boolean()),

    categoryId: v.optional(v.union(v.string(), v.null())),
    categoryName: v.optional(v.union(v.string(), v.null())),
    subcategoryId: v.optional(v.union(v.string(), v.null())),
    subcategoryName: v.optional(v.union(v.string(), v.null())),

    rawList: v.optional(v.any()),
    rawItem: v.any(),

    importedBy: v.id("users"),
    importedAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user_importKey", ["userId", "importKey"])
    .index("by_user_importedAt", ["userId", "importedAt"])
    .index("by_importBatchId", ["importBatchId"])
    .index("by_barcode", ["barcode"]),

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

  productCache: defineTable({
    barcode: v.string(),

    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),

    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    source: v.optional(
      v.union(
        v.literal("convex"),
        v.literal("internet"),
        v.literal("manual"),
        v.literal("scanner"),
      ),
    ),

    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("complete"),
        v.literal("not_found"),
      ),
    ),

    accessCount: v.number(),
    lookupFailureCount: v.optional(v.number()),

    lastExternalLookupAt: v.optional(v.number()),
    nextExternalLookupAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
    lastAccessedAt: v.number(),
  })
    .index("by_barcode", ["barcode"])
    .index("by_status", ["status"])
    .index("by_lastAccessedAt", ["lastAccessedAt"]),

  productReviewSubmissions: defineTable({
    barcode: v.string(),

    name: v.string(),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),

    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),

    source: v.optional(
      v.union(
        v.literal("user_review"),
        v.literal("manual"),
        v.literal("scanner"),
        v.literal("internet"),
      ),
    ),

    status: v.union(
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("rejected"),
    ),

    submittedBy: v.id("users"),
    submitterEmail: v.optional(v.string()),

    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.float64()),
    reviewNote: v.optional(v.string()),

    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_barcode_status", ["barcode", "status"])
    .index("by_submittedBy_status", ["submittedBy", "status"])
    .index("by_submittedBy_barcode_status", [
      "submittedBy",
      "barcode",
      "status",
    ]),
});

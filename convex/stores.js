import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_CITY = "gijon";
const DEFAULT_PROVINCIA = "Asturias";
const DEFAULT_ZIPCODE = 0;

const storeValidator = v.object({
  id: v.optional(v.string()),

  name: v.string(),
  city: v.string(),
  provincia: v.optional(v.string()),
  address: v.string(),
  zipcode: v.optional(v.union(v.string(), v.float64())),

  location: v.optional(
    v.object({
      lat: v.float64(),
      lng: v.float64(),
      source: v.optional(v.string()),
    }),
  ),
});

function cleanText(value) {
  return String(value || "").trim();
}

function cleanStoreId(value) {
  return cleanText(value);
}

function cleanStoreName(value) {
  return cleanText(value);
}

function cleanCity(value) {
  return cleanText(value) || DEFAULT_CITY;
}

function cleanProvincia(value) {
  return cleanText(value) || DEFAULT_PROVINCIA;
}

function cleanAddress(value) {
  return cleanText(value);
}

function cleanLocationSource(value) {
  return cleanText(value) || "manual";
}

function normalizeForHash(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

function createDeterministicStoreId({
  name,
  address,
  city,
  provincia,
  zipcode,
}) {
  const normalizedName = normalizeForHash(name);
  const normalizedAddress = normalizeForHash(address);
  const normalizedCity = normalizeForHash(city);
  const normalizedProvincia = normalizeForHash(provincia);
  const normalizedZipcode = normalizeForHash(zipcode);

  const source = [
    normalizedName,
    normalizedAddress,
    normalizedCity,
    normalizedProvincia,
    normalizedZipcode,
  ].join("|");

  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `store_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
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

function normalizeZipcode(value) {
  const zipcode = normalizeNumber(value);

  if (zipcode === null) {
    return DEFAULT_ZIPCODE;
  }

  return Math.trunc(zipcode);
}

function normalizeLocation(location, storeName) {
  if (!location) {
    return undefined;
  }

  const lat = normalizeNumber(location.lat);
  const lng = normalizeNumber(location.lng);

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    throw new Error(`La tienda ${storeName} tiene coordenadas no válidas.`);
  }

  return {
    lat,
    lng,
    source: cleanLocationSource(location.source),
  };
}

function normalizeStore(store) {
  const name = cleanStoreName(store.name);

  if (!name) {
    throw new Error("La tienda no tiene nombre.");
  }

  const city = cleanCity(store.city);
  const provincia = cleanProvincia(store.provincia);
  const address = cleanAddress(store.address);
  const zipcode = normalizeZipcode(store.zipcode);

  const id =
    cleanStoreId(store.id) ||
    createDeterministicStoreId({
      name,
      address,
      city,
      provincia,
      zipcode,
    });

  const normalizedStore = {
    id,
    name,
    city,
    provincia,
    address,
    zipcode,
  };

  const location = normalizeLocation(store.location, name);

  if (location) {
    normalizedStore.location = location;
  }

  return normalizedStore;
}

function sortStoresByName(stores) {
  return [...stores].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    }),
  );
}

export const listStores = query({
  args: {},

  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();

    return sortStoresByName(stores);
  },
});

export const getStoreById = query({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const id = cleanStoreId(args.id);

    if (!id) {
      return null;
    }

    return await ctx.db
      .query("stores")
      .withIndex("by_storeId", (q) => q.eq("id", id))
      .unique();
  },
});

export const listStoresByCity = query({
  args: {
    city: v.string(),
  },

  handler: async (ctx, args) => {
    const city = cleanCity(args.city);

    const stores = await ctx.db
      .query("stores")
      .withIndex("by_city", (q) => q.eq("city", city))
      .collect();

    return sortStoresByName(stores);
  },
});

export const searchStoresByName = query({
  args: {
    name: v.string(),
  },

  handler: async (ctx, args) => {
    const name = cleanStoreName(args.name);

    if (!name) {
      return [];
    }

    const stores = await ctx.db
      .query("stores")
      .withIndex("by_name", (q) => q.eq("name", name))
      .collect();

    return sortStoresByName(stores);
  },
});

export const upsertStores = mutation({
  args: {
    stores: v.array(storeValidator),
  },

  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawStore of args.stores) {
      const store = normalizeStore(rawStore);

      const existing = await ctx.db
        .query("stores")
        .withIndex("by_storeId", (q) => q.eq("id", store.id))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, store);
        updated += 1;
      } else {
        await ctx.db.insert("stores", store);
        inserted += 1;
      }
    }

    return {
      ok: true,
      inserted,
      updated,
      skipped,
      total: args.stores.length,
    };
  },
});

export const deleteStoreById = mutation({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const id = cleanStoreId(args.id);

    if (!id) {
      throw new Error("Falta el id de la tienda.");
    }

    const existing = await ctx.db
      .query("stores")
      .withIndex("by_storeId", (q) => q.eq("id", id))
      .unique();

    if (!existing) {
      return {
        ok: true,
        deleted: false,
        id,
      };
    }

    await ctx.db.delete(existing._id);

    return {
      ok: true,
      deleted: true,
      id,
    };
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_CITY = "gijon";
const DEFAULT_PROVINCIA = "Asturias";
const DEFAULT_ZIPCODE = 0;

const storeValidator = v.object({
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
  if (!isFiniteNumber(value)) {
    return DEFAULT_ZIPCODE;
  }

  return Math.trunc(value);
}

function normalizeStore(store) {
  const id = cleanStoreId(store.id);
  const name = cleanStoreName(store.name);

  if (!id) {
    throw new Error("La tienda no tiene id.");
  }

  if (!name) {
    throw new Error(`La tienda ${id} no tiene nombre.`);
  }

  const lat = store.location?.lat;
  const lng = store.location?.lng;

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    throw new Error(`La tienda ${name} tiene coordenadas no válidas.`);
  }

  return {
    id,
    name,

    city: cleanCity(store.city),
    provincia: cleanProvincia(store.provincia),
    address: cleanAddress(store.address),
    zipcode: normalizeZipcode(store.zipcode),

    location: {
      lat,
      lng,
      source: cleanLocationSource(store.location?.source),
    },

    favorite: Boolean(store.favorite),
  };
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

export const listFavoriteStores = query({
  args: {},

  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();

    return sortStoresByName(stores.filter((store) => store.favorite));
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

export const setStoreFavorite = mutation({
  args: {
    id: v.string(),
    favorite: v.boolean(),
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
      throw new Error("La tienda no existe.");
    }

    await ctx.db.patch(existing._id, {
      favorite: args.favorite,
    });

    return {
      ok: true,
      id,
      favorite: args.favorite,
    };
  },
});

export const toggleStoreFavorite = mutation({
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
      throw new Error("La tienda no existe.");
    }

    const favorite = !existing.favorite;

    await ctx.db.patch(existing._id, {
      favorite,
    });

    return {
      ok: true,
      id,
      favorite,
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

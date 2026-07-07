import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const storeValidator = v.object({
  id: v.optional(v.string()),
  name: v.string(),
  address: v.string(),
  city: v.string(),
  provincia: v.optional(v.string()),
  zipcode: v.optional(v.union(v.string(), v.float64())),
  location: v.optional(
    v.object({
      lat: v.float64(),
      lng: v.float64(),
      source: v.optional(v.string()),
    }),
  ),
});

const itemValidator = v.object({
  id: v.string(),
  name: v.string(),

  category: v.optional(v.string()),
  subcategory: v.optional(v.string()),
  brand: v.optional(v.string()),
  barcode: v.optional(v.string()),
  unit: v.optional(v.string()),
  image: v.optional(v.string()),

  createdFrom: v.optional(v.string()),
});

const scanHistoryValidator = v.object({
  barcode: v.string(),

  name: v.optional(v.string()),
  provider: v.optional(v.string()),
  createdFrom: v.optional(v.string()),
  scannedAt: v.optional(v.float64()),
});

function cleanText(value) {
  return String(value || "").trim();
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

function createHashId(prefix, values) {
  const source = values.map(normalizeForHash).join("|");

  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createStoreId(store) {
  return createHashId("store", [
    store.name,
    store.address,
    store.city,
    store.provincia,
    store.zipcode,
  ]);
}

function createItemId(item) {
  if (cleanText(item.id)) {
    return cleanText(item.id);
  }

  if (cleanText(item.barcode)) {
    return createHashId("item", [item.barcode]);
  }

  return createHashId("item", [
    item.name,
    item.brand,
    item.category,
    item.subcategory,
  ]);
}

function normalizeStore(store) {
  const name = cleanText(store.name);

  if (!name) {
    throw new Error("La tienda no tiene nombre.");
  }

  const normalizedStore = {
    id: cleanText(store.id) || createStoreId(store),
    name,
    address: cleanText(store.address),
    city: cleanText(store.city) || "gijon",
    provincia: cleanText(store.provincia) || "Asturias",
    zipcode:
      store.zipcode === undefined || store.zipcode === null
        ? 0
        : Number(store.zipcode),
  };

  if (store.location) {
    normalizedStore.location = {
      lat: Number(store.location.lat),
      lng: Number(store.location.lng),
      source: cleanText(store.location.source) || "manual",
    };
  }

  return normalizedStore;
}

function normalizeItem(item) {
  const name = cleanText(item.name);

  if (!name) {
    throw new Error("El item no tiene nombre.");
  }

  return {
    id: createItemId(item),
    name,

    category: cleanText(item.category),
    subcategory: cleanText(item.subcategory),
    brand: cleanText(item.brand),
    barcode: cleanText(item.barcode),
    unit: cleanText(item.unit) || "ud",
    image: cleanText(item.image),

    createdFrom: cleanText(item.createdFrom) || "factory",
  };
}

function normalizeScanHistory(scan) {
  const barcode = cleanText(scan.barcode);

  if (!barcode) {
    throw new Error("El scan no tiene barcode.");
  }

  return {
    barcode,
    name: cleanText(scan.name),
    provider: cleanText(scan.provider) || "factory",
    createdFrom: cleanText(scan.createdFrom) || "factory",
    scannedAt: scan.scannedAt || Date.now(),
  };
}

async function deleteAllFromTable(ctx, tableName) {
  const rows = await ctx.db.query(tableName).collect();

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }

  return rows.length;
}

async function upsertStore(ctx, store) {
  const normalizedStore = normalizeStore(store);

  const existing = await ctx.db
    .query("stores")
    .withIndex("by_storeId", (q) => q.eq("id", normalizedStore.id))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, normalizedStore);
    return "updated";
  }

  await ctx.db.insert("stores", normalizedStore);
  return "inserted";
}

async function upsertItem(ctx, item) {
  const normalizedItem = normalizeItem(item);

  const existing = await ctx.db
    .query("items")
    .withIndex("by_itemId", (q) => q.eq("id", normalizedItem.id))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, normalizedItem);
    return "updated";
  }

  await ctx.db.insert("items", normalizedItem);
  return "inserted";
}

async function insertScanHistory(ctx, scan) {
  const normalizedScan = normalizeScanHistory(scan);

  await ctx.db.insert("scanHistory", normalizedScan);

  return "inserted";
}

export const exportFactoryData = query({
  args: {},

  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();
    const items = await ctx.db.query("items").collect();
    const scanHistory = await ctx.db.query("scanHistory").collect();

    return {
      exportedAt: Date.now(),
      stores,
      items,
      scanHistory,
    };
  },
});

export const importFactoryData = mutation({
  args: {
    stores: v.optional(v.array(storeValidator)),
    items: v.optional(v.array(itemValidator)),
    scanHistory: v.optional(v.array(scanHistoryValidator)),
  },

  handler: async (ctx, args) => {
    const result = {
      ok: true,
      stores: {
        inserted: 0,
        updated: 0,
        total: args.stores?.length || 0,
      },
      items: {
        inserted: 0,
        updated: 0,
        total: args.items?.length || 0,
      },
      scanHistory: {
        inserted: 0,
        total: args.scanHistory?.length || 0,
      },
    };

    for (const store of args.stores || []) {
      const action = await upsertStore(ctx, store);

      if (action === "inserted") {
        result.stores.inserted += 1;
      } else {
        result.stores.updated += 1;
      }
    }

    for (const item of args.items || []) {
      const action = await upsertItem(ctx, item);

      if (action === "inserted") {
        result.items.inserted += 1;
      } else {
        result.items.updated += 1;
      }
    }

    for (const scan of args.scanHistory || []) {
      await insertScanHistory(ctx, scan);
      result.scanHistory.inserted += 1;
    }

    return result;
  },
});

export const resetFactoryData = mutation({
  args: {
    stores: v.optional(v.array(storeValidator)),
    items: v.optional(v.array(itemValidator)),
    scanHistory: v.optional(v.array(scanHistoryValidator)),

    resetStores: v.optional(v.boolean()),
    resetItems: v.optional(v.boolean()),
    resetScanHistory: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const deleted = {
      stores: 0,
      items: 0,
      scanHistory: 0,
    };

    if (args.resetStores) {
      deleted.stores = await deleteAllFromTable(ctx, "stores");
    }

    if (args.resetItems) {
      deleted.items = await deleteAllFromTable(ctx, "items");
    }

    if (args.resetScanHistory) {
      deleted.scanHistory = await deleteAllFromTable(ctx, "scanHistory");
    }

    const imported = {
      stores: {
        inserted: 0,
        updated: 0,
        total: args.stores?.length || 0,
      },
      items: {
        inserted: 0,
        updated: 0,
        total: args.items?.length || 0,
      },
      scanHistory: {
        inserted: 0,
        total: args.scanHistory?.length || 0,
      },
    };

    for (const store of args.stores || []) {
      const action = await upsertStore(ctx, store);

      if (action === "inserted") {
        imported.stores.inserted += 1;
      } else {
        imported.stores.updated += 1;
      }
    }

    for (const item of args.items || []) {
      const action = await upsertItem(ctx, item);

      if (action === "inserted") {
        imported.items.inserted += 1;
      } else {
        imported.items.updated += 1;
      }
    }

    for (const scan of args.scanHistory || []) {
      await insertScanHistory(ctx, scan);
      imported.scanHistory.inserted += 1;
    }

    return {
      ok: true,
      deleted,
      imported,
    };
  },
});

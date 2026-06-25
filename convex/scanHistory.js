import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function normalizeBarcode(barcode) {
  return String(barcode || "").trim();
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function readProductField(product, fields) {
  for (const field of fields) {
    const value = product?.[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return undefined;
}

export const getLatestByBarcode = query({
  args: {
    barcode: v.string(),
  },
  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      return null;
    }

    return await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode_updatedAt", (q) => q.eq("barcode", barcode))
      .order("desc")
      .first();
  },
});

export const listRecentByUsername = query({
  args: {
    username: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const username = normalizeOptionalString(args.username);

    if (!username) {
      return [];
    }

    return await ctx.db
      .query("scanHistory")
      .withIndex("by_username_scannedAt", (q) => q.eq("username", username))
      .order("desc")
      .take(args.limit ?? 30);
  },
});

export const listRecentByDeviceId = query({
  args: {
    deviceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const deviceId = normalizeOptionalString(args.deviceId);

    if (!deviceId) {
      return [];
    }

    return await ctx.db
      .query("scanHistory")
      .withIndex("by_deviceId_scannedAt", (q) => q.eq("deviceId", deviceId))
      .order("desc")
      .take(args.limit ?? 30);
  },
});

export const saveScanFromLookup = mutation({
  args: {
    barcode: v.string(),
    format: v.optional(v.string()),

    product: v.optional(v.any()),

    username: v.optional(v.string()),
    deviceId: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),

    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const barcode = normalizeBarcode(args.barcode);
    const product = args.product || {};

    if (!barcode) {
      throw new Error("barcode is required");
    }

    const existing = await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode_updatedAt", (q) => q.eq("barcode", barcode))
      .order("desc")
      .first();

    const name = readProductField(product, [
      "name",
      "title",
      "productName",
      "product_name",
    ]);

    const brand = readProductField(product, ["brand", "brands"]);

    const imageUrl = readProductField(product, [
      "imageUrl",
      "image",
      "image_url",
      "image_front_url",
    ]);

    const category = readProductField(product, ["category", "categories"]);

    const subcategory = readProductField(product, [
      "subcategory",
      "subcategories",
    ]);

    const productUrl = readProductField(product, ["productUrl", "url", "link"]);

    const source =
      normalizeOptionalString(args.source) ||
      normalizeOptionalString(product.source) ||
      "internet";

    const productData = {
      barcode,
      format: normalizeOptionalString(args.format),

      name,
      brand,
      imageUrl,
      category,
      subcategory,
      productUrl,

      source,
      rawData: product,

      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...productData,
        scannedAt: now,
      });

      return {
        action: "updated",
        id: existing._id,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...productData,

      username: normalizeOptionalString(args.username) || "anonymous",
      deviceId: normalizeOptionalString(args.deviceId),

      storeId: normalizeOptionalString(args.storeId),
      storeName: normalizeOptionalString(args.storeName),

      scannedAt: now,
      createdAt: now,
    });

    return {
      action: "inserted",
      id,
    };
  },
});

export const saveManualScan = mutation({
  args: {
    barcode: v.string(),
    format: v.optional(v.string()),
    name: v.optional(v.string()),

    username: v.optional(v.string()),
    deviceId: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("barcode is required");
    }

    const existing = await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode_updatedAt", (q) => q.eq("barcode", barcode))
      .order("desc")
      .first();

    const productData = {
      barcode,
      format: normalizeOptionalString(args.format),
      name: normalizeOptionalString(args.name),
      source: "manual",
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...productData,
        scannedAt: now,
      });

      return {
        action: "updated",
        id: existing._id,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...productData,

      username: normalizeOptionalString(args.username) || "anonymous",
      deviceId: normalizeOptionalString(args.deviceId),

      storeId: normalizeOptionalString(args.storeId),
      storeName: normalizeOptionalString(args.storeName),

      scannedAt: now,
      createdAt: now,
    });

    return {
      action: "inserted",
      id,
    };
  },
});

export const removeScan = mutation({
  args: {
    id: v.id("scanHistory"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);

    return {
      deleted: true,
    };
  },
});

export const clearByUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizeOptionalString(args.username);

    if (!username) {
      return {
        deleted: 0,
      };
    }

    const scans = await ctx.db
      .query("scanHistory")
      .withIndex("by_username_scannedAt", (q) => q.eq("username", username))
      .collect();

    for (const scan of scans) {
      await ctx.db.delete(scan._id);
    }

    return {
      deleted: scans.length,
    };
  },
});

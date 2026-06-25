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

export const getByBarcode = query({
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

export const saveProductFromLookup = mutation({
  args: {
    barcode: v.string(),
    product: v.optional(v.any()),
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
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
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

    const productUrl = readProductField(product, ["productUrl", "url", "link"]);

    const source =
      normalizeOptionalString(args.source) ||
      normalizeOptionalString(product.source) ||
      "internet";

    const data = {
      barcode,

      name,
      brand,
      imageUrl,
      category,
      productUrl,

      source,
      rawData: product,

      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);

      return {
        action: "updated",
        id: existing._id,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...data,
      createdAt: now,
    });

    return {
      action: "inserted",
      id,
    };
  },
});

export const saveManualProduct = mutation({
  args: {
    barcode: v.string(),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("barcode is required");
    }

    const existing = await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .first();

    const data = {
      barcode,

      name: normalizeOptionalString(args.name),
      brand: normalizeOptionalString(args.brand),
      imageUrl: normalizeOptionalString(args.imageUrl),
      category: normalizeOptionalString(args.category),
      productUrl: normalizeOptionalString(args.productUrl),

      source: normalizeOptionalString(args.source) || "manual",

      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);

      return {
        action: "updated",
        id: existing._id,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...data,
      createdAt: now,
    });

    return {
      action: "inserted",
      id,
    };
  },
});

export const listProducts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scanHistory")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const removeProduct = mutation({
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

export const clearProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("scanHistory").collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return {
      deleted: products.length,
    };
  },
});

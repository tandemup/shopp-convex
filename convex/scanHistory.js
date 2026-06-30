import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_SOURCE = "internet";
const MANUAL_SOURCE = "manual";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 300;

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

function normalizeSource(value, fallback = DEFAULT_SOURCE) {
  return normalizeOptionalString(value) || fallback;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function clampLimit(value) {
  if (!isFiniteNumber(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT);
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

function getProductName(product) {
  return readProductField(product, [
    "name",
    "title",
    "productName",
    "product_name",
    "generic_name",
  ]);
}

function getProductBrand(product) {
  return readProductField(product, ["brand", "brands"]);
}

function getProductImageUrl(product) {
  return readProductField(product, [
    "imageUrl",
    "image",
    "image_url",
    "image_front_url",
    "selected_images",
  ]);
}

function getProductCategory(product) {
  return readProductField(product, [
    "category",
    "categories",
    "main_category",
    "categories_tags",
  ]);
}

function getProductUrl(product) {
  return readProductField(product, [
    "productUrl",
    "url",
    "link",
    "product_url",
  ]);
}

function buildLookupData({ barcode, product, source, now }) {
  return {
    barcode,

    name: getProductName(product),
    brand: getProductBrand(product),
    imageUrl: getProductImageUrl(product),
    category: getProductCategory(product),
    productUrl: getProductUrl(product),

    source:
      normalizeOptionalString(source) ||
      normalizeOptionalString(product?.source) ||
      DEFAULT_SOURCE,

    rawData: product,

    updatedAt: now,
  };
}

function buildManualData({ barcode, args, now }) {
  return {
    barcode,

    name: normalizeOptionalString(args.name),
    brand: normalizeOptionalString(args.brand),
    imageUrl: normalizeOptionalString(args.imageUrl),
    category: normalizeOptionalString(args.category),
    productUrl: normalizeOptionalString(args.productUrl),

    source: normalizeSource(args.source, MANUAL_SOURCE),

    updatedAt: now,
  };
}

async function getExistingByBarcode(ctx, barcode) {
  return await ctx.db
    .query("scanHistory")
    .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
    .first();
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

    const existing = await getExistingByBarcode(ctx, barcode);

    const data = buildLookupData({
      barcode,
      product,
      source: args.source,
      now,
    });

    if (existing) {
      await ctx.db.patch(existing._id, data);

      return {
        ok: true,
        action: "updated",
        id: existing._id,
        barcode,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...data,
      createdAt: now,
    });

    return {
      ok: true,
      action: "inserted",
      id,
      barcode,
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

    const existing = await getExistingByBarcode(ctx, barcode);

    const data = buildManualData({
      barcode,
      args,
      now,
    });

    if (existing) {
      await ctx.db.patch(existing._id, data);

      return {
        ok: true,
        action: "updated",
        id: existing._id,
        barcode,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...data,
      createdAt: now,
    });

    return {
      ok: true,
      action: "inserted",
      id,
      barcode,
    };
  },
});

export const listProducts = query({
  args: {
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);

    return await ctx.db
      .query("scanHistory")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);
  },
});

export const listProductsByBarcode = query({
  args: {
    barcode: v.string(),
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);
    const limit = clampLimit(args.limit);

    if (!barcode) {
      return [];
    }

    return await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode_updatedAt", (q) => q.eq("barcode", barcode))
      .order("desc")
      .take(limit);
  },
});

export const removeProduct = mutation({
  args: {
    id: v.id("scanHistory"),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      return {
        ok: true,
        deleted: false,
      };
    }

    await ctx.db.delete(args.id);

    return {
      ok: true,
      deleted: true,
    };
  },
});

export const removeProductByBarcode = mutation({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("barcode is required");
    }

    const products = await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return {
      ok: true,
      deleted: products.length,
      barcode,
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
      ok: true,
      deleted: products.length,
    };
  },
});

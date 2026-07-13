import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const NEGATIVE_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeBarcode(value) {
  return String(value || "").replace(/\D/g, "");
}

function validateBarcode(barcode) {
  if (!barcode) {
    throw new Error("El código de barras no puede estar vacío.");
  }

  if (!/^\d{8,14}$/.test(barcode)) {
    throw new Error("El código de barras debe contener entre 8 y 14 dígitos.");
  }
}

function normalizeOptionalString(value) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function hasUsefulProductData(data) {
  return Boolean(
    normalizeOptionalString(data.name) ||
    normalizeOptionalString(data.brand) ||
    normalizeOptionalString(data.category) ||
    normalizeOptionalString(data.imageUrl) ||
    normalizeOptionalString(data.productUrl),
  );
}

export const registerAccess = mutation({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);
    validateBarcode(barcode);

    const now = Date.now();

    const existingProduct = await ctx.db
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    if (existingProduct) {
      const accessCount = (existingProduct.accessCount || 0) + 1;

      await ctx.db.patch(existingProduct._id, {
        accessCount,
        lastAccessedAt: now,
        updatedAt: now,
      });

      return {
        created: false,
        product: {
          ...existingProduct,
          accessCount,
          lastAccessedAt: now,
          updatedAt: now,
        },
      };
    }

    const productId = await ctx.db.insert("productCache", {
      barcode,
      accessCount: 1,
      status: "pending",
      source: "scanner",
      lookupFailureCount: 0,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    });

    return {
      created: true,
      product: await ctx.db.get(productId),
    };
  },
});

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
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();
  },
});

export const saveProductData = mutation({
  args: {
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
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);
    validateBarcode(barcode);

    const now = Date.now();
    const data = {
      name: normalizeOptionalString(args.name),
      brand: normalizeOptionalString(args.brand),
      category: normalizeOptionalString(args.category),
      imageUrl: normalizeOptionalString(args.imageUrl),
      productUrl: normalizeOptionalString(args.productUrl),
    };

    const status =
      args.status || (hasUsefulProductData(data) ? "complete" : "pending");

    const patch = {
      ...data,
      source: args.source || "manual",
      status,
      updatedAt: now,
      ...(status === "complete"
        ? {
            lastExternalLookupAt: args.source === "internet" ? now : undefined,
            nextExternalLookupAt: undefined,
            lookupFailureCount: 0,
          }
        : {}),
    };

    const existingProduct = await ctx.db
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    if (existingProduct) {
      await ctx.db.patch(existingProduct._id, patch);
      return await ctx.db.get(existingProduct._id);
    }

    const productId = await ctx.db.insert("productCache", {
      barcode,
      ...patch,
      accessCount: 1,
      lookupFailureCount: 0,
      createdAt: now,
      lastAccessedAt: now,
    });

    return await ctx.db.get(productId);
  },
});

export const markAsNotFound = mutation({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);
    validateBarcode(barcode);

    const now = Date.now();

    const existingProduct = await ctx.db
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    if (existingProduct) {
      await ctx.db.patch(existingProduct._id, {
        status: "not_found",
        source: "internet",
        lastExternalLookupAt: now,
        nextExternalLookupAt: now + NEGATIVE_CACHE_DURATION_MS,
        lookupFailureCount: (existingProduct.lookupFailureCount || 0) + 1,
        updatedAt: now,
        lastAccessedAt: now,
      });

      return await ctx.db.get(existingProduct._id);
    }

    const productId = await ctx.db.insert("productCache", {
      barcode,
      accessCount: 1,
      status: "not_found",
      source: "internet",
      lastExternalLookupAt: now,
      nextExternalLookupAt: now + NEGATIVE_CACHE_DURATION_MS,
      lookupFailureCount: 1,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    });

    return await ctx.db.get(productId);
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveBarcodeScan = mutation({
  args: {
    barcode: v.string(),

    format: v.optional(v.string()),
    source: v.optional(v.string()),

    productName: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),

    userId: v.optional(v.string()),
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
  },

  handler: async (ctx, args) => {
    if (!args.consent?.accepted) {
      throw new Error(
        "No se puede guardar la lectura del código de barras sin consentimiento del usuario.",
      );
    }

    const now = Date.now();

    const scanId = await ctx.db.insert("barcodeScans", {
      barcode: args.barcode.trim(),

      format: args.format,
      source: args.source ?? "scanner",

      productName: args.productName,
      brand: args.brand,
      category: args.category,
      subcategory: args.subcategory,

      storeId: args.storeId,
      storeName: args.storeName,

      userId: args.userId,
      username: args.username,

      consent: {
        accepted: args.consent.accepted,
        acceptedAt: args.consent.acceptedAt,
        version: args.consent.version ?? "v1",
        purpose:
          args.consent.purpose ??
          "Guardar historial de lecturas de códigos de barras.",
      },

      rawResult: args.rawResult,

      createdAt: now,
      updatedAt: now,
    });

    return scanId;
  },
});

export const listBarcodeScansByUser = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (!args.userId) {
      return [];
    }

    const scans = await ctx.db
      .query("barcodeScans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return scans;
  },
});

export const listBarcodeScansByBarcode = query({
  args: {
    barcode: v.string(),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const scans = await ctx.db
      .query("barcodeScans")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode.trim()))
      .order("desc")
      .take(limit);

    return scans;
  },
});

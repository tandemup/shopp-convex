import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listScanHistory = query({
  args: {
    username: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("scanHistory")
      .withIndex("by_username_scannedAt", (q) =>
        q.eq("username", args.username),
      )
      .order("desc")
      .take(limit);
  },
});

export const addScan = mutation({
  args: {
    barcode: v.string(),
    format: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.optional(v.string()),

    username: v.optional(v.string()),
    deviceId: v.optional(v.string()),

    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const barcode = args.barcode.trim();

    if (!barcode) {
      throw new Error("El código de barras no puede estar vacío");
    }

    const username = args.username || "anonymous";
    const now = Date.now();

    const existing = await ctx.db
      .query("scanHistory")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .filter((q) => q.eq(q.field("username"), username))
      .first();

    const payload = {
      barcode,
      format: args.format,
      name: args.name,
      source: args.source,
      username,
      deviceId: args.deviceId,
      storeId: args.storeId,
      storeName: args.storeName,
      scannedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);

      return {
        action: "updated",
        id: existing._id,
      };
    }

    const id = await ctx.db.insert("scanHistory", {
      ...payload,
      createdAt: now,
    });

    return {
      action: "inserted",
      id,
    };
  },
});

export const deleteScan = mutation({
  args: {
    scanId: v.id("scanHistory"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.scanId);

    return {
      deleted: true,
    };
  },
});

export const clearScanHistory = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("scanHistory")
      .withIndex("by_username_scannedAt", (q) =>
        q.eq("username", args.username),
      )
      .collect();

    for (const scan of scans) {
      await ctx.db.delete(scan._id);
    }

    return {
      deleted: scans.length,
    };
  },
});

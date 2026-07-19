import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

function normalizeBarcode(barcode) {
  return String(barcode || "")
    .replace(/\D/g, "")
    .trim();
}

function optionalText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const cleanValue = String(value).trim();

  return cleanValue || undefined;
}

function optionalNullableText(value) {
  if (value === null) {
    return null;
  }

  return optionalText(value);
}

function clampLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT);
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Debes iniciar sesión para sincronizar el historial.");
  }

  return String(userId);
}

async function getExistingByUserAndBarcode(ctx, userId, barcode) {
  return await ctx.db
    .query("userScanHistory")
    .withIndex("by_user_barcode", (q) =>
      q.eq("userId", userId).eq("barcode", barcode),
    )
    .first();
}

function buildScanPatch(args, fallbackUpdatedAt) {
  return {
    name: optionalText(args.name),
    brand: optionalText(args.brand),
    url: optionalText(args.url),
    productUrl: optionalText(args.productUrl),
    imageUrl: optionalText(args.imageUrl),
    thumbnailUri: optionalNullableText(args.thumbnailUri),
    category: optionalText(args.category),
    notes: optionalText(args.notes),
    source: optionalText(args.source) || "scanner",
    lookupSource: optionalNullableText(args.lookupSource),
    dataSource: optionalText(args.dataSource),
    updatedAt: optionalText(args.updatedAt) || fallbackUpdatedAt,
  };
}

const scanFields = {
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

  scannedAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
};

export const listMyScanHistory = query({
  args: {
    limit: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const limit = clampLimit(args.limit);

    return await ctx.db
      .query("userScanHistory")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const getMyScanByBarcode = query({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      return null;
    }

    return await getExistingByUserAndBarcode(ctx, userId, barcode);
  },
});

export const saveMyScannedEntry = mutation({
  args: scanFields,

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("barcode is required");
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const existing = await getExistingByUserAndBarcode(ctx, userId, barcode);
    const patch = buildScanPatch(args, nowIso);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...patch,
        scannedAt: existing.scannedAt || optionalText(args.scannedAt) || nowIso,
        scanCount: Number(existing.scanCount || 0) + 1,
        updatedAtMs: now,
      });

      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("userScanHistory", {
      userId,
      barcode,
      ...patch,
      scannedAt: optionalText(args.scannedAt) || nowIso,
      scanCount: 1,
      createdAt: now,
      updatedAtMs: now,
    });

    return await ctx.db.get(id);
  },
});

export const updateMyScannedEntry = mutation({
  args: scanFields,

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("barcode is required");
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const existing = await getExistingByUserAndBarcode(ctx, userId, barcode);
    const patch = buildScanPatch(args, nowIso);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...patch,
        scannedAt: existing.scannedAt || optionalText(args.scannedAt) || nowIso,
        scanCount: Number(existing.scanCount || 1),
        updatedAtMs: now,
      });

      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("userScanHistory", {
      userId,
      barcode,
      ...patch,
      scannedAt: optionalText(args.scannedAt) || nowIso,
      scanCount: 1,
      createdAt: now,
      updatedAtMs: now,
    });

    return await ctx.db.get(id);
  },
});

export const removeMyScannedEntry = mutation({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      return { ok: true, deleted: false };
    }

    const existing = await getExistingByUserAndBarcode(ctx, userId, barcode);

    if (!existing) {
      return { ok: true, deleted: false };
    }

    await ctx.db.delete(existing._id);

    return { ok: true, deleted: true };
  },
});

export const clearMyScanHistory = mutation({
  args: {},

  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const scans = await ctx.db
      .query("userScanHistory")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .collect();

    for (const scan of scans) {
      await ctx.db.delete(scan._id);
    }

    return { ok: true, deleted: scans.length };
  },
});

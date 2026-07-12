import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeBarcode(value) {
  return String(value || "").trim();
}

function normalizeOptionalString(value) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

/**
 * Busca el producto y registra un acceso.
 *
 * Si no existe, crea inmediatamente un registro mínimo.
 * La operación se ejecuta de forma atómica en Convex.
 */
export const registerAccess = mutation({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("El código de barras no puede estar vacío.");
    }

    const now = Date.now();

    const existingProduct = await ctx.db
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    if (existingProduct) {
      const nextAccessCount = (existingProduct.accessCount || 0) + 1;

      await ctx.db.patch(existingProduct._id, {
        accessCount: nextAccessCount,
        lastAccessedAt: now,
        updatedAt: now,
      });

      return {
        created: false,
        product: {
          ...existingProduct,
          accessCount: nextAccessCount,
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
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    });

    const product = await ctx.db.get(productId);

    return {
      created: true,
      product,
    };
  },
});

/**
 * Obtiene el producto sin aumentar el contador.
 */
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

/**
 * Guarda o actualiza la información obtenida manualmente
 * o mediante una consulta externa.
 */
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

    if (!barcode) {
      throw new Error("El código de barras no puede estar vacío.");
    }

    const now = Date.now();

    const existingProduct = await ctx.db
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    const patch = {
      name: normalizeOptionalString(args.name),
      brand: normalizeOptionalString(args.brand),
      category: normalizeOptionalString(args.category),
      imageUrl: normalizeOptionalString(args.imageUrl),
      productUrl: normalizeOptionalString(args.productUrl),
      source: args.source || "manual",
      status:
        args.status ||
        (normalizeOptionalString(args.name) ? "complete" : "pending"),
      updatedAt: now,
    };

    if (existingProduct) {
      await ctx.db.patch(existingProduct._id, patch);

      return await ctx.db.get(existingProduct._id);
    }

    const productId = await ctx.db.insert("productCache", {
      barcode,
      ...patch,
      accessCount: 1,
      createdAt: now,
      lastAccessedAt: now,
    });

    return await ctx.db.get(productId);
  },
});

/**
 * Marca que una consulta externa no encontró datos.
 * El registro se conserva para conocer el número de lecturas.
 */
export const markAsNotFound = mutation({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    const product = await ctx.db
      .query("productCache")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    if (!product) {
      return null;
    }

    await ctx.db.patch(product._id, {
      status: "not_found",
      updatedAt: Date.now(),
    });

    return product._id;
  },
});

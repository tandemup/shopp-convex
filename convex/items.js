import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Leer todos los productos.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("items")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

/**
 * Leer un producto por ID.
 */
export const getById = query({
  args: {
    id: v.id("items"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Buscar producto por código de barras.
 */
export const getByBarcode = query({
  args: {
    barcode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .first();
  },
});

/**
 * Crear producto.
 */
export const create = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    barcode: v.optional(v.string()),
    qty: v.optional(v.number()),
    unit: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("items", {
      name: args.name.trim(),
      category: args.category?.trim() || undefined,
      brand: args.brand?.trim() || undefined,
      barcode: args.barcode?.trim() || undefined,

      qty: args.qty ?? 1,
      unit: args.unit ?? "ud",
      price: args.price ?? 0,

      checked: false,
      bought: false,

      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

/**
 * Actualizar producto.
 */
export const update = mutation({
  args: {
    id: v.id("items"),

    name: v.optional(v.string()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    barcode: v.optional(v.string()),

    qty: v.optional(v.number()),
    unit: v.optional(v.string()),
    price: v.optional(v.number()),

    checked: v.optional(v.boolean()),
    bought: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("El producto no existe.");
    }
    const cleanPatch = {};
    if (patch.name !== undefined) {
      cleanPatch.name = patch.name.trim();
    }
    if (patch.category !== undefined) {
      cleanPatch.category = patch.category.trim() || undefined;
    }
    if (patch.brand !== undefined) {
      cleanPatch.brand = patch.brand.trim() || undefined;
    }
    if (patch.barcode !== undefined) {
      cleanPatch.barcode = patch.barcode.trim() || undefined;
    }
    if (patch.qty !== undefined) {
      cleanPatch.qty = patch.qty;
    }
    if (patch.unit !== undefined) {
      cleanPatch.unit = patch.unit;
    }
    if (patch.price !== undefined) {
      cleanPatch.price = patch.price;
    }
    if (patch.checked !== undefined) {
      cleanPatch.checked = patch.checked;
    }
    if (patch.bought !== undefined) {
      cleanPatch.bought = patch.bought;
    }
    cleanPatch.updatedAt = Date.now();
    await ctx.db.patch(id, cleanPatch);
    return id;
  },
});

/**
 * Cambiar checked rápidamente.
 */
export const toggleChecked = mutation({
  args: {
    id: v.id("items"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("El producto no existe.");
    }
    await ctx.db.patch(args.id, {
      checked: !item.checked,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

/**
 * Eliminar producto.
 */
export const remove = mutation({
  args: {
    id: v.id("items"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("El producto no existe.");
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

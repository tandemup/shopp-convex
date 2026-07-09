import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CONSENT_VERSION = "product_copy_v1";

const CONSENT_TEXT =
  "Acepto guardar una copia del código de barras y las características del producto en la base de datos de Shopp para mejorar el catálogo de productos.";

function now() {
  return Date.now();
}

function cleanString(value) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBarcode(barcode) {
  return String(barcode || "").trim();
}

function buildProductSnapshot(product) {
  return {
    name: cleanString(product.name),
    brand: cleanString(product.brand),
    category: cleanString(product.category),
    subcategory: cleanString(product.subcategory),
    image: cleanString(product.image),
    unit: cleanString(product.unit),
    quantity: cleanString(product.quantity),
    notes: cleanString(product.notes),
  };
}

export const saveProductWithConsent = mutation({
  args: {
    userId: v.string(),

    barcode: v.string(),

    product: v.object({
      name: v.optional(v.string()),
      brand: v.optional(v.string()),
      category: v.optional(v.string()),
      subcategory: v.optional(v.string()),
      image: v.optional(v.string()),
      unit: v.optional(v.string()),
      quantity: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),

    consentAccepted: v.boolean(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) {
      throw new Error("El código de barras es obligatorio.");
    }

    if (!args.userId) {
      throw new Error("El userId es obligatorio.");
    }

    if (!args.consentAccepted) {
      throw new Error(
        "No se puede guardar una copia del producto sin consentimiento del usuario.",
      );
    }

    const timestamp = now();
    const productSnapshot = buildProductSnapshot(args.product);

    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();

    if (existingProduct) {
      await ctx.db.patch(existingProduct._id, {
        name: productSnapshot.name ?? existingProduct.name,
        brand: productSnapshot.brand ?? existingProduct.brand,
        category: productSnapshot.category ?? existingProduct.category,
        subcategory: productSnapshot.subcategory ?? existingProduct.subcategory,
        image: productSnapshot.image ?? existingProduct.image,
        unit: productSnapshot.unit ?? existingProduct.unit,
        quantity: productSnapshot.quantity ?? existingProduct.quantity,
        source: existingProduct.source ?? "user",
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("products", {
        barcode,
        name: productSnapshot.name,
        brand: productSnapshot.brand,
        category: productSnapshot.category,
        subcategory: productSnapshot.subcategory,
        image: productSnapshot.image,
        unit: productSnapshot.unit,
        quantity: productSnapshot.quantity,
        source: "user",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    const existingContribution = await ctx.db
      .query("productContributions")
      .withIndex("by_user_barcode", (q) =>
        q.eq("userId", args.userId).eq("barcode", barcode),
      )
      .unique();

    const contributionPayload = {
      userId: args.userId,
      barcode,
      productSnapshot,
      consent: {
        accepted: true,
        consentVersion: CONSENT_VERSION,
        consentText: CONSENT_TEXT,
        consentedAt: timestamp,
      },
      updatedAt: timestamp,
    };

    if (existingContribution) {
      await ctx.db.patch(existingContribution._id, contributionPayload);

      return {
        ok: true,
        productUpdated: true,
        contributionUpdated: true,
      };
    }

    await ctx.db.insert("productContributions", {
      ...contributionPayload,
      createdAt: timestamp,
    });

    return {
      ok: true,
      productUpdated: Boolean(existingProduct),
      contributionCreated: true,
    };
  },
});

export const revokeProductContributionConsent = mutation({
  args: {
    userId: v.string(),
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    const existingContribution = await ctx.db
      .query("productContributions")
      .withIndex("by_user_barcode", (q) =>
        q.eq("userId", args.userId).eq("barcode", barcode),
      )
      .unique();

    if (!existingContribution) {
      return {
        ok: true,
        changed: false,
      };
    }

    await ctx.db.patch(existingContribution._id, {
      consent: {
        ...existingContribution.consent,
        accepted: false,
        revokedAt: now(),
      },
      updatedAt: now(),
    });

    return {
      ok: true,
      changed: true,
    };
  },
});

export const getProductByBarcode = query({
  args: {
    barcode: v.string(),
  },

  handler: async (ctx, args) => {
    const barcode = normalizeBarcode(args.barcode);

    if (!barcode) return null;

    return await ctx.db
      .query("products")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .unique();
  },
});

export const getUserProductContributions = query({
  args: {
    userId: v.string(),
  },

  handler: async (ctx, args) => {
    if (!args.userId) return [];

    return await ctx.db
      .query("productContributions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

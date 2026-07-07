import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function cleanText(value) {
  return String(value || "").trim();
}

function cleanStoreId(value) {
  return cleanText(value);
}

function sortStoresByName(stores) {
  return [...stores].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    }),
  );
}

async function getStoreByStoreId(ctx, storeId) {
  return await ctx.db
    .query("stores")
    .withIndex("by_storeId", (q) => q.eq("id", storeId))
    .unique();
}

async function getFavoriteByUserAndStore(ctx, userId, storeId) {
  return await ctx.db
    .query("userStoreFavorites")
    .withIndex("by_user_store", (q) =>
      q.eq("userId", userId).eq("storeId", storeId),
    )
    .unique();
}

export const listFavoriteStoresByUser = query({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("userStoreFavorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stores = [];

    for (const favorite of favorites) {
      const store = await getStoreByStoreId(ctx, favorite.storeId);

      if (store) {
        stores.push({
          ...store,
          favorite: true,
          favoriteId: favorite._id,
          favoriteCreatedAt: favorite.createdAt,
        });
      }
    }

    return sortStoresByName(stores);
  },
});

export const listStoresWithFavoriteByUser = query({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const stores = await ctx.db.query("stores").collect();

    const favorites = await ctx.db
      .query("userStoreFavorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const favoriteStoreIds = new Set(
      favorites.map((favorite) => favorite.storeId),
    );

    return sortStoresByName(
      stores.map((store) => ({
        ...store,
        favorite: favoriteStoreIds.has(store.id),
      })),
    );
  },
});

export const isStoreFavoriteByUser = query({
  args: {
    userId: v.id("users"),
    storeId: v.string(),
  },

  handler: async (ctx, args) => {
    const storeId = cleanStoreId(args.storeId);

    if (!storeId) {
      return false;
    }

    const existing = await getFavoriteByUserAndStore(ctx, args.userId, storeId);

    return Boolean(existing);
  },
});

export const addStoreFavorite = mutation({
  args: {
    userId: v.id("users"),
    storeId: v.string(),
  },

  handler: async (ctx, args) => {
    const storeId = cleanStoreId(args.storeId);

    if (!storeId) {
      throw new Error("Falta el id de la tienda.");
    }

    const store = await getStoreByStoreId(ctx, storeId);

    if (!store) {
      throw new Error("La tienda no existe.");
    }

    const existing = await getFavoriteByUserAndStore(ctx, args.userId, storeId);

    if (existing) {
      return {
        ok: true,
        created: false,
        userId: args.userId,
        storeId,
        favorite: true,
      };
    }

    await ctx.db.insert("userStoreFavorites", {
      userId: args.userId,
      storeId,
      createdAt: Date.now(),
    });

    return {
      ok: true,
      created: true,
      userId: args.userId,
      storeId,
      favorite: true,
    };
  },
});

export const removeStoreFavorite = mutation({
  args: {
    userId: v.id("users"),
    storeId: v.string(),
  },

  handler: async (ctx, args) => {
    const storeId = cleanStoreId(args.storeId);

    if (!storeId) {
      throw new Error("Falta el id de la tienda.");
    }

    const existing = await getFavoriteByUserAndStore(ctx, args.userId, storeId);

    if (!existing) {
      return {
        ok: true,
        deleted: false,
        userId: args.userId,
        storeId,
        favorite: false,
      };
    }

    await ctx.db.delete(existing._id);

    return {
      ok: true,
      deleted: true,
      userId: args.userId,
      storeId,
      favorite: false,
    };
  },
});

export const toggleStoreFavoriteForUser = mutation({
  args: {
    userId: v.id("users"),
    storeId: v.string(),
  },

  handler: async (ctx, args) => {
    const storeId = cleanStoreId(args.storeId);

    if (!storeId) {
      throw new Error("Falta el id de la tienda.");
    }

    const store = await getStoreByStoreId(ctx, storeId);

    if (!store) {
      throw new Error("La tienda no existe.");
    }

    const existing = await getFavoriteByUserAndStore(ctx, args.userId, storeId);

    if (existing) {
      await ctx.db.delete(existing._id);

      return {
        ok: true,
        userId: args.userId,
        storeId,
        favorite: false,
      };
    }

    await ctx.db.insert("userStoreFavorites", {
      userId: args.userId,
      storeId,
      createdAt: Date.now(),
    });

    return {
      ok: true,
      userId: args.userId,
      storeId,
      favorite: true,
    };
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const storeValidator = v.object({
  id: v.string(),
  name: v.string(),
  city: v.string(),
  provincia: v.string(),
  address: v.string(),
  zipcode: v.number(),
  location: v.object({
    lat: v.number(),
    lng: v.number(),
    source: v.string(),
  }),
  favorite: v.boolean(),
});

export const listStores = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stores").collect();
  },
});

export const getStoreById = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stores")
      .withIndex("by_storeId", (q) => q.eq("id", args.id))
      .unique();
  },
});

export const listStoresByCity = query({
  args: {
    city: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stores")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
  },
});

export const upsertStores = mutation({
  args: {
    stores: v.array(storeValidator),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const store of args.stores) {
      const existing = await ctx.db
        .query("stores")
        .withIndex("by_storeId", (q) => q.eq("id", store.id))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, store);
        updated += 1;
      } else {
        await ctx.db.insert("stores", store);
        inserted += 1;
      }
    }

    return {
      inserted,
      updated,
      total: args.stores.length,
    };
  },
});

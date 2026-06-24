import { query } from "./_generated/server";
import { v } from "convex/values";

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

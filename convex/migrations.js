import { mutation } from "./_generated/server";

export const removeFavoriteFromStores = mutation({
  args: {},

  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();

    let patched = 0;

    for (const store of stores) {
      if ("favorite" in store) {
        await ctx.db.patch(store._id, {
          favorite: undefined,
        });

        patched += 1;
      }
    }

    return {
      ok: true,
      patched,
    };
  },
});

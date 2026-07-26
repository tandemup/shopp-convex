import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

function cleanString(value) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function cleanNullableString(value) {
  const text = cleanString(value);
  return text ?? null;
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export const importItemsFromAsyncStorage = mutation({
  args: {
    importBatchId: v.string(),
    items: v.array(
      v.object({
        importKey: v.string(),

        listId: v.optional(v.string()),
        listName: v.optional(v.string()),
        listArchived: v.optional(v.boolean()),
        listCreatedAt: v.optional(v.float64()),
        listArchivedAt: v.optional(v.union(v.float64(), v.null())),
        storeId: v.optional(v.union(v.string(), v.null())),

        itemId: v.optional(v.string()),
        name: v.optional(v.string()),
        barcode: v.optional(v.string()),
        quantity: v.optional(v.float64()),
        unit: v.optional(v.string()),
        unitPrice: v.optional(v.float64()),
        checked: v.optional(v.boolean()),

        categoryId: v.optional(v.union(v.string(), v.null())),
        categoryName: v.optional(v.union(v.string(), v.null())),
        subcategoryId: v.optional(v.union(v.string(), v.null())),
        subcategoryName: v.optional(v.union(v.string(), v.null())),

        rawList: v.optional(v.any()),
        rawItem: v.any(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const userId = admin._id;
    const now = Date.now();

    let inserted = 0;
    let skipped = 0;

    for (const item of args.items) {
      const existing = await ctx.db
        .query("shoppingItemsImport")
        .withIndex("by_user_importKey", (q) =>
          q.eq("userId", userId).eq("importKey", item.importKey),
        )
        .unique();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("shoppingItemsImport", {
        userId,
        importBatchId: args.importBatchId,
        importKey: item.importKey,

        listId: cleanString(item.listId),
        listName: cleanString(item.listName),
        listArchived: item.listArchived,
        listCreatedAt: item.listCreatedAt,
        listArchivedAt: item.listArchivedAt,
        storeId: cleanNullableString(item.storeId),

        itemId: cleanString(item.itemId),
        name: cleanString(item.name),
        barcode: cleanString(item.barcode),
        quantity: cleanNumber(item.quantity),
        unit: cleanString(item.unit),
        unitPrice: cleanNumber(item.unitPrice),
        checked: item.checked,

        categoryId: cleanNullableString(item.categoryId),
        categoryName: cleanNullableString(item.categoryName),
        subcategoryId: cleanNullableString(item.subcategoryId),
        subcategoryName: cleanNullableString(item.subcategoryName),

        rawList: item.rawList,
        rawItem: item.rawItem,

        importedBy: userId,
        importedAt: now,
        updatedAt: now,
      });

      inserted += 1;
    }

    return {
      total: args.items.length,
      inserted,
      skipped,
      importBatchId: args.importBatchId,
    };
  },
});

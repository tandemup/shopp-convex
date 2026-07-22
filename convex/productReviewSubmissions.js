import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const submissionFields = {
  barcode: v.string(),
  name: v.optional(v.string()),
  brand: v.optional(v.string()),
  category: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  productUrl: v.optional(v.string()),
  reviewNote: v.optional(v.string()),
  status: v.string(),
  submittedBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

export const listForAdmin = query({
  args: {
    status: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status) {
      return await ctx.db
        .query("productReviewSubmissions")
        .withIndex("by_status_createdAt", (q) => q.eq("status", args.status))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("productReviewSubmissions")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: submissionFields,

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();

    return await ctx.db.insert("productReviewSubmissions", {
      ...args,
      submittedBy: args.submittedBy || identity?.subject,
      status: args.status || "pending_review",
      createdAt: args.createdAt || now,
      updatedAt: now,
    });
  },
});

export const updateForAdmin = mutation({
  args: {
    id: v.id("productReviewSubmissions"),
    barcode: v.string(),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...changes } = args;

    await ctx.db.patch(id, {
      ...changes,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const approveForAdmin = mutation({
  args: {
    id: v.id("productReviewSubmissions"),
    reviewNote: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const submission = await ctx.db.get(args.id);

    if (!submission) {
      throw new Error("Producto enviado no encontrado");
    }

    await ctx.db.patch(args.id, {
      status: "approved",
      reviewNote: args.reviewNote || submission.reviewNote,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

export const rejectForAdmin = mutation({
  args: {
    id: v.id("productReviewSubmissions"),
    reviewNote: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const submission = await ctx.db.get(args.id);

    if (!submission) {
      throw new Error("Producto enviado no encontrado");
    }

    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewNote: args.reviewNote || submission.reviewNote,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

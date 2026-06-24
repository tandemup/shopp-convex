import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listMessages = query({
  args: {
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_createdAt", (q) => q.eq("room", args.room))
      .order("desc")
      .take(50);

    return messages.reverse();
  },
});

export const sendMessage = mutation({
  args: {
    room: v.string(),
    username: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();

    if (!text) {
      throw new Error("El mensaje no puede estar vacío");
    }

    await ctx.db.insert("chatMessages", {
      room: args.room || "general",
      username: args.username || "anonymous",
      text,
      createdAt: Date.now(),
    });
  },
});

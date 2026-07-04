// convex/chat.js

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SELF_DELETE_MS = 24 * 60 * 60 * 1000;

function normalizeRoom(room) {
  const cleanRoom = String(room || "").trim();

  if (!cleanRoom) {
    return "general";
  }

  return cleanRoom;
}

function normalizeUsername(username) {
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername) {
    return "anonymous";
  }

  return cleanUsername;
}

function normalizeText(text) {
  return String(text || "").trim();
}

export const listMessages = query({
  args: {
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const room = normalizeRoom(args.room);
    const now = Date.now();

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_createdAt", (q) => q.eq("room", room))
      .order("asc")
      .collect();

    return messages.filter((message) => {
      if (message.status && message.status !== "visible") {
        return false;
      }

      if (!message.expiresAt) {
        return true;
      }

      return message.expiresAt > now;
    });
  },
});

export const sendMessage = mutation({
  args: {
    room: v.string(),
    username: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const room = normalizeRoom(args.room);
    const username = normalizeUsername(args.username);
    const text = normalizeText(args.text);

    if (!text) {
      throw new Error("El mensaje no puede estar vacío.");
    }

    if (text.length > 500) {
      throw new Error("El mensaje no puede superar 500 caracteres.");
    }

    const now = Date.now();

    return await ctx.db.insert("chatMessages", {
      room,
      username,
      text,
      createdAt: now,
      status: "visible",
      messageStatus: "clean",
      checkedLocallyAt: now,
      expiresAt: now + SELF_DELETE_MS,
    });
  },
});

export const hideMessage = mutation({
  args: {
    id: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "hidden",
    });

    return args.id;
  },
});

export const blockMessage = mutation({
  args: {
    id: v.id("chatMessages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "blocked",
      messageStatus: "blocked",
      blockedReason: args.reason || "Mensaje bloqueado.",
    });

    return args.id;
  },
});

export const deleteExpiredMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const message of expiredMessages) {
      await ctx.db.delete(message._id);
    }

    return {
      deleted: expiredMessages.length,
    };
  },
});

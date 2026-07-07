import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const SELF_DELETE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_USERNAME = "anonymous";

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
    return DEFAULT_USERNAME;
  }

  return cleanUsername.slice(0, 40);
}

function normalizeText(text) {
  return String(text || "").trim();
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

async function getDisplayUsername(ctx, userId, fallbackUsername) {
  const user = await ctx.db.get(userId);

  return normalizeUsername(
    user?.name || user?.email || fallbackUsername || DEFAULT_USERNAME,
  );
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
    text: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const room = normalizeRoom(args.room);
    const username = await getDisplayUsername(ctx, userId, args.username);
    const text = normalizeText(args.text);

    if (!text) {
      throw new Error("El mensaje no puede estar vacío.");
    }

    if (text.length > 500) {
      throw new Error("El mensaje no puede superar 500 caracteres.");
    }

    const now = Date.now();

    return await ctx.db.insert("chatMessages", {
      userId,
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
    const userId = await requireAuthUserId(ctx);
    const message = await ctx.db.get(args.id);

    if (!message) {
      throw new Error("El mensaje no existe.");
    }

    if (message.userId && message.userId !== userId) {
      throw new Error("No puedes ocultar mensajes de otro usuario.");
    }

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
    await requireAuthUserId(ctx);

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

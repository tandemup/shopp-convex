import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_ROOM = "general";
const DEFAULT_USERNAME = "anonymous";

const MAX_MESSAGE_DAYS = 7;
const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_PER_ROOM = 100;

const BLOCKED_WORDS = ["palabra1", "palabra2", "palabra3"];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function containsBlockedContent(text) {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return false;
  }

  return BLOCKED_WORDS.some((word) => {
    const normalizedWord = normalizeText(word);

    if (!normalizedWord) {
      return false;
    }

    return normalizedText.includes(normalizedWord);
  });
}

function getMinCreatedAt() {
  return Date.now() - MAX_MESSAGE_DAYS * 24 * 60 * 60 * 1000;
}

export const listMessages = query({
  args: {
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanRoom = args.room.trim() || DEFAULT_ROOM;
    const minCreatedAt = getMinCreatedAt();

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_createdAt", (q) =>
        q.eq("room", cleanRoom).gte("createdAt", minCreatedAt),
      )
      .order("desc")
      .take(MAX_MESSAGES_PER_ROOM);

    return messages
      .filter((message) => {
        if (message.status === "hidden") {
          return false;
        }

        if (message.status === "blocked") {
          return false;
        }

        return true;
      })
      .reverse();
  },
});

export const sendMessage = mutation({
  args: {
    room: v.string(),
    username: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanRoom = args.room.trim() || DEFAULT_ROOM;
    const cleanUsername = args.username.trim() || DEFAULT_USERNAME;
    const cleanText = args.text.trim();

    if (!cleanText) {
      throw new Error("El mensaje está vacío.");
    }

    if (cleanText.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
    }

    if (containsBlockedContent(cleanText)) {
      throw new Error("El mensaje no cumple las normas del chat.");
    }

    await ctx.db.insert("chatMessages", {
      room: cleanRoom,
      username: cleanUsername,
      text: cleanText,
      createdAt: Date.now(),
      status: "visible",
    });
  },
});

export const hideMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "hidden",
    });
  },
});

export const deleteOldMessages = mutation({
  args: {
    maxDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxDays = args.maxDays ?? MAX_MESSAGE_DAYS;
    const minCreatedAt = Date.now() - maxDays * 24 * 60 * 60 * 1000;

    const oldMessages = await ctx.db
      .query("chatMessages")
      .filter((q) => q.lt(q.field("createdAt"), minCreatedAt))
      .collect();

    for (const message of oldMessages) {
      await ctx.db.delete(message._id);
    }

    return {
      deleted: oldMessages.length,
    };
  },
});

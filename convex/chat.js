import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_ROOM = "general";
const DEFAULT_USERNAME = "anonymous";

const MESSAGE_TTL_HOURS = 24;
const MESSAGE_TTL_MS = MESSAGE_TTL_HOURS * 60 * 60 * 1000;

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_PER_ROOM = 100;

const BLOCKED_WORDS = ["palabra1", "palabra2", "palabra3"];

const urlInfoValidator = v.object({
  originalUrl: v.string(),
  normalizedUrl: v.union(v.string(), v.null()),
  hostname: v.union(v.string(), v.null()),

  status: v.union(
    v.literal("pending"),
    v.literal("safe"),
    v.literal("suspicious"),
    v.literal("malicious"),
  ),

  riskScore: v.float64(),
  reason: v.string(),
  provider: v.string(),
  checkedAt: v.float64(),
});

const messageStatusValidator = v.union(
  v.literal("clean"),
  v.literal("blocked"),
  v.literal("warning"),
  v.literal("pending_url_check"),
);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cleanText(value) {
  return String(value || "").trim();
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

function hasMaliciousUrl(urls = []) {
  return urls.some((urlInfo) => urlInfo.status === "malicious");
}

function hasSuspiciousUrl(urls = []) {
  return urls.some((urlInfo) => urlInfo.status === "suspicious");
}

function hasPendingUrl(urls = []) {
  return urls.some((urlInfo) => urlInfo.status === "pending");
}

function getExpiresAt(createdAt) {
  return createdAt + MESSAGE_TTL_MS;
}

function getMessageExpiresAt(message) {
  return message.expiresAt ?? getExpiresAt(message.createdAt);
}

function isExpired(message, now = Date.now()) {
  return getMessageExpiresAt(message) <= now;
}

function getFinalMessageStatus(urls = [], requestedStatus) {
  if (hasMaliciousUrl(urls)) {
    return "blocked";
  }

  if (hasPendingUrl(urls)) {
    return "pending_url_check";
  }

  if (hasSuspiciousUrl(urls)) {
    return "warning";
  }

  return requestedStatus || "clean";
}

async function deleteExpiredMessagesInRoom(ctx, room) {
  const now = Date.now();

  const roomMessages = await ctx.db
    .query("chatMessages")
    .withIndex("by_room_createdAt", (q) => q.eq("room", room))
    .collect();

  let deleted = 0;

  for (const message of roomMessages) {
    if (isExpired(message, now)) {
      await ctx.db.delete(message._id);
      deleted += 1;
    }
  }

  return deleted;
}

export const listMessages = query({
  args: {
    room: v.string(),
  },

  handler: async (ctx, args) => {
    const cleanRoom = cleanText(args.room) || DEFAULT_ROOM;
    const now = Date.now();

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_createdAt", (q) => q.eq("room", cleanRoom))
      .order("desc")
      .take(MAX_MESSAGES_PER_ROOM);

    return messages
      .filter((message) => {
        // Compatibilidad con mensajes antiguos:
        // si message.status no existe, lo tratamos como "visible".
        const visibilityStatus = message.status || "visible";

        if (visibilityStatus === "hidden") {
          return false;
        }

        if (visibilityStatus === "blocked") {
          return false;
        }

        if (isExpired(message, now)) {
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

    urls: v.optional(v.array(urlInfoValidator)),
    messageStatus: v.optional(messageStatusValidator),
    checkedLocallyAt: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const cleanRoom = cleanText(args.room) || DEFAULT_ROOM;
    const cleanUsername = cleanText(args.username) || DEFAULT_USERNAME;
    const cleanMessageText = cleanText(args.text);

    const urls = Array.isArray(args.urls) ? args.urls : [];
    const now = Date.now();

    const checkedLocallyAt = args.checkedLocallyAt ?? now;
    const finalMessageStatus = getFinalMessageStatus(urls, args.messageStatus);

    if (!cleanMessageText) {
      throw new Error("El mensaje está vacío.");
    }

    if (cleanMessageText.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
    }

    if (containsBlockedContent(cleanMessageText)) {
      throw new Error("El mensaje no cumple las normas del chat.");
    }

    if (hasMaliciousUrl(urls)) {
      throw new Error("El mensaje contiene una URL bloqueada.");
    }

    await deleteExpiredMessagesInRoom(ctx, cleanRoom);

    const messageId = await ctx.db.insert("chatMessages", {
      room: cleanRoom,
      username: cleanUsername,
      text: cleanMessageText,

      createdAt: now,
      expiresAt: now + MESSAGE_TTL_MS,

      status: "visible",
      messageStatus: finalMessageStatus,

      checkedLocallyAt,
      urls,
    });

    return {
      ok: true,
      messageId,
    };
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

    return {
      ok: true,
    };
  },
});

export const blockMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "blocked",
      messageStatus: "blocked",
      checkedExternallyAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});

export const deleteOldMessages = mutation({
  args: {
    maxHours: v.optional(v.float64()),
  },

  handler: async (ctx, args) => {
    const maxHours = args.maxHours ?? MESSAGE_TTL_HOURS;
    const minCreatedAt = Date.now() - maxHours * 60 * 60 * 1000;

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

export const deleteExpiredMessages = mutation({
  args: {},

  handler: async (ctx) => {
    const now = Date.now();

    const messages = await ctx.db.query("chatMessages").collect();

    let deleted = 0;

    for (const message of messages) {
      if (isExpired(message, now)) {
        await ctx.db.delete(message._id);
        deleted += 1;
      }
    }

    return {
      deleted,
    };
  },
});

export const updateUrlStatus = mutation({
  args: {
    messageId: v.id("chatMessages"),
    urls: v.array(urlInfoValidator),
    messageStatus: messageStatusValidator,
  },

  handler: async (ctx, args) => {
    const finalMessageStatus = getFinalMessageStatus(
      args.urls,
      args.messageStatus,
    );

    await ctx.db.patch(args.messageId, {
      urls: args.urls,
      messageStatus: finalMessageStatus,
      checkedExternallyAt: Date.now(),

      // Si una comprobación externa marca la URL como maliciosa,
      // ocultamos el mensaje del chat.
      status: finalMessageStatus === "blocked" ? "blocked" : "visible",
    });

    return {
      ok: true,
    };
  },
});

export const migrateMissingStatus = mutation({
  args: {},

  handler: async (ctx) => {
    const messages = await ctx.db.query("chatMessages").collect();

    let updated = 0;

    for (const message of messages) {
      const patch = {};

      if (!message.status) {
        patch.status = "visible";
      }

      if (!message.messageStatus) {
        patch.messageStatus = "clean";
      }

      if (!message.expiresAt) {
        patch.expiresAt = getExpiresAt(message.createdAt);
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(message._id, patch);
        updated += 1;
      }
    }

    return {
      updated,
    };
  },
});

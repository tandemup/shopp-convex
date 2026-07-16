import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
const DRAFT_TTL_MS = 60 * 60 * 1000;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function requireUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Debes iniciar sesión para enviar una comunicación.");
  }

  return userId;
}

function cleanFileName(value) {
  return String(value || "archivo")
    .replace(/[\\/\0\r\n]/g, "_")
    .trim()
    .slice(0, 140);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerAttachment = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.float64(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const mimeType = args.mimeType.trim().toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Este tipo de archivo no está permitido.");
    }

    if (args.size <= 0 || args.size > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Cada archivo debe ocupar como máximo 5 MB.");
    }

    const existing = await ctx.db
      .query("rightsReportAttachments")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();
    const activeAttachments = [];

    for (const attachment of existing) {
      if (attachment.expiresAt <= now) {
        await ctx.storage.delete(attachment.storageId);
        await ctx.db.delete(attachment._id);
      } else {
        activeAttachments.push(attachment);
      }
    }

    if (activeAttachments.length >= MAX_FILES) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`Solo se permiten ${MAX_FILES} archivos.`);
    }

    const totalSize = activeAttachments.reduce(
      (sum, item) => sum + item.size,
      0,
    );

    if (totalSize + args.size > MAX_TOTAL_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Los adjuntos no pueden superar 10 MB en total.");
    }

    return await ctx.db.insert("rightsReportAttachments", {
      userId,
      storageId: args.storageId,
      fileName: cleanFileName(args.fileName),
      mimeType,
      size: args.size,
      createdAt: Date.now(),
      expiresAt: Date.now() + DRAFT_TTL_MS,
    });
  },
});

export const deleteDraftAttachment = mutation({
  args: { attachmentId: v.id("rightsReportAttachments") },
  handler: async (ctx, { attachmentId }) => {
    const userId = await requireUserId(ctx);
    const attachment = await ctx.db.get(attachmentId);

    if (!attachment || attachment.userId !== userId) return;

    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(attachmentId);
  },
});

export const clearMyDraftAttachments = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const attachments = await ctx.db
      .query("rightsReportAttachments")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .collect();

    for (const attachment of attachments) {
      await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete(attachment._id);
    }

    return { deleted: attachments.length };
  },
});

export const getReportData = internalQuery({
  args: {
    userId: v.id("users"),
    attachmentIds: v.array(v.id("rightsReportAttachments")),
  },
  handler: async (ctx, { userId, attachmentIds }) => {
    if (attachmentIds.length > MAX_FILES) {
      throw new Error(`Solo se permiten ${MAX_FILES} archivos.`);
    }

    const user = await ctx.db.get(userId);
    const attachments = [];
    let totalSize = 0;

    for (const attachmentId of attachmentIds) {
      const attachment = await ctx.db.get(attachmentId);

      if (!attachment || attachment.userId !== userId) {
        throw new Error("No tienes acceso a uno de los adjuntos.");
      }

      totalSize += attachment.size;

      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error("Los adjuntos no pueden superar 10 MB en total.");
      }

      const url = await ctx.storage.getUrl(attachment.storageId);

      if (!url) throw new Error("Uno de los adjuntos ya no está disponible.");

      attachments.push({ ...attachment, url });
    }

    return {
      senderEmail: user?.email || null,
      attachments,
    };
  },
});

export const deleteUploadedFiles = internalMutation({
  args: {
    userId: v.id("users"),
    attachmentIds: v.array(v.id("rightsReportAttachments")),
  },
  handler: async (ctx, { userId, attachmentIds }) => {
    for (const attachmentId of attachmentIds) {
      const attachment = await ctx.db.get(attachmentId);

      if (!attachment || attachment.userId !== userId) continue;

      await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete(attachmentId);
    }
  },
});

export const cleanupExpiredDrafts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("rightsReportAttachments")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now()))
      .take(50);

    for (const attachment of expired) {
      await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete(attachment._id);
    }
  },
});

"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

const ADMIN_EMAIL = "info@ramshopp.com";
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2000;

function cleanLine(value, fallback) {
  return String(value || fallback)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export const sendReport = action({
  args: {
    subject: v.string(),
    message: v.string(),
    room: v.string(),
    username: v.string(),
    attachmentIds: v.array(v.id("rightsReportAttachments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Debes iniciar sesión para enviar una comunicación.");
    }

    const subject = args.subject.trim();
    const message = args.message.trim();

    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      throw new Error("El asunto no es válido.");
    }

    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("La descripción no es válida.");
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      throw new Error("El servicio de correo de Shopp no está configurado.");
    }

    const reportData = await ctx.runQuery(
      internal.rightsReports.getReportData,
      { userId, attachmentIds: args.attachmentIds },
    );

    try {
      const attachments = [];

      for (const item of reportData.attachments) {
        const response = await fetch(item.url);

        if (!response.ok) {
          throw new Error(`No se pudo leer el adjunto ${item.fileName}.`);
        }

        const bytes = Buffer.from(await response.arrayBuffer());

        if (bytes.length > item.size + 1024) {
          throw new Error(`El tamaño de ${item.fileName} no es válido.`);
        }

        attachments.push({
          filename: item.fileName,
          content: bytes.toString("base64"),
        });
      }

      const body = [
        "Comunicación privada dirigida a la administración de Shopp.",
        "",
        `Usuario autenticado: ${reportData.senderEmail || "sin correo disponible"}`,
        `Alias del chat: ${cleanLine(args.username, "anonymous")}`,
        `Room: ${cleanLine(args.room, "general")}`,
        "",
        "Descripción:",
        message,
      ].join("\n");

      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [ADMIN_EMAIL],
        replyTo: reportData.senderEmail || undefined,
        subject: `[Shopp] ${subject}`,
        text: body,
        attachments,
      });

      if (error) {
        throw new Error(error.message || "Resend rechazó el correo.");
      }

      return { sent: true, emailId: data?.id || null };
    } finally {
      await ctx.runMutation(internal.rightsReports.deleteUploadedFiles, {
        userId,
        attachmentIds: args.attachmentIds,
      });
    }
  },
});

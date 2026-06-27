import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_TEXT_LENGTH = 280;
const DEFAULT_LIMIT = 80;

export const listParkingMessages = query({
  args: {
    city: v.string(),
    zone: v.string(),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, DEFAULT_LIMIT);

    const messages = await ctx.db
      .query("parkingMessages")
      .withIndex("by_city_zone_createdAt", (q) =>
        q.eq("city", args.city).eq("zone", args.zone),
      )
      .order("desc")
      .take(limit);

    return messages.reverse();
  },
});

export const sendParkingMessage = mutation({
  args: {
    city: v.string(),
    zone: v.string(),
    userId: v.string(),
    text: v.string(),
    status: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const city = args.city.trim().toLowerCase();
    const zone = args.zone.trim().toLowerCase();
    const userId = args.userId.trim() || "anonymous";
    const text = args.text.trim();

    if (!city) {
      throw new Error("La ciudad es obligatoria.");
    }

    if (!zone) {
      throw new Error("La zona es obligatoria.");
    }

    if (!text) {
      throw new Error("El mensaje no puede estar vacío.");
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(
        `El mensaje no puede superar ${MAX_TEXT_LENGTH} caracteres.`,
      );
    }

    return await ctx.db.insert("parkingMessages", {
      city,
      zone,
      userId,
      text,
      status: args.status,
      lat: args.lat,
      lng: args.lng,
      createdAt: Date.now(),
    });
  },
});

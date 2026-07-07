import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function cleanText(value) {
  return String(value || "").trim();
}

function cleanAlias(value) {
  const alias = cleanText(value);
  return alias ? alias.slice(0, 40) : "anonymous";
}

function cleanPhone(value) {
  const phone = cleanText(value);
  return phone ? phone.slice(0, 30) : undefined;
}

async function requireAuthUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }

  return String(userId);
}

async function getProfileByUserId(ctx, userId) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);

    if (authUserId === null) {
      return null;
    }

    const user = await ctx.db.get(authUserId);

    if (!user) {
      return null;
    }

    const userId = String(authUserId);
    const profile = await getProfileByUserId(ctx, userId);

    return {
      _id: user._id,
      _creationTime: user._creationTime,

      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,

      emailVerificationTime: user.emailVerificationTime ?? null,
      phone: profile?.phone ?? user.phone ?? null,
      phoneVerificationTime: user.phoneVerificationTime ?? null,
      isAnonymous: user.isAnonymous ?? false,

      profile: profile
        ? {
            _id: profile._id,
            alias: profile.alias,
            phone: profile.phone ?? null,
            phoneVisible: profile.phoneVisible ?? false,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : null,
    };
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, String(userId));

    if (!profile) {
      return null;
    }

    return {
      _id: profile._id,
      alias: profile.alias,
      phone: profile.phone ?? null,
      phoneVisible: profile.phoneVisible ?? false,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  },
});

export const upsertMyProfile = mutation({
  args: {
    alias: v.string(),
    phone: v.optional(v.string()),
    phoneVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const now = Date.now();

    const alias = cleanAlias(args.alias);
    const phone = cleanPhone(args.phone);
    const phoneVisible = args.phoneVisible === true;

    const existingProfile = await getProfileByUserId(ctx, userId);

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        alias,
        phone,
        phoneVisible,
        updatedAt: now,
      });

      return {
        ok: true,
        profileId: existingProfile._id,
      };
    }

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      alias,
      phone,
      phoneVisible,
      createdAt: now,
      updatedAt: now,
    });

    return {
      ok: true,
      profileId,
    };
  },
});

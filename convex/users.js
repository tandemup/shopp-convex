import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      _creationTime: user._creationTime,

      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,

      emailVerificationTime: user.emailVerificationTime ?? null,
      phone: user.phone ?? null,
      phoneVerificationTime: user.phoneVerificationTime ?? null,
      isAnonymous: user.isAnonymous ?? false,
    };
  },
});

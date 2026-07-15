import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

import { ResendOTPEmailVerification } from "./ResendOTPEmailVerification";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: ResendOTPEmailVerification,
      reset: ResendOTPPasswordReset,
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);

      if (user && !user.role) {
        await ctx.db.patch(userId, { role: "user" });
      }
    },
  },
});

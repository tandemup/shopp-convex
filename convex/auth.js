import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

const passwordProvider = Password({
  reset: ResendOTPPasswordReset,

  validatePasswordRequirements(password) {
    if (typeof password !== "string") {
      throw new Error("La contraseña no es válida.");
    }

    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
});

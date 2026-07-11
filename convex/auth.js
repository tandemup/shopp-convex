import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
import { ResendOTPEmailVerification } from "./ResendOTPEmailVerification";

function validatePasswordRequirements(password) {
  if (typeof password !== "string") {
    throw new Error("La contraseña no es válida.");
  }

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error(
      "La contraseña debe contener al menos una letra mayúscula.",
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new Error(
      "La contraseña debe contener al menos una letra minúscula.",
    );
  }

  if (!/\d/.test(password)) {
    throw new Error("La contraseña debe contener al menos un número.");
  }
}

const passwordProvider = Password({
  reset: ResendOTPPasswordReset,
  verify: ResendOTPEmailVerification,

  profile(params) {
    const email = String(params.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      throw new Error("El correo electrónico es obligatorio.");
    }

    const profile = {
      email,
    };

    const name = String(params.name || "").trim();

    if (name) {
      profile.name = name;
    }

    /*
     * alias y phone no se guardan en la tabla interna users.
     *
     * Estos campos se almacenan posteriormente en userProfiles
     * mediante users.upsertMyProfile.
     */
    return profile;
  },

  validatePasswordRequirements,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
});

import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new Error("Debes iniciar sesión.");
  }

  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  return user;
}

export async function requireAdmin(ctx) {
  const user = await requireUser(ctx);

  const isAdmin = user.role === "admin" || user.isAdmin === true;

  if (!isAdmin) {
    throw new Error("No tienes permisos de administrador.");
  }

  return user;
}

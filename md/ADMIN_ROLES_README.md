# Roles de administrador en Shopp

## Ficheros incluidos

- `convex/schema.js`
- `convex/auth.js`
- `convex/lib/auth.js`
- `convex/users.js`
- `src/navigation/ROUTES.js`
- `src/navigation/MenuStack.js`
- `src/screens/settings/MenuScreen.js`
- `src/screens/admin/AdminUsersScreen.js`

## Activar el primer administrador

1. Despliega el esquema y las funciones con `npx convex dev`.
2. Abre el dashboard de Convex y entra en la tabla `users`.
3. Localiza tu usuario por el correo electrónico.
4. Añade el campo `role` con el valor `admin`.
5. Cierra la sesión de Shopp y vuelve a iniciarla si el menú administrativo no aparece inmediatamente.

Los demás usuarios reciben el rol `user`. Después de activar el primer administrador, los cambios de rol pueden realizarse desde **Settings > Administrar usuarios**.

La interfaz oculta el acceso a usuarios normales, pero la seguridad efectiva está en las consultas y mutaciones de Convex mediante `requireAdmin(ctx)`.

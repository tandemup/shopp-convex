# Resumen práctico

## Ficheros a crear o modificar

```txt
data/factory/stores.json
data/factory/items.json
data/factory/scanHistory.json

convex/factory.js
convex/schema.js

scripts/factory/exportFactoryData.mjs
scripts/factory/importFactoryData.mjs
scripts/factory/resetFactoryData.mjs

package.json
```

---

## Regla de diseño

```txt
stores.json
  Datos maestros de tiendas.
  Sin favorite.
  Sin userId.
  id determinista o generado desde:
    name + address + city + provincia + zipcode.

items.json
  Datos maestros de productos/items.
  id estable.
  Preferiblemente derivado de barcode.

scanHistory.json
  Mejor vacío para factory settings.
  Si se usa, tratarlo como datos de prueba.

userStoreFavorites
  No entra en factory settings maestro.
  Es dato de usuario.

createdAt / scannedAt
  Pueden usar Date.now().
  No deben usarse para generar ids maestros.
```

---

## Criterio general

Los datos de **factory settings** deben ser restaurables, reproducibles y no depender del usuario concreto.

Por tanto:

```txt
Sí entran en factory settings:
  - tiendas maestras
  - productos/items base
  - datos de prueba controlados

No deberían entrar en factory settings maestro:
  - favoritos de usuario
  - historial real de escaneos de usuarios
  - preferencias personales
  - sesiones
  - datos derivados de autenticación
```

---

## Separación recomendada

```txt
Datos maestros:
  stores
  items

Datos de usuario:
  userStoreFavorites
  scanHistory real
  shoppingLists
  preferences
```

---

## Objetivo

El sistema debe permitir:

```txt
1. Exportar datos actuales desde Convex a ficheros .json.
2. Importar datos .json locales hacia Convex.
3. Restaurar la aplicación a un estado base o "factory settings".
4. Evitar duplicados mediante ids deterministas.
5. Separar datos compartidos de datos específicos de usuario.
```

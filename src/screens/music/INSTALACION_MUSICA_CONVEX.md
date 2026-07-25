# Música en Convex File Storage

## Archivos incluidos

- `convex/schema.js`
- `convex/music.js`
- `src/navigation/ROUTES.js`
- `src/navigation/MenuStack.js`
- `src/screens/settings/MenuScreen.js`
- `src/screens/music/MusicLibraryScreen.js`

## Instalación

1. Copia la carpeta `shopp-convex-convex` sobre la raíz del proyecto y permite sobrescribir.
2. Ejecuta:

```bash
npx convex dev
```

3. Reinicia Expo:

```bash
npx expo start -c
```

4. Entra con un usuario administrador.
5. Abre `Menú > Biblioteca musical`.
6. Selecciona un MP3, escribe título/artista y pulsa `Subir a Convex`.

## Permisos

- Solo los usuarios con `role: "admin"` pueden generar URLs de subida, registrar pistas o borrarlas.
- Cualquier usuario autenticado puede listar y reproducir las pistas.

## Límites aplicados

- Máximo por archivo: 100 MB.
- Formatos: MP3, M4A, AAC, WAV y OGG.

## Nota de reproducción

La pantalla reproduce la URL servida por Convex. El navegador o reproductor nativo puede empezar a reproducir mientras descarga el resto del archivo; no necesita guardar primero el MP3 completo en AsyncStorage.

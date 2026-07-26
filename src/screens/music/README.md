# Álbumes con carátula y pistas MP3 para Shopp

Paquete simplificado sin lyrics.

## Backend Convex

- `musicAlbums.js`: crear, editar, publicar, ocultar, consultar y eliminar álbumes.
- `musicTracks.js`: añadir, editar, reemplazar y eliminar pistas.
- `musicStorage.js`: generar URL temporal de subida.
- `musicImport.js`: importar un manifiesto JSON cuyos archivos ya estén en File Storage.
- `schema.music-snippet.js`: tablas `musicAlbums` y `musicTracks`.

## Frontend

- `AdminAlbumsScreen.js`: listado y administración.
- `AdminAlbumUploadScreen.js`: subida de carátula y varios MP3.
- `AdminAlbumJsonImportScreen.js`: importar un álbum definido en JSON y subir sus archivos.
- `AdminAlbumEditScreen.js`: edición de álbum, portada y pistas.
- `MusicAlbumsScreen.js`: buscador de álbumes.
- `MusicPlayerScreen.js`: reproducción de las pistas.
- `AlbumSearchBar.js`: buscador reutilizable.

## Instalación

```bash
npx expo install expo-document-picker expo-av
npx convex dev
```

## Integración

1. Copia los archivos conservando sus rutas.
2. Abre `convex/schema.music-snippet.js`.
3. Añade sus dos tablas dentro del `defineSchema({ ... })` de tu proyecto.
4. No sustituyas tu schema completo.
5. Añade las pantallas usando `NAVIGATION_EXAMPLE.js`.
6. Ejecuta `npx convex dev` para regenerar `convex/_generated`.

Las mutaciones administrativas esperan que el usuario tenga `role: "admin"`.

## Convex File Storage

File Storage guarda los archivos físicos. Las tablas guardan el título, nombre original, orden y `storageId`. Las consultas generan `coverUrl` y `audioUrl` mediante `ctx.storage.getUrl()`.

## JSON

`src/components/music/album-manifest.json` es la plantilla recomendada. El campo
`tracks[].audio.filename` debe coincidir exactamente con el nombre del MP3 que se
seleccione en la pantalla de importación.

Ejemplo mínimo:

```json
{
  "album": {
    "title": "String Trios & Duos",
    "composer": "Mozart",
    "artist": "Grumiaux Trio",
    "genre": "Clásica",
    "year": 1990
  },
  "cover": { "filename": "cover.jpg" },
  "tracks": [
    {
      "trackNumber": 1,
      "title": "Divertimento in E",
      "audio": { "filename": "01-divertimento.mp3" }
    }
  ]
}
```

El JSON no debe contener `albumId`, `trackId` ni `storageId` cuando se usa
`AdminAlbumJsonImportScreen`: esos identificadores los genera Convex al subir
la carátula y los MP3. La mutación `musicImport.importAlbumFromJson` recibe el
JSON ya enriquecido con esos identificadores y crea el álbum y sus pistas en
una única operación de base de datos.

Para añadir la pantalla al navegador administrativo, registra la ruta:

```js
<Stack.Screen
  name="ADMIN_ALBUM_JSON_IMPORT"
  component={AdminAlbumJsonImportScreen}
  options={{ title: "Importar álbum JSON" }}
/>
```

# Música compartida mediante Google Drive

La pantalla `Música compartida` recibe un enlace directo a `album.json`, descarga los archivos en el dispositivo y los reproduce desde la biblioteca local.

En Google Drive, cada MP3 y la portada deben tener un enlace público directo. Un enlace a un archivo de Drive no permite resolver automáticamente nombres vecinos de una carpeta. El JSON debe usar `audioUrl` y `coverUrl`:

```json
{
  "title": "The Turn of a Friendly Card",
  "artist": "Alan Parsons Project",
  "coverUrl": "https://drive.google.com/uc?export=download&id=COVER_FILE_ID",
  "tracks": [
    {
      "trackNumber": 1,
      "trackTitle": "May be a price to pay",
      "audioUrl": "https://drive.google.com/uc?export=download&id=MP3_FILE_ID"
    }
  ]
}
```

En iOS y Android los archivos se guardan en el directorio persistente de la aplicación. En Web/PWA se guardan en Cache Storage y el índice del álbum en `localStorage`.

# Análisis de la carpeta `services`

Documento generado a partir de los archivos incluidos en `services.zip`.

## Resumen general

La carpeta `services` concentra lógica que no pertenece directamente a las pantallas:

| Área | Archivos | Responsabilidad |
|---|---|---|
| Chat | `chatApi.js`, `chatSocket.js` | Cargar, crear y recibir mensajes mediante HTTP y Socket.IO. |
| Productos | `productLookup.js`, `googleProductSearch.js`, `productSearchEngines.js`, `productSearchSettings.js` | Consultar productos por código de barras, construir búsquedas externas y guardar el motor elegido. |
| Historial | `scannerHistory.js` | Guardar y recuperar el historial local de códigos escaneados. |
| Seguridad | `urlSafety.js` | Detectar URLs, clasificarlas y decidir si pueden abrirse. |
| Exportación | `exportUserData.js` | Exportar datos locales a JSON en web, iOS y Android. |

## `chatApi.js`

Este archivo implementa la comunicación HTTP con el servidor de chat.

### Funciones

- `getChatMessages(room = "general")`: realiza una petición `GET` a `/api/messages`, enviando la sala como parámetro URL. Si el servidor responde con error, lanza una excepción.
- `createChatMessage({ room, username, text })`: realiza una petición `POST` a `/api/messages` con la sala, el alias y el texto del mensaje.

### Flujo

1. La pantalla solicita los mensajes de una sala.
2. El servicio construye la URL usando `SOCKET_SERVER_URL`.
3. Se convierte la respuesta a JSON.
4. Si la respuesta no es correcta, se muestra el mensaje de error del servidor.
5. En la lectura se devuelve siempre un array; si el servidor devuelve otro formato, se devuelve `[]`.

### Observaciones

- El nombre `SOCKET_SERVER_URL` se utiliza también para la API HTTP; sería más claro llamarlo `CHAT_SERVER_URL` si ambos servicios usan la misma base.
- `response.json()` se ejecuta antes de comprobar `response.ok`. Si el servidor devuelve HTML o una respuesta vacía ante un error, el análisis JSON puede fallar con un error poco descriptivo.
- No se validan localmente `text`, `room` ni `username`.

## `chatSocket.js`

Gestiona una única conexión Socket.IO reutilizable para toda la aplicación.

### Funciones

- `getChatSocket()`: crea el socket solo la primera vez y devuelve siempre la misma instancia.
- `connectChatSocket()`: conecta el socket si todavía no está conectado.
- `disconnectChatSocket()`: cierra la conexión si existe.

### Configuración

- Transporte preferente: WebSocket y, como alternativa, polling.
- Conexión inicial desactivada mediante `autoConnect: false`.
- Reconexión automática ilimitada.
- Espera entre reconexiones de 1 a 5 segundos.

### Observaciones

- El servicio solo crea la conexión; las pantallas o hooks deben registrar y eliminar sus listeners (`message`, `connect`, etc.).
- `reconnectionAttempts: Infinity` puede mantener intentos indefinidos cuando el servidor está caído. En móviles puede consumir batería o generar ruido en los logs.
- No hay una función para eliminar listeners ni para reinicializar el singleton.

## `exportUserData.js`

Recoge información guardada en `AsyncStorage` y genera un archivo JSON.

### Datos exportados

Usa estas claves:

- `shopping_lists`
- `purchase_history`
- `scanner_history_v1`
- `user_profile`

El archivo contiene `exportedAt`, aplicación, versión, información básica del usuario, listas de compra, historial de compras e historial de escaneos.

### Funcionamiento por plataforma

- **Web:** crea un `Blob`, genera una URL temporal y provoca la descarga mediante un elemento `<a>`.
- **iOS/Android:** escribe el JSON en `FileSystem.documentDirectory` y usa `expo-sharing` si está disponible.

### Observaciones

- Aunque `Sharing.isAvailableAsync()` devuelva `false`, la función termina devolviendo `{ ok: true }`; convendría indicar que el archivo se ha creado pero no se pudo abrir el diálogo de compartir.
- La exportación contiene `rawData` si los elementos del historial lo conservan. Esto puede aumentar mucho el tamaño del archivo.
- `safeJsonParse` evita que un valor corrupto bloquee toda la exportación.
- El `version: 1` permite evolucionar el formato en el futuro.
- En web se asume que existen `Blob`, `URL` y `document`; es correcto para un navegador, pero no para renderizado en servidor.

## `googleProductSearch.js`

Construye y abre búsquedas de un código de barras en Google.

### Funciones

- `getGoogleProductSearchUrl(barcode)`: genera una búsqueda general con el código entre comillas y las palabras `producto`, `EAN` y `marca`.
- `getGoogleShoppingSearchUrl(barcode)`: genera una búsqueda de Google Shopping usando `tbm=shop`.
- `openGoogleProductSearch(barcode)`: valida el código, comprueba si el dispositivo puede abrir la URL y la abre.
- `openGoogleShoppingSearch(barcode)`: aplica el mismo flujo para Shopping.

### Observaciones

- La función solo elimina espacios exteriores; no comprueba que el código sea numérico ni que tenga una longitud válida.
- `Linking.canOpenURL()` puede comportarse de forma diferente entre web, iOS y Android. La pantalla debería mostrar el error capturado.
- Las búsquedas se realizan fuera de la aplicación y no devuelven datos estructurados del producto.

## `productLookup.js`

Consulta Open Food Facts mediante su API REST y transforma la respuesta a un formato utilizado por Shopp.

### Flujo de `lookupProductByBarcode`

1. El código se convierte a texto y se eliminan todos los caracteres no numéricos.
2. Solo se aceptan longitudes de 8, 12 o 13 dígitos.
3. Se solicita un conjunto limitado de campos a Open Food Facts.
4. Se aplica un timeout de 10 segundos con `AbortController` cuando está disponible.
5. Si `status` no es `1`, se devuelve `reason: "not_found"`.
6. Si existe el producto, se normalizan nombre, marca, categoría, imagen y URL.

### Funciones auxiliares

- `getProductDisplayName`: obtiene el nombre usando varios campos alternativos.
- `getProductBrand`: obtiene la marca desde el objeto normalizado o desde `rawData`.
- `getProductImageUrl`: obtiene la primera imagen disponible.
- `getProductCategory`: obtiene la categoría disponible.
- `getProductUrl`: obtiene una URL de producto o construye una URL de Open Food Facts.

### Observaciones

- Aunque el proyecto usa principalmente EAN-13, el servicio acepta también códigos de 8 y 12 dígitos.
- El uso de `.replace(/\D/g, "")` puede ocultar errores: por ejemplo, un valor como `12-34` se convierte en `1234`.
- Se devuelve la respuesta completa en `rawData`, lo que facilita depurar pero puede guardar datos innecesarios en el historial o en una exportación.
- No se valida el dígito de control EAN/UPC; solo se comprueba la longitud.
- Los campos de categoría pueden contener listas largas separadas por comas, no necesariamente una única categoría adecuada para la interfaz.

## `productSearchEngines.js`

Define los motores de búsqueda disponibles y construye sus URLs.

### Motores configurados

- Google
- Google Shopping
- Bing
- DuckDuckGo
- OpenFoodFacts
- BarcodeLookup

`OpenFoodFacts` es el motor predeterminado.

### Funciones

- `normalizeProductSearchEngine`: devuelve un motor válido o el predeterminado.
- `buildProductSearchUrl`: construye la URL según el motor y el código.
- `openProductSearchEngine`: abre la URL mediante `openExternalUrl` y devuelve un resultado `{ ok, url/error }`.

### Observaciones

- La selección `BARCODE_LOOKUP` sí construye una URL de `barcodelookup.com`; si en la interfaz aparece Open Food Facts, el problema probablemente está en el componente que guarda, lee o pasa el motor, no en esta función.
- No se verifica la longitud ni el formato del código.
- El servicio depende de `@/src/utils/openExternalUrl`; esa utilidad debe encargarse de la compatibilidad entre web y dispositivos.

## `productSearchSettings.js`

Persiste el motor de búsqueda elegido por el usuario en `AsyncStorage`.

### Clave

```text
product_search_engine
```

### Funciones

- `getSelectedProductSearchEngine`: lee la clave y normaliza el valor.
- `saveSelectedProductSearchEngine`: valida el motor antes de guardarlo.

### Observaciones

- El valor inválido o ausente vuelve automáticamente a OpenFoodFacts.
- Los errores de lectura y escritura se silencian para la interfaz y se registran en consola.
- La configuración es local al dispositivo/navegador; no se sincroniza con Convex.

## `scannerHistory.js`

Implementa el historial local de códigos escaneados.

### Persistencia

- En web usa `window.localStorage`.
- En Android e iOS usa `AsyncStorage`.
- La clave es `scanner_history_v1`.

### Modelo normalizado

Cada entrada puede contener:

`id`, `barcode`, `name`, `brand`, `url`, `imageUrl`, `thumbnailUri`, `notes`, `source`, `lookupSource`, `scannedAt`, `updatedAt` y `scanCount`.

### Funciones públicas

- `getScannedEntryByBarcode`: busca una entrada por código.
- `getScannedHistory`: lee y normaliza todo el historial.
- `saveScannedHistory`: reemplaza el historial completo.
- `updateScannedEntry`: crea o actualiza sin incrementar `scanCount`.
- `saveScannedEntry`: crea o actualiza después de una nueva lectura e incrementa `scanCount`.
- `removeScannedItem`: elimina una entrada por código.
- `clearScannedHistory`: borra todo el historial.

### Diferencia importante

`updateScannedEntry` representa una edición de los datos del producto. `saveScannedEntry` representa un nuevo escaneo. Por eso la segunda incrementa el contador y actualiza `updatedAt`.

### Observaciones

- La búsqueda y la deduplicación se hacen por `barcode`, aunque cada entrada también tenga `id`.
- El `...safeItem` de `normalizeHistoryItem` permite conservar campos adicionales, pero también puede introducir valores de tipos inesperados.
- `scanCount: Number(...)` puede producir `NaN` si el almacenamiento está corrupto.
- Las operaciones son de tipo leer-modificar-escribir. Si dos llamadas se ejecutan simultáneamente, una podría sobrescribir los cambios de la otra.
- En web, si `localStorage` no está disponible, las funciones fallan de forma silenciosa y parecen funcionar aunque no persistan datos.
- Este servicio es local; no lee ni escribe la tabla Convex `scanHistory`.

## `urlSafety.js`

Analiza URLs incluidas en mensajes y decide si pueden abrirse.

### Estados

`trusted`, `safe`, `verified`, `pending`, `unknown`, `suspicious` y `malicious`.

### Flujo

1. `extractUrlsFromText` detecta URLs con una expresión regular.
2. `normalizeUrl` añade `https://` si falta el protocolo.
3. `getInitialUrlStatus` marca como `trusted` los dominios incluidos en `TRUSTED_DOMAINS`; el resto queda como `pending`.
4. `containsOnlySafeOpenableUrls` permite abrir el mensaje solo si todas sus URLs tienen estado confiable, seguro o verificado.

### Observaciones importantes

- `TRUSTED_DOMAINS` contiene `youtube.com/live/`, pero `getHostnameFromUrl` devuelve solo el hostname (`youtube.com`). Esa entrada de la lista no aporta una restricción por ruta.
- Marcar un dominio completo como confiable permite confiar también en todos sus subdominios. Esto puede ser demasiado permisivo para algunos dominios.
- La expresión regular puede incluir signos de puntuación finales, como `)` o `.`, dentro de la URL.
- `normalizeUrl` no restringe protocolos una vez que la cadena empieza por `http://` o `https://`; el resto se fuerza a HTTPS.
- La lista de dominios confiables está embebida en el cliente. Para una moderación fuerte, el servidor debe repetir las comprobaciones y no confiar únicamente en el estado enviado por la aplicación.
- Los estados `safe` y `verified` dependen de los datos de `message.urlSafety`, `message.urls` o `message.links`; este archivo no realiza ninguna comprobación externa por sí mismo.

## Flujo conjunto de producto escaneado

Un flujo habitual de la aplicación puede ser:

1. El lector obtiene un código.
2. `scannerHistory.saveScannedEntry` lo guarda localmente y aumenta `scanCount`.
3. `productLookup.lookupProductByBarcode` intenta completar los datos desde Open Food Facts.
4. La pantalla puede actualizar los datos con `scannerHistory.updateScannedEntry`.
5. Si el usuario quiere una búsqueda externa, `productSearchSettings` proporciona el motor elegido y `productSearchEngines` construye y abre la URL.

## Recomendaciones prioritarias

1. Validar el código de barras con una función común y, cuando corresponda, comprobar el dígito de control EAN-13.
2. Revisar el nombre `SOCKET_SERVER_URL` en `chatApi.js` para diferenciar claramente API HTTP y WebSocket.
3. Evitar guardar `rawData` completo en el historial si no es necesario.
4. Hacer que la exportación indique claramente cuando el archivo se ha creado pero no se puede compartir.
5. Corregir la entrada `youtube.com/live/` o implementar comprobación de rutas además del hostname.
6. Repetir en Convex las validaciones de URLs, mensajes y permisos; la validación del cliente no debe considerarse una barrera de seguridad.
7. Revisar las operaciones simultáneas de `scannerHistory` si existe la posibilidad de escaneos o actualizaciones concurrentes.


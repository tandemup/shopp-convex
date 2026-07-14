# Shopp: color del mapa, tipo de marcador y tamaño según zoom

Este paquete explica cómo ampliar `StoreMapPreview` para controlar:

- el color/base cartográfica del mapa;
- el tipo de marcador de `parkingSpots`;
- el color del marcador;
- su tamaño automático según el nivel de zoom.

## API recomendada

Añade estas props a `StoreMapPreview.web.js` y `StoreMapPreview.native.js`:

```jsx
<StoreMapPreview
  lat={mapCenter.lat}
  lng={mapCenter.lng}
  parkingSpots={activeParkingSpots}
  mapStyle="gray"
  parkingMarkerStyle="traditional-pin"
  parkingMarkerColor="#dc2626"
  parkingMarkerScaleByZoom
  parkingMarkerMinSize={18}
  parkingMarkerMaxSize={38}
/>
```

Valores recomendados:

### `mapStyle`

- `"default"`: OpenStreetMap normal.
- `"gray"`: CARTO Positron, fondo claro y gris.
- `"dark"`: CARTO Dark Matter.
- `"voyager"`: CARTO Voyager.

### `parkingMarkerStyle`

- `"traditional-pin"`: pin clásico en forma de gota.
- `"circle-stick"`: círculo rojo con varilla.
- `"circle"`: círculo simple.

## Capa de mapa

Usa la función de `snippets/mapTiles.js` para obtener URL y atribución.

```js
const tileConfig = getMapTileConfig(mapStyle);

<TileLayer
  url={tileConfig.url}
  attribution={tileConfig.attribution}
  maxZoom={maxZoom}
/>
```

## Tamaño según zoom

La regla incluida produce aproximadamente:

| Zoom | Tamaño |
|---:|---:|
| 13 o menos | 18 px |
| 14 | 20 px |
| 15 | 23 px |
| 16 | 26 px |
| 17 | 29 px |
| 18 | 32 px |
| 19 o más | 36–38 px |

Puedes modificar `getMarkerSizeForZoom()` para que el crecimiento sea más rápido o más lento.

## Integración web: React Leaflet

1. Copia `snippets/parkingMarkerIcons.web.js` junto a `StoreMapPreview.web.js` o integra sus funciones en el archivo.
2. Copia `snippets/DynamicParkingMarker.web.js`.
3. Sustituye el renderizado directo de cada `Marker` por `DynamicParkingMarker`.

Ejemplo:

```jsx
{parkingPoints.map((spot) => (
  <DynamicParkingMarker
    key={spot.id || spot._id}
    spot={spot}
    markerStyle={parkingMarkerStyle}
    markerColor={parkingMarkerColor}
    scaleByZoom={parkingMarkerScaleByZoom}
    minSize={parkingMarkerMinSize}
    maxSize={parkingMarkerMaxSize}
  />
))}
```

El componente escucha `zoomend` y reconstruye el icono con el nuevo tamaño sin recargar el mapa.

## Integración native: Leaflet dentro de WebView

En `StoreMapPreview.native.js`:

1. Incluye las funciones de `snippets/parkingMarkers.native.js` dentro del HTML generado.
2. Guarda los marcadores de plazas en un array o `Map`.
3. Llama a `refreshParkingMarkerIcons()` al terminar el zoom.

```js
map.on("zoomend", refreshParkingMarkerIcons);
```

Cada marcador debe recrear su `L.divIcon` usando:

```js
const size = getMarkerSizeForZoom(
  map.getZoom(),
  parkingMarkerMinSize,
  parkingMarkerMaxSize,
);
```

## Ejemplo para Cabueñes

En `ParkingSettingsScreen.js`:

```jsx
<StoreMapPreview
  lat={mapCenter.lat}
  lng={mapCenter.lng}
  userLat={userCoords?.lat}
  userLng={userCoords?.lng}
  parkingSpots={cabuenesTestSpots}
  mapStyle="gray"
  parkingMarkerStyle="traditional-pin"
  parkingMarkerColor="#ef4444"
  parkingMarkerScaleByZoom
  parkingMarkerMinSize={18}
  parkingMarkerMaxSize={38}
/>
```

Para probar el marcador de círculo con varilla cambia únicamente:

```jsx
parkingMarkerStyle="circle-stick"
```

## Selector en pantalla

Puedes guardar el estilo en estado:

```js
const [parkingMarkerStyle, setParkingMarkerStyle] = useState(
  "traditional-pin",
);
```

Y ofrecer dos botones:

```jsx
<Pressable onPress={() => setParkingMarkerStyle("traditional-pin")}>
  <Text>Pin tradicional</Text>
</Pressable>

<Pressable onPress={() => setParkingMarkerStyle("circle-stick")}>
  <Text>Círculo con varilla</Text>
</Pressable>
```

Pasa después `parkingMarkerStyle` al mapa.

## Consideraciones

- La punta inferior del pin tradicional es la coordenada exacta: `iconAnchor: [size / 2, height]`.
- En el círculo con varilla, el extremo inferior de la varilla es la coordenada exacta.
- No uses un PNG remoto: SVG dentro de `L.divIcon` evita problemas de resolución y caché.
- Mantén la atribución de OpenStreetMap/CARTO visible.
- Para muchos cientos de marcadores, actualiza iconos solo en `zoomend`, no durante `zoom`.

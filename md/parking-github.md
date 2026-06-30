# Utilidad de Aparcamiento Colaborativo

Este documento describe la lógica inicial de una utilidad de aparcamiento basada en salas de chat, coordenadas compartidas y estados de disponibilidad de plazas.

## Objetivo

La utilidad permite que varios usuarios compartan información sobre plazas de aparcamiento disponibles en una zona concreta.  
Cuando un conductor libera una plaza, la aplicación guarda las coordenadas y las muestra como una plaza potencialmente válida para aparcar.

## Concepto general

La funcionalidad se comporta como un chat con `rooms`, donde cada sala puede representar una ciudad, zona, barrio o grupo de usuarios.

Cada usuario puede estar en uno de estos estados:

| Estado | Descripción |
|---|---|
| `Buscando` | El usuario está buscando una plaza para aparcar. |
| `Aparqué` | El usuario ha aparcado su coche. |
| `Salí` | El usuario ha salido de una plaza y puede compartir su ubicación como libre. |

## Funcionamiento básico

1. Un usuario entra en una sala de aparcamiento.
2. El usuario indica su estado actual.
3. Cuando el usuario pulsa `Salí`, la app guarda la coordenada de la plaza que deja libre.
4. Esa coordenada se conserva en la base de datos.
5. La plaza se marca visualmente en verde en el mapa.
6. Otros usuarios pueden ver esa coordenada como una plaza potencialmente libre.
7. El estado de la plaza se revisa periódicamente.

## Coordenadas compartidas

Cuando un conductor libera una plaza, se guarda un registro similar a este:

```js
{
  room: "gijon-centro",
  username: "wolfgang",
  status: "free",
  location: {
    lat: 43.5322,
    lng: -5.6611
  },
  createdAt: 1782311958619,
  checkedAt: 1782312558619
}
```

## Estados de una plaza

Cada plaza registrada puede tener un estado conocido:

| Estado | Descripción |
|---|---|
| `free` | La plaza fue liberada y está marcada como válida para aparcar. |
| `occupied` | La plaza ya no está disponible. |
| `unknown` | No se conoce con seguridad el estado actual. |

## Revisión periódica

El estado de cada plaza puede comprobarse cada 10 minutos.

Esta comprobación puede realizarse mediante:

- actualización manual por parte de usuarios cercanos;
- geofencing;
- confirmación desde la app;
- caducidad automática;
- validación externa si se añade lógica adicional.

## Reglas recomendadas

### Caducidad

Una plaza marcada como libre no debería considerarse válida indefinidamente.

Ejemplo:

```js
const FREE_SPOT_TTL_MS = 10 * 60 * 1000;
```

Pasado ese tiempo, la app puede:

- marcar la plaza como `unknown`;
- ocultarla del mapa;
- pedir confirmación a usuarios cercanos;
- reducir su prioridad visual.

### Visualización en mapa

Colores recomendados:

| Color | Significado |
|---|---|
| Verde | Plaza recientemente liberada y potencialmente disponible. |
| Amarillo | Plaza antigua o pendiente de confirmar. |
| Rojo | Plaza marcada como ocupada. |
| Gris | Plaza expirada o desconocida. |

## Modelo de datos recomendado

### `parkingRooms`

```js
{
  name: "gijon-centro",
  city: "Gijón",
  zone: "Centro",
  createdAt: Date.now()
}
```

### `parkingMessages`

```js
{
  room: "gijon-centro",
  username: "wolfgang",
  text: "Acabo de salir de esta plaza",
  userState: "Salí",
  location: {
    lat: 43.5322,
    lng: -5.6611
  },
  createdAt: Date.now()
}
```

### `parkingSpots`

```js
{
  room: "gijon-centro",
  reportedBy: "wolfgang",
  status: "free",
  location: {
    lat: 43.5322,
    lng: -5.6611
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  checkedAt: Date.now(),
  expiresAt: Date.now() + 10 * 60 * 1000
}
```

## Flujo de usuario

```text
Usuario entra en una room
        |
        v
Selecciona estado: Buscando / Aparqué / Salí
        |
        v
Si selecciona "Salí"
        |
        v
Se guardan coordenadas de la plaza
        |
        v
La plaza aparece en verde en el mapa
        |
        v
Otros usuarios pueden verla
        |
        v
Cada 10 minutos se revisa su estado
```

## Consideraciones de seguridad y privacidad

La app debe evitar guardar información innecesaria del usuario.

Recomendaciones:

- no guardar matrícula;
- no mostrar identidad real del usuario;
- usar un `username` o alias;
- limitar precisión si es necesario;
- eliminar coordenadas antiguas;
- evitar tracking continuo sin consentimiento;
- informar al usuario cuando se comparta su ubicación.

## Integración con Convex

La utilidad de parking debería mantenerse separada de la utilidad general de chat.

Archivos recomendados:

```text
convex/
  schema.js
  parking.js
  chat.js
```

La lógica de parking debería vivir preferentemente en `convex/parking.js`, no mezclada con `convex/chat.js`.

## Próximos pasos

- Crear tabla `parkingSpots`.
- Añadir estado `Buscando / Aparqué / Salí` en la pantalla de parking.
- Guardar coordenadas al seleccionar `Salí`.
- Mostrar marcadores verdes en el mapa.
- Añadir expiración automática de plazas.
- Revisar el estado cada 10 minutos.
- Separar completamente la lógica de parking y chat general.
- Añadir geofencing para detectar usuarios cerca de una plaza.

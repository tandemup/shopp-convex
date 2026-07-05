# Utilidad Parking en Shopp: funcionamiento, escalabilidad con Convex y criterio sobre tiempo real

Fecha: 5 de julio de 2026

## 1. Idea general

La utilidad **Parking** es una funcionalidad colaborativa para compartir información útil de aparcamiento entre usuarios de una misma zona.

No debe entenderse como un simple mapa GPS de coches en movimiento. Su valor real está en capturar **eventos de aparcamiento**:

- un usuario está buscando plaza;
- un usuario acaba de aparcar;
- un usuario va a salir y puede liberar una plaza;
- un usuario abandona la búsqueda porque no encontró aparcamiento o inició la búsqueda por error;
- otros usuarios cercanos ven esas señales en el mapa y pueden reaccionar.

La app funciona como una mezcla de:

- chat por zonas o `rooms`;
- mapa colaborativo;
- estado temporal de usuarios;
- registro de plazas potencialmente útiles.

## 2. Estados principales

Una máquina de estados razonable para Parking sería esta:

| Estado | Significado | Se muestra a otros usuarios | Comentario |
|---|---|---:|---|
| `looking` | El usuario busca aparcamiento | Sí | Indica demanda en la zona. |
| `parked` | El usuario ha aparcado | Opcional | Puede registrar una plaza ocupada por ese usuario. |
| `leaving` | El usuario va a salir | Sí, muy importante | Es el evento más valioso: una plaza puede quedar libre. |
| `aborted` / `cancelled` | El usuario abandona la búsqueda | No, o solo como estadística | Sirve para cerrar una búsqueda sin generar información falsa. |
| `idle` | El usuario no participa en Parking | No | Estado por defecto. |

Conviene impedir transiciones incoherentes. Por ejemplo:

- de `looking` se puede pasar a `parked` o `aborted`;
- de `parked` se puede pasar a `leaving`;
- de `leaving` se puede pasar a `idle` cuando se confirma que se ha ido;
- de `leaving` no debería pasarse directamente a `parked`;
- de `parked` no debería pasarse directamente a `looking` sin cerrar antes la situación anterior.

## 3. Flujo funcional recomendado

### 3.1. Configuración inicial

El usuario abre **Ajustes** y define:

- alias o `userId` visible;
- destino elegido;
- zona de búsqueda;
- quizá radio de visibilidad;
- permisos de ubicación.

El destino debe ser un objeto estable, no solo un texto:

```js
{
  id: "palacio_deportes_gijon",
  label: "Palacio de Deportes",
  address: "Av. de la Costa, Gijón",
  latitude: 43.532,
  longitude: -5.661
}
```

Esto evita errores de mapa cuando el usuario cambia de destino.

### 3.2. Inicio de búsqueda

Cuando el usuario pulsa “Buscar aparcamiento”:

1. la app cambia su estado a `looking`;
2. guarda el destino seleccionado;
3. guarda la posición aproximada actual;
4. asigna una zona lógica, por ejemplo `room = gijon_centro` o una celda geográfica;
5. comienza a escuchar eventos relevantes cercanos.

### 3.3. Usuario aparca

Cuando el usuario pulsa “Aparqué”:

1. la app cambia a `parked`;
2. guarda la coordenada de aparcamiento;
3. puede crear un registro de plaza ocupada;
4. puede dejar de emitir cambios frecuentes de posición.

Esta coordenada tiene valor porque indica que en ese punto existe una plaza real donde alguien consiguió aparcar.

### 3.4. Usuario sale

Cuando el usuario pulsa “Salgo” o “Voy a salir”:

1. la app cambia a `leaving`;
2. publica la coordenada donde el coche está aparcado;
3. marca esa plaza como potencialmente libre;
4. notifica a usuarios cercanos que están en `looking`;
5. opcionalmente inicia una cuenta atrás de validez.

Este es el evento más importante de todo el sistema.

### 3.5. Búsqueda abandonada

Si después de cierto tiempo el usuario no encuentra plaza, o inició la búsqueda por error, debe existir un estado como `aborted` o `cancelled`.

Esto evita que la app interprete una búsqueda fallida como una plaza, una salida o una señal útil.

## 4. Modelo de datos sugerido en Convex

Una estructura sencilla podría separar estado de usuario, eventos y plazas.

### 4.1. `parkingStates`

Guarda el estado actual de cada usuario.

```js
parkingStates: {
  userId: string,
  alias: string,
  status: "idle" | "looking" | "parked" | "leaving" | "aborted",
  destinationId: string,
  destinationLabel: string,
  room: string,
  lat: number,
  lng: number,
  updatedAt: number,
  expiresAt: number
}
```

Índices recomendados:

```js
.index("by_userId", ["userId"])
.index("by_room_status", ["room", "status"])
.index("by_expiresAt", ["expiresAt"])
```

### 4.2. `parkingEvents`

Guarda eventos históricos o recientes.

```js
parkingEvents: {
  userId: string,
  type: "started_search" | "parked" | "leaving" | "aborted" | "expired",
  room: string,
  lat: number,
  lng: number,
  createdAt: number,
  expiresAt: number
}
```

Índices recomendados:

```js
.index("by_room_createdAt", ["room", "createdAt"])
.index("by_expiresAt", ["expiresAt"])
```

### 4.3. `parkingSpots`

Guarda puntos donde históricamente se ha aparcado o se ha liberado una plaza.

```js
parkingSpots: {
  room: string,
  lat: number,
  lng: number,
  status: "candidate" | "free_signal" | "occupied" | "stale",
  confidence: number,
  lastEventAt: number,
  expiresAt: number
}
```

No conviene guardar indefinidamente todas las posiciones GPS. Es mejor guardar eventos relevantes y borrar o caducar lo que ya no sirve.

## 5. Cómo encaja Convex

Convex encaja bien para esta utilidad porque ofrece:

- base de datos reactiva;
- funciones backend;
- suscripciones en tiempo real sin montar WebSockets manualmente;
- sincronización automática con React / React Native;
- mutaciones transaccionales para actualizar estados.

Según la documentación actual de Convex, las queries son reactivas: Convex rastrea las dependencias de una función de consulta y actualiza las suscripciones de los clientes cuando cambian los datos que afectan a esa query. También cachea resultados de queries y no cobra ancho de banda de base de datos por lecturas servidas desde caché.

Fuente: https://docs.convex.dev/realtime

## 6. Cuántos usuarios puede manejar

No hay un número único porque depende de tres factores:

1. frecuencia con la que cada usuario escribe su estado;
2. cuántos usuarios están mirando la misma zona;
3. si las queries están bien indexadas y limitadas.

Para tu caso inicial, con menos de 100 usuarios, Convex es suficiente si se diseña bien.

### 6.1. Estimación de llamadas por actualizaciones de posición

Supongamos 100 usuarios activos.

| Frecuencia de subida | Mutaciones por usuario/día | Mutaciones totales/día con 100 usuarios | Mutaciones/mes aprox. |
|---:|---:|---:|---:|
| Cada 10 min | 144 | 14.400 | 432.000 |
| Cada 5 min | 288 | 28.800 | 864.000 |
| Cada 1 min | 1.440 | 144.000 | 4.320.000 |
| Cada 10 s | 8.640 | 864.000 | 25.920.000 |
| Cada 5 s | 17.280 | 1.728.000 | 51.840.000 |

Conclusión práctica:

- **cada 10 minutos**: perfectamente razonable incluso en una fase gratuita o muy barata;
- **cada 1 minuto**: viable, pero ya empieza a consumir muchas llamadas si hay usuarios activos todo el día;
- **cada 5 o 10 segundos**: solo tiene sentido si de verdad necesitas seguimiento continuo, y Parking normalmente no lo necesita.

La página de precios de Convex indica, a fecha de este documento, que el plan Free/Starter incluye 1 millón de function calls al mes y el plan Professional incluye 25 millones. También lista límites incluidos de almacenamiento, I/O de base de datos y data egress. Fuente: https://www.convex.dev/pricing

### 6.2. Lecturas y suscripciones

Las escrituras no son el único coste. También importan las queries que están suscritas en los dispositivos.

Un diseño malo sería:

```js
// Malo: leer todos los estados de parking
ctx.db.query("parkingStates").collect();
```

Un diseño correcto sería:

```js
// Mejor: leer solo usuarios cercanos o de la misma room y estado relevante
ctx.db
  .query("parkingStates")
  .withIndex("by_room_status", q =>
    q.eq("room", room).eq("status", "leaving")
  )
  .take(50);
```

Convex recomienda usar índices, límites y paginación para evitar leer demasiados documentos en una transacción. Fuente: https://stack.convex.dev/queries-that-scale

### 6.3. Capacidad estimada por fases

| Fase | Usuarios registrados | Usuarios activos simultáneos | Convex recomendado | Comentario |
|---|---:|---:|---|---|
| Prototipo | 1-20 | 1-5 | Free | Suficiente. |
| Beta local | 20-100 | 5-30 | Free/Starter | Suficiente con updates cada 1-10 min. |
| Barrio o ciudad pequeña | 100-1.000 | 30-200 | Starter/Professional | Necesitas índices, rooms y TTL. |
| Ciudad grande | 1.000-10.000 | 200-2.000 | Professional/Business | Ya requiere diseño geoespacial serio. |
| Uso masivo | 10.000+ | 2.000+ | Business/Enterprise o arquitectura híbrida | Conviene separar tracking, eventos y analítica. |

Para Shopp Parking, en la fase actual, el límite no será Convex. El límite real será el diseño de producto: calidad de las señales, permisos de ubicación, privacidad, abuso, caducidad de datos y UX.

## 7. ¿Sirve de algo subir la posición de los coches en tiempo real?

Depende de qué entiendas por “tiempo real”.

### 7.1. Para Parking, el GPS continuo aporta poco

Subir la posición cada pocos segundos suele aportar poco porque:

- el usuario que busca aparcamiento no necesita que otros vean su trayectoria exacta;
- la plaza útil aparece cuando alguien **sale**, no cuando alguien se mueve;
- la posición GPS dentro de una calle puede tener errores de varios metros;
- consume batería;
- aumenta llamadas backend;
- aumenta riesgos de privacidad;
- puede saturar la UI con movimiento irrelevante.

### 7.2. Lo valioso no es la posición continua, sino el evento

Los eventos valiosos son:

- “estoy buscando en esta zona”;
- “he aparcado aquí”;
- “voy a salir de esta plaza”;
- “esta señal ya caducó”;
- “otro usuario confirmó que la plaza ya está ocupada”.

Por tanto, la app debería ser **event-driven**, no un sistema de tracking continuo.

## 8. Estrategia recomendada de actualización

### 8.1. Cuando el usuario está `idle`

No subir ubicación.

### 8.2. Cuando el usuario está `looking`

Actualizar cada 1-3 minutos si está en movimiento, o al cambiar significativamente de zona.

Regla práctica:

```txt
Actualizar si han pasado 60-180 segundos
O si el usuario se ha movido más de 50-100 metros
O si cambia de room / celda geográfica
```

### 8.3. Cuando el usuario está `parked`

No subir posición continuamente.

Guardar solo:

- coordenada de aparcamiento;
- hora;
- destino;
- estado actual.

### 8.4. Cuando el usuario está `leaving`

Publicar inmediatamente.

Después mantener el evento vivo durante poco tiempo:

```txt
TTL recomendado: 2-5 minutos
```

Si nadie confirma, el evento caduca.

### 8.5. Cuando el usuario está `aborted`

Enviar una sola mutación para cerrar la búsqueda.

No mostrarlo en el mapa como una plaza.

## 9. Diseño geográfico recomendado

Convex no es una base GIS como PostGIS. Para empezar, no necesitas PostGIS, pero sí debes evitar queries globales.

Una solución simple:

- dividir la ciudad en `rooms` o zonas;
- asociar cada destino a una zona;
- consultar solo la zona actual;
- limitar resultados a 25-50 eventos;
- usar `expiresAt` para limpiar datos viejos.

Ejemplo:

```js
room = "gijon_centro";
```

Más adelante puedes usar celdas tipo geohash:

```js
geoCell = "ezs42";
```

Y consultar la celda actual más las celdas vecinas.

## 10. Privacidad y seguridad

Parking maneja datos sensibles o semi-sensibles:

- ubicación actual;
- hábitos de movilidad;
- destino;
- posible matrícula;
- alias o teléfono si se añade;
- relación entre usuario y vehículo.

Recomendaciones:

- no publicar matrícula salvo que sea imprescindible;
- si se usa matrícula, tratarla como dato sensible;
- no mostrar trayectorias completas;
- usar TTL corto;
- no guardar histórico de ubicación salvo eventos agregados;
- permitir borrar datos del usuario;
- limitar radio de visibilidad;
- aplicar rate limiting lógico por usuario;
- bloquear spam de eventos `leaving` falsos;
- evitar que usuarios anónimos puedan inyectar señales masivas.

## 11. Reglas antiabuso

Parking puede sufrir abuso porque un usuario podría publicar plazas falsas.

Reglas recomendadas:

- máximo una plaza `leaving` activa por usuario;
- no permitir cambiar `leaving` repetidamente cada pocos segundos;
- exigir que el usuario haya estado antes en `parked` para poder pasar a `leaving`;
- caducar eventos automáticamente;
- registrar reputación básica;
- permitir confirmación por otros usuarios;
- reducir confianza si nadie confirma señales de un usuario;
- ocultar usuarios con comportamiento anómalo.

## 12. Recomendación técnica final

Para la fase actual de Shopp Parking:

1. Usa Convex.
2. No implementes tracking GPS continuo cada pocos segundos.
3. Implementa estados claros: `idle`, `looking`, `parked`, `leaving`, `aborted`.
4. Publica eventos relevantes, no trayectorias.
5. Actualiza `looking` cada 1-3 minutos o por distancia mínima.
6. Publica `leaving` inmediatamente.
7. Usa TTL corto para eventos de plazas libres.
8. Consulta por `room`, `status` y límite de resultados.
9. No hagas `.collect()` global sobre todos los usuarios.
10. Considera 100 usuarios como una escala perfectamente manejable.

## 13. Resumen ejecutivo

La utilidad Parking debe funcionar como una red colaborativa de señales de aparcamiento, no como un radar continuo de coches.

Convex sirve bien para esta fase porque te da backend, base de datos y actualizaciones reactivas sin tener que montar WebSockets propios. Para menos de 100 usuarios, la aplicación puede funcionar sin problemas si actualizas por eventos y consultas por zonas.

Subir la posición de los coches en “tiempo real” cada pocos segundos no aporta suficiente valor para justificar coste, batería y privacidad. Lo correcto es subir eventos importantes: buscar, aparcar, salir y abandonar búsqueda.

La señal más valiosa no es “dónde está el coche ahora”, sino “este usuario va a dejar libre una plaza aquí durante los próximos minutos”.

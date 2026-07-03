1. StoresHomeScreen.js

Es la pantalla de entrada del módulo de tiendas. Funciona como un menú principal con cards de navegación.

Tiene cuatro accesos:

Explorar tiendas
Tiendas favoritas
Tiendas cercanas
Información de tiendas

Cada card usa un componente interno MenuItem, que muestra icono, título, subtítulo y chevron. Al pulsar, navega a la pantalla correspondiente mediante navigation.navigate(...) .

El flujo es:

StoresHomeScreen
├─ StoresBrowseScreen
├─ StoresFavoritesScreen
├─ StoresNearbyScreen
└─ StoreInfoScreen

Problema importante: el botón “Información de tiendas” navega a ROUTES.STORE_INFO sin pasar storeId . Pero StoreInfoScreen espera recibir un storeId. Por tanto, si entras desde aquí, normalmente mostrará “Tienda no encontrada”.

2. StoresBrowseScreen.js

Es la pantalla más completa para explorar todas las tiendas.

Hace varias cosas:

Lee todas las tiendas desde useStores().
Lee la ubicación actual desde useLocation().
Calcula la distancia entre la ubicación del usuario y cada tienda si hay coordenadas disponibles.
Ordena las tiendas:
por distancia si hay ubicación;
por nombre si no hay ubicación.
Permite buscar por nombre, dirección o ciudad.
Permite marcar o desmarcar favoritos.
Permite abrir el detalle de una tienda.
También puede trabajar en modo selección para asociar una tienda a una lista de compra.

La parte clave es esta: si recibe mode === "select" y selectForListId, al pulsar una tienda navega de vuelta a la lista de compra con selectedStore. Si no está en modo selección, abre ROUTES.STORE_DETAIL con storeId .

Esta pantalla parece ser la candidata principal para sustituir a StoresScreen.js, porque está mejor estilizada y tiene más lógica.

3. StoresFavoritesScreen.js

Muestra solo las tiendas favoritas.

Usa:

const { favoriteStores, toggleFavoriteStore, isFavoriteStore } = useStores();

Por cada tienda favorita pinta una card con:

icono tienda
nombre
dirección
ciudad/distancia si existe
estrella
chevron

Al pulsar la card navega a ROUTES.STORE_DETAIL pasando storeId y, si existe, listId .

La estrella permite quitar la tienda de favoritos. Si no hay favoritas, muestra un estado vacío con el mensaje:

No tienes tiendas favoritas

Esta pantalla es útil como acceso rápido, pero ahora mismo no parece tener modo selección directo. Solo abre el detalle.

4. StoresNearbyScreen.js

Muestra tiendas ordenadas por cercanía.

Usa el hook:

useStoresWithDistance()

Ese hook devuelve:

sortedStores
loading
hasLocation

La pantalla contempla tres estados:

loading → Buscando tiendas cercanas…
sin ubicación → No se pudo obtener tu ubicación
con ubicación → lista de tiendas ordenadas por distancia

Cada card muestra:

icono ubicación
nombre
dirección
ciudad · a X m/km
estrella
chevron

Al pulsar una tienda abre ROUTES.STORE_DETAIL con el storeId .

Es una pantalla especializada. Tiene sentido mantenerla si quieres un acceso rápido a tiendas cercanas.

5. StoreSelectScreen.js

Esta pantalla sirve para seleccionar una tienda favorita y asociarla a una lista de compra.

Recibe:

selectForListId

desde los params de navegación. Luego usa:

updateListStore(selectForListId, store.id)

para guardar la tienda seleccionada en la lista, y después hace navigation.goBack() .

El flujo esperado es:

Lista de compra
→ Seleccionar tienda
→ elegir favorita
→ updateListStore(listId, store.id)
→ volver atrás

Si no hay favoritas, muestra un empty state y un botón “Explorar tiendas”.

Ojo: goToExploreStores navega a:

ROUTES.STORES_TAB → ROUTES.STORES

pasando:

{ mode: "select", selectForListId }

Pero StoresBrowseScreen usa ROUTES.STORES_BROWSE, mientras que aquí se usa ROUTES.STORES. Eso sugiere que tienes dos pantallas solapadas: StoresScreen.js y StoresBrowseScreen.js.

6. StoreDetailScreen.js

Es la pantalla de detalle completo de una tienda.

Recibe:

storeId

Busca la tienda con:

getStoreById(storeId)

y permite:

Mostrar el nombre de la tienda.
Marcar o desmarcar como favorita.
Mostrar la dirección.
Mostrar una previsualización de mapa con StoreMapPreview.
Mostrar la posición del usuario si useLocation() tiene datos.
Abrir Google Maps con coordenadas si existen.
Si no hay coordenadas, buscar la tienda en Google Maps por nombre, dirección y ciudad.

La lógica de apertura de mapas es robusta: primero intenta usar coordenadas válidas mediante getValidCoords(store). Si existen, abre Google Maps por lat/lng. Si no, construye una query textual con nombre, dirección y ciudad .

Esta pantalla es probablemente la pantalla de detalle principal que deberías conservar.

7. StoreInfoScreen.js

Es una pantalla de información muy simple.

Recibe:

storeId

busca la tienda con:

getStoreById(storeId)

y muestra:

nombre
dirección
ciudad
zipcode

Si no encuentra tienda, muestra “Tienda no encontrada” .

Problemas:

Importa Pressable, useNavigation y ROUTES, pero realmente no usa el botón de exploración.
Define handleExploreStores, pero nunca se llama.
Tiene estilos como emptyTitle, emptySubtitle, exploreButton, exploreText, pero no se usan.
Es menos completa que StoreDetailScreen.

Mi recomendación: esta pantalla sobra o debería fusionarse con StoreDetailScreen.

8. StoresMapScreen.js

Es una pantalla de mapa global.

Recibe por params:

stores
userLocation

Filtra las tiendas que tienen coordenadas válidas:

Number.isFinite(s.location?.lat)
Number.isFinite(s.location?.lng)

y genera un HTML con Leaflet dentro de un WebView. El mapa se centra en la ubicación del usuario si existe; si no, usa coordenadas por defecto:

43.5322, -5.6611

que parecen corresponder a Gijón/Oviedo-Asturias aproximadamente. Luego añade marcadores para la ubicación del usuario y para cada tienda válida .

Esta pantalla está bien si quieres una vista de mapa con muchas tiendas, pero requiere react-native-webview. Para Expo web puede darte problemas o no comportarse igual que en móvil.

9. StoresScreen.js

Parece una pantalla antigua o más básica de exploración de tiendas.

Hace esto:

Lee stores desde useStores().
Tiene un TextInput para buscar.
Filtra por nombre o dirección.
Renderiza cada tienda usando StoreCard.
Si recibe selectForListId, al pulsar tienda vuelve a ROUTES.SHOPPING_LIST con selectedStore.
Si no, abre ROUTES.STORE_DETAIL.

Es funcional, pero mucho más simple que StoresBrowseScreen.js .

Mi impresión: StoresScreen.js es una versión anterior de StoresBrowseScreen.js.

StoresHomeScreen
Pantalla menú del módulo de tiendas.

StoresBrowseScreen
Explorar todas las tiendas, buscar, ordenar por distancia, marcar favoritos, seleccionar tienda para lista.

StoresFavoritesScreen
Ver solo tiendas favoritas y acceder al detalle.

StoresNearbyScreen
Ver tiendas ordenadas por cercanía usando ubicación actual.

StoreSelectScreen
Elegir una tienda favorita para asociarla a una lista de compra.

StoreDetailScreen
Detalle completo de tienda: nombre, dirección, favorito, mapa, Google Maps.

StoreInfoScreen
Detalle muy simple de tienda. Parece redundante.

StoresMapScreen
Mapa global con varias tiendas usando WebView + Leaflet.

StoresScreen
Listado antiguo/básico de tiendas. Parece redundante frente a StoresBrowseScreen.

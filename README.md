# PokePau — Integración de feed comunitario

Esta versión consulta Moonani PokeList desde una función de servidor de Cloudflare Pages (`functions/api/sightings.js`) y muestra los resultados dentro de PokePau. No abre una web externa para consultar el feed.

## Alcance real de la fuente

El endpoint comunitario de Moonani recibe el parámetro `iv`. Los ejemplos públicos disponibles consultan `iv=100` para IV 100% y `iv=0` para IV 0%. Esta versión consulta ambos y combina los resultados. **No debe presentarse como un radar de todos los Pokémon salvajes del mundo.** No se pudo verificar un feed público universal de todos los spawns.

- Coordenadas y país se muestran cuando los entrega la fuente.
- IV se muestra únicamente cuando la fuente proporciona esos valores.
- “Shiny disponible” significa elegibilidad de la especie, no shiny garantizado para cada entrenador.
- El endpoint upstream no pudo probarse desde este entorno; la conexión debe verificarse después del despliegue.

## Desplegar en Cloudflare Pages

1. Sube el contenido de esta carpeta a un repositorio Git.
2. En Cloudflare Pages, crea un proyecto conectado a ese repositorio.
3. Configura el directorio de salida como `.` y deja la carpeta `functions/api/sightings.js` en la raíz del proyecto.
4. Despliega el proyecto.
5. Abre `https://TU-SITIO.pages.dev/api/sightings?start=0&length=100`.
   - Si devuelve JSON con `"ok":true`, la función y el proveedor respondieron.
   - Si devuelve HTTP 502, revisa el campo `detail`; el proveedor puede bloquear, limitar o cambiar su endpoint.
6. Abre la página principal y pulsa **Actualizar avistamientos**.

## Fuente

`https://moonani.com/PokeList/ajax.php?page=pokemon&action=load`

Este endpoint es comunitario/no oficial y puede cambiar o limitar el acceso. La web no almacena credenciales.

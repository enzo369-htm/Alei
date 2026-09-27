# Motor CMS: Neon + R2 (studio-starter v2)

Fecha: 2026-09-20
Estado: **histórico (log de decisiones).** Fases 1–4 hechas (`base-editorial`, `base-page`, `free-canvas`).

La guía viva es [`docs/README.md`](../README.md) + [`AGENTS.md`](../../AGENTS.md). Este spec explica *por qué*. No existen aún `docs/recipes/` ni `docs/add-section.md`.

## Propósito

`studio-starter` deja de ser una plantilla Next.js + Supabase y pasa a ser el **motor
vacío** que se clona para cada web de artista: login de admin, subida de imágenes a R2
con variantes, base Neon con migraciones, y un core de API que corre igual en local y en
Vercel.

El motor **no** trae secciones de ningún artista. Trae la infraestructura, más *recetas*
documentadas para las formas que se repiten (colección, página de texto) y un *módulo
opcional* (free-canvas).

El objetivo real es que otra IA, leyendo `AGENTS.md` y `docs/`, pueda construir un sitio
nuevo con secciones nuevas encima del motor sin re-inventar la arquitectura.

### Qué no se toca

- `Juan Tarraf` — sitio en producción, se queda exactamente como está. Es la referencia
  de dónde salió el motor, no un lugar a modificar.
- `studio-core` — no está bajo git y es la única copia de los módulos Supabase. Queda
  como legado, sin cambios.
- La versión Supabase de este starter quedó en el commit `37af3ef` y en la rama
  `supabase-legacy`.

## Decisiones tomadas y por qué

### Vite + React Router, no Next

Se evaluó migrar a Next por `next/image`. Se descartó:

- El SEO y los previews de link no son un requisito (confirmado con el usuario).
- La optimización de imágenes que se necesita se resuelve en el browser, gratis, y el
  80% del código ya existe en `Juan Tarraf/src/cms/downscaleImage.ts`.
- `next/image` en Vercel es medido: Hobby incluye 5.000 transformaciones/mes y está
  restringido a uso **no comercial**; sitios de clientes obligan a Pro (USD 20/mes) más
  USD 0,05 por cada 1.000 transformaciones.
- Migrar implicaba reescribir auth, adaptadores de API, ruteo de admin y el core de
  handlers para comprar una feature que el motor puede tener por su cuenta.

### El canvas es un módulo opcional, no un segundo starter

Dos starters paralelos se desincronizan. Ya pasó: `studio-core/free-canvas` y
`Juan Tarraf/src/canvas` divergieron (el segundo ganó `FreeCanvas.tsx`, `ficha`,
`fichaEn`, `heightInputId`).

El canvas es el candidato ideal a módulo porque **no habla con la base**: dibuja y avisa
`onChange`; el host decide si persiste. Va en `modules/free-canvas/`, apagado por
defecto, autocontenido (SQL + rutas + UI + README). Si el artista no lo usa, se borra la
carpeta.

Los bloques de **lienzo** y de **texto corto** van unificados en el mismo módulo, porque
así ya funciona el código: `section_canvases.kind` vale `'canvas'` o `'text'` y el admin
los trata como una sola lista ordenable.

### No se guardan los originales en R2

Se evaluó archivar el archivo intacto de cámara. Se descartó:

- Los originales ya viven en el Mac del usuario y en el disco del artista. R2 sería una
  tercera copia de algo ya respaldado dos veces.
- Obligaría a subida directa con URL firmada para saltar el límite de 4,5 MB de body de
  Vercel: una ruta más, manejo de claves más, y un modo de falla más.
- Para web, 2400–3000 px ya es el tope útil: un monitor 5K a pantalla completa necesita
  ~2560 px.

En su lugar la variante mayor es de **3000 px**, que deja margen para retina, y `media`
lleva una columna `variants` en JSON para que agregar un tamaño después sea una
migración y no un rediseño.

### Nada de Cloudflare pago

Sin Image Resizing ni Cloudflare Images. R2 se usa como bucket público plano. Si algún
día se activan las transformaciones, solo cambia el helper que arma las URLs; la app no
se entera.

## Arquitectura

### El problema que hay que no heredar

En `Juan Tarraf` la lógica de CMS está escrita **dos veces**: `server/handlers.ts`
(1398 líneas, dev local vía plugin de Vite) y los 11 archivos de `api/` (~2000 líneas,
producción en Vercel). Además `cookies()`, `hmacHex()` e `isAuthed()` están copiados a
mano en 8 archivos, y `api/copy/[slug].ts` hace `ALTER TABLE` en plena request con
try/catch de cuatro niveles para tapar columnas faltantes.

El motor tiene **un solo core** y dos adaptadores finos.

### Forma

```
server/
  core/
    env.ts             lectura de variables, hasDatabase(), hasR2()
    db.ts              cliente Neon
    r2.ts              cliente S3 + put + URL pública
    auth.ts            sesión HMAC firmada — ÚNICA implementación
    http.ts            helpers de JSON, envoltorio de errores
    router.ts          método + patrón de path → handler
    routes/
      auth.ts          POST /api/auth/login, /logout · GET /api/auth/me
      media.ts         POST /api/media — registra variantes
  dev-plugin.ts        middleware de Vite: req/res de Node → Request → core
api/
  index.ts             única función de Vercel: export default { fetch } → core
```

Los handlers se escriben contra `Request`/`Response` estándar. El plugin de dev traduce
de Node al estándar. Una sola implementación, dos entradas.

### Por qué una sola función y no un catch-all

El plan original era `api/[...path].ts`. **No sirve.** Las rutas catch-all con `[...]` son
una feature de Next; en un proyecto Vite los corchetes se tratan como un segmento simple
y el parámetro llega como `{"...path": "algo"}`. Lo confirma el equipo de Vercel en
[vercel/community#947](https://github.com/vercel/community/discussions/947). Hay rastro de
esto en Juan Tarraf: `api/copy/[slug].ts` tiene un fallback a query param justamente
porque el pathname no siempre llega como se espera.

La firma `export default { fetch }` sí está soportada oficialmente en el runtime Node
desde agosto de 2025, así que eso no es un problema.

Lo que sí es un problema es el conteo de funciones: **sin framework, cada archivo de
`api/` es una función de Vercel**, y Hobby corta en 12 por deploy (Pro no tiene límite).
Juan Tarraf tiene 11 archivos de API, o sea está a uno del techo de Hobby.

Por eso: **una sola función** en `api/index.ts`, con un rewrite que le pasa el path por
query param, que es comportamiento documentado y no depende de si Vercel preserva la URL
original:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index?__path=$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

El core lee `__path` de los search params, cae al pathname si no está, y rutea internamente.
Así el número de rutas del sitio no tiene relación con el número de funciones.

**Plan B si el rewrite no se comporta:** un archivo por ruta donde cada uno delega en dos
líneas al core (`export default { fetch: (req) => core(req) }`). Es exactamente el
enrutamiento que Juan Tarraf ya usa en producción, así que está probado; el costo es que
cuenta contra las 12 de Hobby.

**Cómo verificarlo:** `vercel dev` replica rewrites en local (ya se hizo sobre la
plantilla). **Eso no cierra el tema.** El rewrite hay que volver a comprobarlo el día
que se despliegue la **primera web real** clonada de este starter, contra el dominio
de producción. `npm run dev` no usa `vercel.json`. Checklist y plan B:
[`docs/first-deploy-rewrite.md`](../first-deploy-rewrite.md).

### Cliente

```
src/
  core/
    admin/
      AdminGate.tsx        comprueba sesión, muestra login o contenido
      AdminLogin.tsx       password, sin marca de cliente
      AdminShell.tsx       nav construido desde site.config.ts
      admin.css            estilos genéricos, sin nombres de artista
      useAdminViewport.ts
    api/
      client.ts            request<T>() con manejo de error
      auth.ts
      media.ts             subida con variantes
    images/
      prepareVariants.ts   decodifica una vez, emite N WebP
      Picture.tsx          <img srcset sizes loading width height>
    i18n/                  contexto ES/EN, opcional y borrable
  site.config.ts           nav del admin y registro de secciones
```

`site.config.ts` es el único archivo que la IA edita para registrar una sección nueva.

## Modelo de datos del motor

Solo dos tablas. Todo lo demás lo aporta la receta o el módulo.

`_migrations`

| columna | tipo |
|---|---|
| name | text primary key |
| applied_at | timestamptz default now() |

`media`

| columna | tipo | nota |
|---|---|---|
| id | uuid pk | |
| r2_key | text | clave de la variante mayor |
| url | text not null | URL de la variante mayor; los consumidores viejos siguen funcionando |
| width | int | ancho intrínseco de la mayor |
| height | int | alto intrínseco de la mayor |
| mime | text | |
| variants | jsonb not null default `'{}'` | ver forma abajo |
| created_at | timestamptz | |

Forma de `variants`:

```json
{
  "format": "webp",
  "widths": [
    { "w": 3000, "h": 2000, "key": "media/<id>/3000.webp", "url": "https://…" },
    { "w": 1400, "h": 933,  "key": "media/<id>/1400.webp", "url": "https://…" },
    { "w": 480,  "h": 320,  "key": "media/<id>/480.webp",  "url": "https://…" }
  ]
}
```

El runner de migraciones cambia respecto de Juan Tarraf: en vez de una lista de archivos
hardcodeada en `scripts/migrate.mjs`, lee `db/*.sql` en orden alfabético y anota lo
aplicado en `_migrations`. Agregar una tabla es agregar un `.sql`, sin tocar el script.

## Pipeline de imágenes

Medido en el Mac del usuario (Chrome 148, 10 núcleos, fuente de 24 MP), con dos pasadas
de calentamiento descartadas y mediana de 5 corridas:

| Configuración | Tiempo (mediana) | Peso total |
|---|---|---|
| Hoy en Juan Tarraf: 1 JPEG de 2400 | 1,79 s | 317 KB |
| 3 WebP de 480 / 1200 / 2400 | 2,43 s | 243 KB |
| **3 WebP de 480 / 1400 / 3000** (elegida) | **3,26 s** | **292 KB** |
| 3 JPEG de 480 / 1400 / 3000 (fallback) | ~3,5 s | 632 KB |

Las tres variantes WebP **pesan menos** que el único JPEG que se sube hoy, porque WebP a
3000 px sale 177 KB contra 317 KB del JPEG a 2400. Así que el costo es alrededor de
segundo y medio de CPU por imagen, y la subida en sí es más rápida porque viajan menos
bytes.

El calentamiento importa: sin descartar las primeras pasadas, las mediciones varían entre
180 ms y 3900 ms para la misma configuración. Cualquier medición futura tiene que
descartar las primeras corridas. El número del fallback JPEG quedó inestable incluso con
warm-up, por eso va como aproximado; es un camino que casi nunca se usa.

Los pesos salen de una imagen sintética, y una foto real pesa más. La proporción entre
configuraciones se mantiene.

Se eligió 3000 px sobre 2400 px a costa de 0,8 s: una imagen a ancho completo en un
MacBook retina de 1512 px pide unos 3024 px, y con 2400 se vería apenas blanda. Si en la
práctica la subida se siente lenta, bajar a 2400 es cambiar una constante.

### Diseño

`prepareVariants(file)` decodifica el archivo **una vez** con `createImageBitmap` y emite
tres WebP: **480 / 1400 / 3000 px** por el lado mayor. Nunca agranda: si la foto es de
900 px, emite 480 y 900.

Detecta soporte de WebP con `canvas.toDataURL('image/webp')` y cae a JPEG si falta. El
fallback sigue siendo usable.

`POST /api/media` recibe las variantes, las sube a R2 bajo `media/<id>/<w>.webp`, y
escribe una fila de `media` con `variants`, `width` y `height` llenos. Llenar las
dimensiones importa: en Juan Tarraf esas columnas existen pero `api/media.ts` nunca las
escribe, así que no se puede reservar el espacio y la página salta mientras cargan.

`<Picture>` emite `srcset` con las tres variantes, `sizes` según el contexto,
`loading="lazy"` por defecto con opción `eager` para el hero, y `width`/`height` para
evitar el salto de layout. Hoy no hay un solo `srcset` en Juan Tarraf.

Las subidas desde celular van a tardar más por CPU más débil, así que el admin necesita
indicador de progreso real, no un botón que parece colgado.

Los anchos viven en una constante. Cambiarlos después afecta solo a las subidas nuevas;
las imágenes viejas conservan sus variantes, y eso es aceptable.

### Costo

R2: USD 0,015 por GB-mes con 10 GB gratis permanentes, escrituras a USD 4,50 el millón
con 1 millón gratis, egress gratis.

Con 200 imágenes por sitio a ~0,5 MB son 100 MB por sitio. Veinte sitios son 2 GB, dentro
del tier gratis. A 20 GB serían 15 centavos por mes. Las escrituras pasan de 1 a 3 por
imagen: veinte sitios son 12.000 contra el millón gratis, el 1,2%.

## Recetas

Cada receta es SQL + rutas + pantalla de admin + vista pública, lista para copiar y
renombrar. Son plantillas, no abstracciones: se copian y se editan.

### Colección

Una lista de ítems ordenada a mano, cada uno con título, descripción, imagen de portada y
página de detalle. Es la forma de Exposiciones y Textos en Juan Tarraf, y se repite en
proyectos, series y prensa.

Tabla: `id`, `title`, `title_en`, `description`, `description_en`, `cover_media_id`,
`sort_order`, `created_at`. Rutas de lista, alta, edición, borrado y reordenamiento.
Pantalla de admin con lista arrastrable y editor. Vista pública de grilla de portadas más
página de detalle.

### Página de texto

Un cuerpo de texto largo más una imagen opcional, identificado por slug. Es la forma de
Bio. Sirve para statement, "acerca de", contacto.

Tabla `page_copy`: `slug` pk, `body`, `body_en`, `image_media_id`, `updated_at`. Una ruta,
una pantalla de admin.

### Módulo free-canvas (opcional)

Bloques ordenables que son **lienzo libre** o **texto corto**, en una sola lista.

```
modules/free-canvas/
  README.md          cómo cablearlo, paso a paso
  sql/001_canvas.sql section_canvases (kind: canvas|text) + placements
  api/canvas.ts      rutas del módulo
  ui/                CanvasEditor, CanvasViewer, layout, types, canvas.css
  ui/AdminCanvasSection.tsx
```

Se copia desde `Juan Tarraf/src/canvas/` más la parte de `AdminSectionCanvas.tsx` que es
genérica, sacando lo específico del artista (`ficha`, `portrait_scale`, compuertas del
hero).

## Guías

`AGENTS.md` en la raíz, que Cursor lee solo. Reglas duras:

- Una sola implementación de auth; prohibido copiar `isAuthed` a un archivo nuevo.
- Toda tabla entra por migración en `db/`; prohibido `ALTER TABLE` en una request.
- Toda imagen sube por `prepareVariants` y se muestra con `<Picture>`.
- Una sección nueva se registra en `site.config.ts`.
- Los handlers van en `server/core/routes/`, nunca duplicados en `api/`.

`README.md` con el arranque día 1: clonar, crear proyecto en Neon, crear bucket en R2,
llenar `.env`, correr migraciones, levantar.

`docs/architecture.md` explica el core único y los dos adaptadores, y por qué no se
duplica.

`docs/add-section.md` es el recorrido de punta a punta de agregar una sección eligiendo
receta.

`docs/recipes/` tiene las dos recetas en detalle.

## Variables de entorno

```
DATABASE_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Sin prefijo `VITE_`: ninguna de estas puede llegar al browser.

## Fases de implementación

El alcance es grande para una sola pasada, así que va en cuatro fases. Cada una deja el
repo en un estado que corre y se puede probar.

1. **Motor.** Limpiar los archivos de Next y Supabase, armar Vite + React Router, el core
   de API con sus dos adaptadores, auth, `db.ts`, migraciones y la tabla `media`. Al
   final: se entra al admin con password y no hay nada más que un admin vacío.
2. **Imágenes.** `prepareVariants`, `POST /api/media`, `<Picture>`, R2. Al final: se sube
   una foto desde el admin, quedan tres variantes en R2 y la fila en `media` con
   dimensiones y `variants` llenos.
3. **Recetas.** Colección y página de texto, cada una con su SQL, rutas, pantalla de admin
   y vista pública, usadas por una sección de ejemplo que después se borra.
4. **Módulo free-canvas y guías.** Portar el canvas con bloques de lienzo y texto, y
   escribir `AGENTS.md`, `README.md` y `docs/`.

La fase 1 arranca verificando el enrutamiento con `vercel dev` antes de construir encima,
y si el rewrite no se comporta se cae al plan B de un archivo por ruta.

## Fuera de alcance

El hero con compuertas navegables de Juan Tarraf, y toda sección concreta de artista
(Exposiciones, Textos, Bio, Contacto como tales), los campos `ficha` y `portrait_scale`,
y el kit de hotspots de contorno que vive en `sistema seleccion de objetos` y sigue en
Supabase.

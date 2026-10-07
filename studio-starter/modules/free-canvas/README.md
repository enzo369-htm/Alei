# free-canvas

Módulo de **lienzo libre** + **texto corto**. En el motor viene cableado como demo (`/canvas`), igual que Editorial y Bio. Si un cliente no lo usa, se sacan las rutas y el link; `rsync --exclude modules` **no** lo apaga.

No es una receta. No hay i18n, hero ni tabla `sections`. Cada pieza puede llevar título, ficha y Available/Sold. Un `scope` (texto tipo slug, p. ej. `demo` o `works`) agrupa los bloques de una pantalla.

## Qué hay

| Pieza | Dónde vive de verdad |
|---|---|
| SQL | `db/004_canvas.sql` (migrate lo corre). Copia de plantilla acá: `sql/001_canvas.sql` |
| API | `server/core/routes/canvas.ts` — **no** crees `api/canvas.ts` |
| Cliente | `src/core/api/canvas.ts` |
| UI | `src/core/modules/free-canvas/` |

Las rutas van al core porque Hobby cuenta un archivo de `api/` como una función. El motor ya tiene una.

## Cablear en un sitio

1. `npm run db:migrate` (aplica `004_canvas.sql`).
2. Demo del motor (ya cableado): público `/canvas`, admin `/admin/canvas`, scope `demo`.
3. En otro sitio: importá `AdminCanvas` y `CanvasPage` y pasá otro `scope`.
4. Registrá el link en `src/site.config.ts`.

```tsx
<AdminCanvas scope="demo" heading="Canvas" />
<CanvasPage scope="demo" />
```

## API

| Método | Path | Auth |
|---|---|---|
| GET | `/api/canvas/:scope` | público |
| POST | `/api/canvas/:scope` `{ kind: "canvas" \| "text" }` | admin |
| PUT | `/api/canvas/:scope` `{ blocks }` | admin |
| DELETE | `/api/canvas/:scope/:id` | admin |

PUT actualiza **solo los bloques listados** y reemplaza las piezas de **esos** ids. Un `{ blocks: [] }` no borra imágenes. Un id desconocido es 400.

Máximo 4 bloques de cada kind por scope (el conteo es de app; dos POST a la vez pueden pasar de 4).

## Fotos extra de una obra

La imagen del placement es la del lienzo. `canvas_piece_slides` (`db/008_piece_slides.sql`) guarda hasta 12 fotos que solo entran en el carrusel de la ficha, después de la foto del lienzo. En Works, al seleccionar la pintura, el admin las suma con «Agregar imagen». No se posicionan en el free canvas. Si el PUT no manda `slides`, las que ya están no se tocan. Un array vacío las borra.

## Qué no trae (a propósito)

- i18n
- CRUD de exposiciones
- FK a `sections`

Si el artista no usa lienzo: borrá las rutas `/canvas`, el link del admin, y (si nadie más las usa) las tablas `canvases` / `canvas_placements`.

# Receta `base-editorial`

Forma: **lista + ficha**. En Juan eso es Textos (y el índice de Exposiciones). No es Bio.

Al clonar, copiá estos archivos y **renombrá**. No dejes `editorial_items` si el sitio se llama “Series”.

## Qué trae

- Tabla: `title`, `excerpt` (bajada de la lista), `body` (texto al entrar), `cover_media_id`, `sort_order`.
- Lista pública: foto a la izquierda, título + bajada a la derecha, “Leer”.
- Ficha: título, portada, texto completo.
- Admin: alta, edición, borrar, subir/bajar, portada vía `prepareVariants`.

Sin inglés. Si el sitio es bilingüe, agregá `title_en` / `excerpt_en` / `body_en` en **esa** copia (`db/003_….sql`).

Sin canvas. Si al entrar tiene que abrir un lienzo, usá [`free-canvas`](../../modules/free-canvas/README.md).

## Archivos de la receta (en el motor, como ejemplo)

| Pieza | Dónde |
|---|---|
| SQL | `db/002_editorial.sql` |
| API | `server/core/routes/editorial.ts` + registro en `server/core/index.ts` |
| Cliente | `src/core/api/editorial.ts` |
| Admin | `src/core/recipes/base-editorial/AdminEditorial.tsx` + ruta en `AdminPage.tsx` |
| Público | `EditorialIndex.tsx`, `EditorialDetail.tsx`, `editorial.css` + rutas en `App.tsx` |
| Menú | `src/site.config.ts` → `{ to: '/admin/editorial', label: 'Editorial' }` |

## Cómo copiarla a un cliente (ej. Textos)

1. Copiá `db/002_editorial.sql` → `db/00N_textos.sql`. Renombrá `editorial_items` → `textos`.
2. Copiá `server/core/routes/editorial.ts` → `textos.ts`. Cambiá tabla, paths `/api/textos`. Registrá en `index.ts`.
3. Igual con `src/core/api/editorial.ts` y las pantallas. Rutas públicas `/textos` y `/textos/:id`.
4. Link en `site.config.ts`.
5. `npm run db:migrate` en **esa** Neon.
6. Campos extra (`year`, `venue`, …) van en el SQL de esa copia, no en el motor.

Si no querés el ejemplo `editorial` en el cliente, borralo (SQL, rutas, pantallas, link). El motor lo trae para probar la receta.

## CSS

`editorial.css` es genérico. El layout foto-izquierda / texto-derecha está ahí. Cambiá tokens o el grid en la copia del artista, no en el molde, si solo ese sitio lo pide.

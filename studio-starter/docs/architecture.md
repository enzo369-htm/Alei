# Arquitectura del motor

Una IA que sume una sección tiene que respetar esto. Si no, el próximo sitio hereda el lío de Juan Tarraf: handlers duplicados y `isAuthed` copiado.

## Piezas

```
Browser  →  /admin, /…          src/   (React Router)
         →  /api/…              ┐
Local Vite                      ├─ server/core  (una sola implementación)
Vercel  api/index.ts + rewrite  ┘
Neon                            db/*.sql + server/core/db.ts
R2                              server/core/r2.ts
```

| Capa | Carpeta | Qué hace |
|---|---|---|
| Config del sitio | `src/site.config.ts` | Nombre + links del admin. Lo único “de marca”. |
| Admin UI | `src/core/admin/` | Login, gate, shell. Sin secciones de artista. |
| Recetas | `src/core/recipes/` | `base-editorial`, `base-page`. |
| Canvas | `src/core/modules/free-canvas/` | Lienzo + texto. Kit: `modules/free-canvas/`. |
| Cliente API | `src/core/api/` | `request()`, login, media, editorial, pages, canvas. |
| Imágenes | `src/core/images/` | `prepareVariants`, `<Picture>`. |
| Core | `server/core/` | Auth, router, env, db, r2, rutas. |
| Adaptador local | `server/dev-plugin.ts` | Node req/res → `Request` → `core()`. |
| Adaptador Vercel | `api/index.ts` | **Único** archivo en `api/`. |
| Rewrites | `vercel.json` | `/api/*` → función; resto → SPA. |
| Schema | `db/*.sql` | Una migración = un archivo. Runner: `scripts/migrate.mjs`. |

## Cómo agregar una ruta de API

1. Handler en `server/core/routes/….ts` con `route('GET'|'POST'|…, '/api/…', …)`.
2. Sumarlo al array en `server/core/index.ts`.
3. Cliente en `src/core/api/` si el admin lo llama.

**No** crees `api/foo.ts`. Cada archivo ahí es una función de Vercel. Hobby corta en 12. El modelo es una.

Auth: `import { isAuthed } from '../auth.ts'`. Si no está autenticado, `401`. No copies HMAC ni cookies.

## Cómo agregar una sección

1. Si es lista + ficha: copiá [`recipes/base-editorial.md`](recipes/base-editorial.md) y renombrá.
2. Si es una sola pantalla (Bio, contacto): [`recipes/base-page.md`](recipes/base-page.md), otro slug.
3. Si no: SQL en `db/`, rutas en `server/core/`, pantalla, `site.config.ts`. Ver abajo.

Lienzo + texto corto: módulo [`free-canvas`](../modules/free-canvas/README.md). UI en `src/core/modules/free-canvas/`. Rutas en `server/core/routes/canvas.ts`.

### A mano (si no hay receta)

1. `db/00N_nombre.sql` — tablas nuevas. Comentarios `--` arriba están bien; el splitter ya no se los come.
2. `npm run db:migrate` en **esa** base.
3. Rutas de API como arriba. GET público si hace falta; escritura con `isAuthed`.
4. Pantalla en `src/core/admin/…`.
5. `<Route>` en `AdminPage.tsx`.
6. Link en `site.config.ts` → `adminLinks`.
7. Vista pública en `src/` y ruta en `App.tsx`.

Cuando existan más recetas, van en `docs/recipes/`.

## Imágenes

`prepareVariants` → `POST /api/media` → fila en `media` → `<Picture>`. Detalle: [`images.md`](images.md). El admin del motor tiene `/admin/media` (link en `site.config.ts`).

## Auth

Cookie `HttpOnly` + `SameSite=Lax`. Token `<exp>.<hmac>`. Firma solo con `ADMIN_SESSION_SECRET`. Password comparada en tiempo constante (`passwordsMatch`). Freno de intentos en memoria: best-effort, no sirve entre isolates de Vercel.

## Qué no heredar de Juan Tarraf

- `server/handlers.ts` + `api/*.ts` con la misma lógica dos veces.
- `ALTER TABLE` dentro de un request.
- `ADMIN_SESSION_SECRET` = password, o fallback `'tarraf'`.
- Catch-all `api/[...path].ts` (no existe fuera de Next).
- Prefijo `VITE_` en secretos.

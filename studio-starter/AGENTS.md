# AGENTS.md — studio-starter

Plantilla de motor CMS (Vite + React Router + Neon + R2). **No** es un sitio de cliente.

Antes de tocar código, leé [`docs/README.md`](docs/README.md).

## Resultado que tiene que quedar

Un motor **clonable**. Cada web nueva es una copia + cuentas propias + secciones registradas. Si un cambio solo sirve para un artista, no va en esta carpeta: va en la copia de ese artista.

## Primer deploy de una web clonada

Antes de darla por andando o de agregar secciones:

```bash
ORIGIN=https://EL-DOMINIO npm run smoke:api
```

Tiene que salir 0. `npm run dev` no usa `vercel.json`. Guía: [`docs/first-deploy-rewrite.md`](docs/first-deploy-rewrite.md).

## Reglas duras

- Auth: solo `server/core/auth.ts`. No copies `isAuthed`, HMAC ni cookies.
- Rutas: `server/core/routes/` + registro en `server/core/index.ts`. **Cero** archivos nuevos en `api/` (Hobby: 12 funciones; acá hay 1).
- Tablas: `db/*.sql` + `npm run db:migrate`. Prohibido `ALTER TABLE` en un request.
- Secretos: sin prefijo `VITE_`. `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` son los dos obligatorios y distintos.
- Al clonar: no copies `.vercel/`, `.env` ni `.git`. `git init` + remote nuevo. Día 1: [`docs/day-1.md`](docs/day-1.md).
- No hay sync automático motor → sitio ya customizado. Cambios del motor se portan a mano (diff). No copies `studio-core`.
- No toques `Juan Tarraf` ni otros sitios de `Desktop/webs` para “probar el motor”.
- No reintroduzcas Next ni Supabase. La rama `supabase-legacy` es archivo, no el presente.
- Recetas: [`base-editorial`](docs/recipes/base-editorial.md) (lista + ficha) y [`base-page`](docs/recipes/base-page.md) (una pantalla, tipo Bio). No inventes otra forma para esos casos.
- Lienzo + texto corto: módulo [`free-canvas`](modules/free-canvas/README.md). UI en `src/core/modules/free-canvas/`. Sin ficha, i18n ni `api/canvas.ts`.
- Imágenes: `prepareVariants` → `POST /api/media` → `<Picture>`. Guía: [`docs/images.md`](docs/images.md). No subas originales a R2 ni crees `api/media.ts`.

## Dónde va cada cambio

| Cambio | Dónde |
|---|---|
| Nombre del artista, nav del admin | `src/site.config.ts` |
| Pantalla de admin | `src/core/admin/` + ruta en `AdminPage.tsx` |
| Lienzo / texto corto | `src/core/modules/free-canvas/` + [`modules/free-canvas/README.md`](modules/free-canvas/README.md) |
| Página pública | `src/` + `App.tsx` |
| Endpoint | `server/core/routes/` + `server/core/index.ts` |
| Tabla | `db/00N_….sql` |
| Cómo se usa el motor | `docs/` |

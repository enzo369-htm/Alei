# Día 1 — de la plantilla a un sitio

Dos usos distintos. No los mezcles.

| Estás en… | Qué hacer |
|---|---|
| `Desktop/webs/studio-starter` | Desarrollar el **motor**. `npm run dev`. No es un cliente. |
| Una **copia** (`mi-artista`) | Sitio nuevo. Cuentas propias. Deploy propio. |

Juan Tarraf y cualquier web ya publicada **no** se usan como destino de `cp` ni se les pega este stack encima.

## 1. Copiar

Desde `Desktop/webs`:

```bash
rsync -a \
  --exclude node_modules --exclude .env --exclude .vercel --exclude dist \
  --exclude .git --exclude .DS_Store --exclude modules --exclude src/core/i18n \
  studio-starter/ "Nombre Artista/"
cd "Nombre Artista"
rm -rf modules src/core/i18n
git init
# remote NUEVO de este artista. Nunca `git push` al repo del motor.
npm install
cp .env.example .env
```

Si usás `cp -R`, borrá después `node_modules`, `.env`, `.vercel` y **`.git`**. Si copiás `.git`, un push puede escribir el cliente encima de la plantilla. Si copiás `.vercel`, queda enganchado al proyecto vacío del motor.

## 2. Cuentas (una por sitio)

- **Neon:** proyecto nuevo. Connection string **pooled** (host tipo `….pooler.neon.tech`) → `DATABASE_URL`. Login del admin **no** necesita Neon; sí lo necesita `db:migrate` y cualquier sección con tablas.
- **R2:** hace falta para `/admin/media`. Cuenta de Cloudflare reutilizable; **bucket nuevo** por sitio. Sin URL pública el motor no sube (503). Pasos:

  1. R2 → Create bucket (nombre de este artista).
  2. Settings del bucket → acceso público: custom domain **o** Public development URL (`https://pub-….r2.dev`).
  3. Manage R2 API Tokens → Create API token (Object Read & Write). Anotá Account ID, Access Key ID, Secret.
  4. En `.env`: las 4 keys del token/bucket + `R2_PUBLIC_BASE_URL` = esa URL pública, **sin** slash final.
  5. No uses `*.r2.cloudflarestorage.com` como pública: es el endpoint S3 privado. Sin `R2_PUBLIC_BASE_URL` `hasR2()` es false.
- **Vercel:** `vercel` **adentro de la copia**. Framework: **Vite**, no Next. Crea un proyecto nuevo. Hobby es solo no comercial; sitios de cliente van a Pro. Variables en Production **y** Preview.

No reutilices `DATABASE_URL` ni `ADMIN_PASSWORD` entre clientes.

## 3. `.env` de esa copia

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

- Ninguna con prefijo `VITE_`.
- `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` son **los dos** obligatorios y **distintos**. Secret: `openssl rand -hex 32`. Si son iguales, el login responde 503.
- Node: la plantilla se desarrolló con Node 24; 20+ debería alcanzar.
- Mismas keys en Vercel → Settings → Environment Variables (Production y Preview).

## 4. Migrar

```bash
npm run db:migrate
```

Crea `_migrations` y aplica `db/*.sql` en orden. Se puede correr dos veces **si** todo el SQL es idempotente (`IF NOT EXISTS`, etc.).

Hoy el motor crea `media`, `editorial_items` (`base-editorial`), `pages` (`base-page`) y `canvases` + `canvas_placements` (`free-canvas`). La copia **trae el demo** de Editorial, Bio y Canvas (como el motor). `rsync --exclude modules` solo omite el kit/README de `modules/`; no apaga el canvas. Si el artista no usa lienzo, borrá `/canvas`, el link del admin y, si nadie más las usa, esas dos tablas.

Las tablas de un artista se copian desde las recetas y se renombran.

Reglas al escribir SQL: una sentencia por `;\n` (no dos `CREATE` en la misma línea). DDL con `IF NOT EXISTS` o equivalente. Si migrate muere a mitad, **no** insertes `_migrations` a mano: mirá el catálogo en Neon, completá o revertí lo que quedó, y recién entonces re-corré.

## 5. Local

```bash
npm run dev
```

http://localhost:5173/admin — password del `.env` de **esa** copia.

Cambiá `src/site.config.ts` → `name` y el `<title>` de `index.html`. Si Juan Tarraf (u otro Vite) ya usa el 5173, levantá este con `npx vite --port 5199`.

## 6. Deploy

```bash
vercel
```

(o git remoto + Vercel conectado a **este** repo, no al de la plantilla).

**Antes de agregar secciones**, contra el dominio de ese deploy (`*.vercel.app` o el custom; no mezcles cookies):

```bash
ORIGIN=https://EL-DOMINIO-DEL-DEPLOY npm run smoke:api
```

Tiene que salir `smoke:api ok`. Si sale 1, el SPA se comió `/api` o la función no está. Parar. Guía: [`first-deploy-rewrite.md`](first-deploy-rewrite.md).

En las copias siguientes, el smoke solo hace falta si cambiaste `vercel.json` o `api/index.ts` en el motor.

## 7. Qué no copiar nunca entre sitios

`.env`, `.vercel/`, `node_modules/`, el proyecto Neon, el bucket R2, `ADMIN_PASSWORD`.

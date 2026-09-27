# Primer deploy real: comprobar el rewrite de `/api`

Este documento es **obligatorio** la primera vez que se implemente `studio-starter` en una web nueva (un sitio de cliente, no esta carpeta plantilla).

El motor usa **una sola función** de Vercel (`api/index.ts`) y un rewrite en `vercel.json`. `npm run dev` **no** usa ese rewrite: usa el plugin de Vite.

El **contrato** del rewrite está testeado: `apiPath()` y `core()` con URL ` /api/index?__path=auth/me` (el shape que manda Vercel) tienen que devolver JSON, no HTML. Eso corre en `npm test`.

Lo que **no** puede testear CI es el proyecto de Vercel de un cliente (preset Next por error, `api/index.ts` faltante, env vacía). Por eso, en el primer dominio real se corre `npm run smoke:api`. Si sale 1, **parar**. No es opcional.

## Qué está comprobado y qué no

| Entorno | Rewrite de `vercel.json` | Estado |
|---|---|---|
| `npm test` (`apiPath` + `core()` con `?__path=`) | El mismo shape que el rewrite. | Obligatorio. Si esto falla, el motor está roto. |
| `npm run dev` (Vite + `server/dev-plugin.ts`) | No aplica. El pathname llega entero (`/api/auth/me`). | Cubierto por los mismos tests de pathname. |
| `vercel dev` sobre esta plantilla | Sí aplica. | Útil; no reemplaza el smoke. |
| **Deploy de un sitio clonado** | Sí aplica. | `ORIGIN=https://… npm run smoke:api` tiene que salir 0. |

`vercel dev` no es suficiente: no es el mismo runtime que producción (build, env, dominio, cookies `Secure`). Por eso este chequeo se hace en la **primera web desplegada**, no en la carpeta plantilla.

## Por qué existe el rewrite

Sin Next.js, Vercel **no** soporta catch-all `api/[...path].ts`. Cada archivo en `api/` es una función. Hobby corta en 12 funciones por deploy.

Solución: una función (`api/index.ts`) + rewrite que pasa el path original en query:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index?__path=$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

El router lee `__path` primero (`server/core/router.ts` → `apiPath`). Si Vercel no manda `__path`, cae al pathname.

## Qué implica “comprobarlo en el primer deploy”

Significa: después del **primer** `vercel`/`git push` de un sitio clonado, **antes** de agregar secciones:

```bash
ORIGIN=https://EL-DOMINIO npm run smoke:api
```

Tiene que salir 0. El script pide `/api/auth/me` y `/api/no-existe` y exige JSON del core. Si el SPA se comió `/api`, sale 1.

Si se salta este paso y se construye encima, un rewrite roto se manifiesta como “el login no entra”, “sesión perdida” o “Not Found” en `/api/...`, y se pierde tiempo persiguiendo bugs de auth que no existen.

Una vez que **una** web real lo pasa, el mismo `vercel.json` + `api/index.ts` se considera bueno para las siguientes, salvo que se cambie el rewrite o el runtime.

## Checklist (producción, no localhost)

Usá el dominio del deploy (`https://….vercel.app` o el dominio del cliente). No `localhost`.

Sustituí `ORIGIN` por esa URL.

```bash
ORIGIN=https://EL-DOMINIO-DEL-DEPLOY npm run smoke:api
# Esperado: exit 0. FAIL = HTML o 404 de plataforma. Parar.

# Detalle a mano (si el smoke falla y querés ver headers):
curl -sD - "$ORIGIN/api/auth/me"
# Esperado: HTTP 200, content-type application/json, cuerpo {"ok":false}
#           header x-studio-adapter: vercel
# FALLO típico: text/html (el SPA se comió /api) o 404 de Vercel (la función no corre)

# 2. Login incorrecto
curl -s -w "\nHTTP %{http_code}\n" -X POST "$ORIGIN/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"password":"incorrecta"}'
# Esperado: {"error":"Contraseña incorrecta"}  HTTP 401

# 3. Login correcto + cookie
curl -s -c /tmp/studio-prod.txt -w "\nHTTP %{http_code}\n" -X POST "$ORIGIN/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"password":"LA_ADMIN_PASSWORD_DE_ESA_WEB"}'
# Esperado: {"ok":true}  HTTP 200  y Set-Cookie studio_admin

# 4. Sesión
curl -s -b /tmp/studio-prod.txt "$ORIGIN/api/auth/me"
# Esperado: {"ok":true}

# 5. Ruta API que no existe (tiene que responder el core, no Vercel)
curl -s -w "\nHTTP %{http_code}\n" "$ORIGIN/api/no-existe"
# Esperado: {"error":"No encontrado"}  HTTP 404

# 6. SPA: recargar una ruta del admin no puede 404
curl -s -o /dev/null -w "HTTP %{http_code} %{content_type}\n" "$ORIGIN/admin"
# Esperado: HTTP 200  text/html
```

También: abrir `/admin` en el browser, entrar con la password de **ese** proyecto, recargar. Si te saca al login, la cookie no está quedando (`Secure`, dominio, o rewrite que pierde `Set-Cookie`).

Variables que tienen que existir **en el proyecto de Vercel de esa web** (Settings → Environment Variables), no en la plantilla:

`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, y más adelante `DATABASE_URL` y las de R2.

## Si falla: qué significa cada síntoma

**`/api/auth/me` devuelve HTML**  
El rewrite del SPA (`/((?!api/).*)` → `/index.html`) se está comiendo `/api`. El orden en `vercel.json` importa: la regla de `/api` tiene que ir **antes**. No borres `api/index.ts`.

**`/api/auth/me` es 404 de Vercel** (página o JSON de plataforma, no `{"error":"No encontrado"}`)  
La función no se desplegó. Confirmá que `api/index.ts` está en el repo desplegado y que el framework no está configurado como Next (esta plantilla es Vite).

**`__path` no llega y todas las rutas dan 404 del core**  
Vercel no está sustituyendo `$1` o no preserva query en el rewrite. Plan B (abajo).

**Login 200 pero `/api/auth/me` sigue `ok:false`**  
Cookie. En producción `Secure` está activo. Tiene que ser HTTPS. No mezclar `vercel.app` y dominio custom en la misma sesión.

**Hobby: “No more than 12 Serverless Functions”**  
Alguien creó archivos extra en `api/`. Las rutas nuevas van en `server/core/`, no archivos nuevos en `api/`. Esta plantilla debe tener **una** función.

## Plan B (solo si el rewrite de producción no rutea)

Un archivo por ruta que delega al mismo core, igual que Juan Tarraf en producción:

Un archivo por path, igual que Juan Tarraf. El import sube **dos** niveles porque el archivo vive en `api/auth/`:

```ts
// api/auth/me.ts
import { core } from '../../server/core/index.ts'
export default { fetch: (request: Request) => core(request) }
```

Igual: `api/auth/login.ts`, `api/auth/logout.ts`. En `vercel.json` **sacá** `{ "source": "/api/(.*)", "destination": "/api/index?__path=$1" }`. Dejá el rewrite del SPA. Esto **sí** cuenta contra el límite de 12 en Hobby. Documentá en el commit por qué se activó el plan B.

## Qué no hay que hacer

- No enlazar **esta** carpeta plantilla como el proyecto de producción de un cliente. Al clonar (`cp -R studio-starter mi-cliente`), **no copies** `.vercel/`. Esa carpeta está en `.gitignore` a propósito. El sitio nuevo se linkea con `vercel` **dentro de la copia**.
- No uses `vercel dev` como prueba de la web del cliente. Usá el deploy.
- No agregues archivos en `api/` “por las dudas”. Rompe el modelo de una función y el límite de Hobby.
- Juan Tarraf no usa este rewrite. No lo “arregles” para que coincida.

## Dónde está el código

- `vercel.json` — los dos rewrites
- `api/index.ts` — única función
- `server/core/router.ts` — `apiPath()`
- `server/dev-plugin.ts` — solo local; no es producción

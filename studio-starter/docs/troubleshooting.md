# Troubleshooting

Si el síntoma es de `/api` en un **deploy**, empecá por [`first-deploy-rewrite.md`](first-deploy-rewrite.md). Esta página cubre el resto.

## Login

**503 “Falta configurar ADMIN_PASSWORD” o ADMIN_SESSION_SECRET**  
Falta la variable en `.env` (local) o en Vercel (deploy). Son dos valores distintos. El secret no puede ser la password.

**401 siempre, password correcta**  
Estás pegándole al `.env` de otra carpeta, o al admin de Juan (`5173`) en vez del starter. Confirmá el puerto y el `name` en el login.

**Entra y al recargar te saca**  
Cookie. En producción hace falta HTTPS (`Secure` se prende si `VERCEL_ENV` es `production` o `preview`). No mezcles `*.vercel.app` y dominio custom.

**429 “Demasiados intentos”**  
12 POSTs a login en 15 min desde la misma IP (en esa instancia). Esperá o reiniciá el proceso local. En Vercel el contador es por isolate: no es un candado global.

## API

**`/api/auth/me` es HTML**  
El SPA se comió `/api`. Orden en `vercel.json`: regla `/api` primero. Ver first-deploy-rewrite.

**404 de Vercel (no `{"error":"No encontrado"}`)**  
La función no existe en ese deploy. `api/index.ts` tiene que estar. El proyecto no puede estar seteado como Next.

**Local anda, producción no (o al revés)**  
Local usa el plugin de Vite; producción usa el rewrite. No son el mismo camino. Por eso el primer deploy se testea en el dominio real.

**Header `x-studio-adapter: vercel`**  
La request la sirvió `api/index.ts`. Si no está, no entró por la función única.

## Migraciones

**`relation "media" does not exist`**  
Versión vieja del runner se comía el `CREATE TABLE` por el comentario del SQL. Corré `npm test` (tiene que pasar `001_engine.sql no pierde CREATE TABLE`). Si la fila en `_migrations` quedó marcada sin tabla, borrala en Neon y volvé a `npm run db:migrate`.

**Migrate murió a mitad de un `002_….sql`**  
`_migrations` no se escribe hasta que el archivo termina. La primera sentencia puede haber creado la tabla. No re-corras a ciegas si el SQL no es `IF NOT EXISTS`: mirá Neon, completá o dropeá lo a medias.

**`Falta DATABASE_URL`**  
`.env` no está o no tiene la connection string pooled.

**Corrí migrate y no pasó nada**  
El archivo ya está en `_migrations`. Si el SQL estaba mal y se aplicó a medias, no re-corras a ciegas: mirá la tabla y el SQL.

## Deploy / Hobby

**“No more than 12 Serverless Functions”**  
Hay más de un archivo en `api/`. Sacá los extras. Las rutas van a `server/core/`.

**`vercel` linkeó el proyecto de la plantilla**  
Copiaste `.vercel/`. Borrá esa carpeta en la copia, `vercel link` de nuevo, proyecto **nuevo**.

## Imágenes / R2

**503 “Faltan variables de R2” o `R2_PUBLIC_BASE_URL`**  
Las 5 keys en `.env` y en Vercel. El bucket tiene que ser de lectura pública (custom domain o `pub-….r2.dev`). Sin `R2_PUBLIC_BASE_URL` no se sube: esa URL no puede ser `*.r2.cloudflarestorage.com`.

**413**  
El lote de variantes pasó ~4 MB. `prepareVariants` ya intenta bajar calidad; si sigue fallando, recortá la foto.

**La foto se ve pero salta el layout**  
Falta `width`/`height` en la fila o no usaste `<Picture>`.

**srcset no aparece**  
`variants` vacío: subida vieja o insert a mano. Volvé a subir por `/admin/media`.

**400 “Las dimensiones no coinciden con el archivo”**  
El browser mandó `meta.widths` distinto a los píxeles del archivo. No parchees el server para creer al browser.

**Borrar dice que el registro se fue pero R2 falló**  
La fila ya no está. Revisá el bucket: puede haber quedado un objeto huérfano. Reintentar el DELETE da 404.

Ver [`images.md`](images.md).

## Juan Tarraf

Este motor no se aplica sobre Juan. Si algo “se ve raro” en `localhost:5173` mientras el starter corre, son **dos Vite**. Juan suele estar en `5173`; el starter también si no cambiás el puerto. Levantá el starter con `npx vite --port 5199` si hace falta convivir.

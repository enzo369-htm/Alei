# Imágenes

Toda foto del sitio pasa por acá. No subas un JPEG crudo a R2 a mano ni uses `<img src={url}>` sin srcset si tenés un `MediaRecord`.

## Flujo

1. Browser: `prepareVariants` lee w/h de los headers (sin decodificar el JPEG entero), decodifica ya capado a 3000 px y emite 1–3 archivos. WebP si el browser puede; si no, JPEG. Nunca agranda.
2. `apiUploadMedia` manda multipart (`variant` + `meta`) a `POST /api/media`.
3. Servidor: sniff + **mide el archivo** (no confía en `meta.widths`). Sube a R2, inserta `media`. Si PUT o insert fallan, borra las keys. `DELETE /api/media/:id` saca la fila y los objetos.
4. Front: `<Picture media={row} sizes="…" />`.

Los anchos viven en `src/core/images/sizes.ts` → `VARIANT_TARGETS`. Cambiarlos solo afecta subidas nuevas.

No se guarda el original de cámara. 3000 px es el techo útil para web.

## Dónde está el código

| Pieza | Archivo |
|---|---|
| Tamaños | `src/core/images/sizes.ts` |
| Headers w/h | `src/core/images/readImageSize.ts` |
| Encode | `src/core/images/prepareVariants.ts` |
| `<Picture>` | `src/core/images/Picture.tsx` |
| Cliente | `src/core/api/media.ts` |
| Sniff | `server/core/sniff-image.ts` |
| R2 | `server/core/r2.ts` |
| Rutas | `server/core/routes/media.ts` |
| Admin | `/admin/media` (`AdminMedia.tsx`) |

## Cómo subir desde otra pantalla

```ts
import { prepareVariants } from '../images/prepareVariants.ts'
import { apiUploadMedia } from '../api/media.ts'
import { Picture } from '../images/Picture.tsx'

const prepared = await prepareVariants(file, onProgress)
const media = await apiUploadMedia(prepared, onUploadProgress)
// <Picture media={media} sizes="(max-width: 700px) 100vw, 1400px" />
```

`sizes` lo pone el host: grilla de portadas ≠ hero a pantalla completa.

## Requisitos

- `DATABASE_URL` y `npm run db:migrate` (`media` ya está en `001_engine.sql`).
- R2: las 5 variables de `.env.example`. Sin `R2_PUBLIC_BASE_URL` el POST responde 503: se podría subir el archivo y no verse.
- Login de admin. GET `/api/media/:id` es público; listar, subir y borrar, no.

## Límites

- Body total ~4 MB (Vercel). `prepareVariants` baja calidad si el lote se pasa.
- Vite local acepta hasta 6 MB y responde 413 si se pasa.
- Entrada: JPEG / PNG / WebP (MIME vacío también: se intenta decodificar). Salida: WebP o JPEG. PNG no se guarda como PNG.
- Decode tope 3000 px **desde el primer** `createImageBitmap` (headers → `capLongSide`). Fallback: decode + recorte si no se pudieron leer los headers.
- El server guarda el w/h del archivo. Si `meta.widths` miente (>2 px), 400.
- Borrar: `DELETE /api/media/:id` (admin). Primero la fila, después los objetos de R2.

## Progreso

En el celular el encode tarda más. `prepareVariants` avisa 1/N, 2/N. La subida usa XHR para % real. No dejes un botón “guardando…” sin barra.

## Qué no hacer

- No agregues `api/media.ts` en `api/`. La ruta ya está en el core.
- No subas el original “por las dudas”.
- No uses Cloudflare Image Resizing (plan pago). Si algún día se activa, solo cambia el helper de URLs.

import { readImageSize } from '../../../src/core/images/readImageSize.ts'
import { isAuthed } from '../auth.ts'
import { hasDatabase, sql } from '../db.ts'
import { fail, isUuid, json, notFound, unauthorized } from '../http.ts'
import { r2KeysOf } from '../media-keys.ts'
import { deleteFromR2, hasR2, uploadToR2 } from '../r2.ts'
import { route } from '../router.ts'
import { sniffImage } from '../sniff-image.ts'

const MAX_VARIANTS = 4
const MAX_LONG_SIDE = 3000
const MAX_FILE_BYTES = 2_500_000
const MAX_TOTAL_BYTES = 4_000_000
const DIM_SLACK = 2

type MediaRow = {
  id: string
  url: string
  width: number | null
  height: number | null
  mime: string | null
  variants: unknown
  created_at: string
}

function toRecord(row: MediaRow) {
  return {
    id: row.id,
    url: row.url,
    width: row.width,
    height: row.height,
    mime: row.mime,
    variants: row.variants ?? {},
    createdAt: row.created_at,
  }
}

export const mediaRoutes = [
  route('GET', '/api/media', async ({ request }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const db = sql()
    const rows = (await db`
      select id, url, width, height, mime, variants, created_at
      from media
      order by created_at desc
      limit 60
    `) as MediaRow[]
    return json({ items: rows.map(toRecord) })
  }),

  route('GET', '/api/media/:id', async ({ params }) => {
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const db = sql()
    const rows = (await db`
      select id, url, width, height, mime, variants, created_at
      from media
      where id = ${params.id}
    `) as MediaRow[]
    if (!rows[0]) return notFound()
    return json(toRecord(rows[0]))
  }),

  route('POST', '/api/media', async ({ request }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    if (!hasR2()) {
      return fail(503, 'Faltan variables de R2 (incluye R2_PUBLIC_BASE_URL)')
    }

    const form = await request.formData().catch(() => null)
    if (!form) return fail(400, 'Se espera multipart/form-data')

    const files = form.getAll('variant').filter((item): item is File => item instanceof File)
    const metaRaw = form.get('meta')
    let meta: { format?: string; widths?: { w?: unknown; h?: unknown }[] } = {}
    if (typeof metaRaw === 'string') {
      try {
        meta = JSON.parse(metaRaw) as typeof meta
      } catch {
        return fail(400, 'meta no es JSON')
      }
    }

    if (files.length < 1 || files.length > MAX_VARIANTS) {
      return fail(400, `Mandá entre 1 y ${MAX_VARIANTS} variantes`)
    }
    if (!meta.widths || meta.widths.length !== files.length) {
      return fail(400, 'meta.widths tiene que coincidir con las variantes')
    }

    const declared = meta.format === 'jpeg' ? 'jpeg' : meta.format === 'webp' ? 'webp' : null
    if (!declared) return fail(400, 'meta.format tiene que ser webp o jpeg')

    let total = 0
    const decoded: { body: Buffer; w: number; h: number; mime: string; ext: string }[] = []

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!
      const w = Number(meta.widths[i]?.w)
      const h = Number(meta.widths[i]?.h)
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
        return fail(400, 'Dimensiones inválidas')
      }
      if (Math.max(w, h) > MAX_LONG_SIDE) return fail(400, 'Variante demasiado grande')

      const body = Buffer.from(await file.arrayBuffer())
      total += body.length
      if (body.length > MAX_FILE_BYTES) return fail(413, 'Una variante pesa demasiado')
      const sniff = sniffImage(body)
      if (!sniff) return fail(400, 'Solo se aceptan JPEG o WebP')
      if (sniff.format !== declared) {
        return fail(400, `La variante no es ${declared}`)
      }
      const pixels = readImageSize(body)
      if (!pixels) return fail(400, 'No se pudieron leer las dimensiones del archivo')
      if (Math.max(pixels.w, pixels.h) > MAX_LONG_SIDE) {
        return fail(400, 'Variante demasiado grande')
      }
      if (Math.abs(pixels.w - w) > DIM_SLACK || Math.abs(pixels.h - h) > DIM_SLACK) {
        return fail(400, 'Las dimensiones no coinciden con el archivo')
      }

      decoded.push({
        body,
        w: pixels.w,
        h: pixels.h,
        mime: sniff.mime,
        ext: sniff.format === 'webp' ? 'webp' : 'jpg',
      })
    }

    if (total > MAX_TOTAL_BYTES) return fail(413, 'El lote de variantes pesa demasiado')

    decoded.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h))
    const id = crypto.randomUUID()
    const widths: { w: number; h: number; key: string; url: string }[] = []
    const uploaded: string[] = []

    try {
      for (const item of decoded) {
        const key = `media/${id}/${Math.max(item.w, item.h)}.${item.ext}`
        const url = await uploadToR2(key, item.body, item.mime)
        uploaded.push(key)
        widths.push({ w: item.w, h: item.h, key, url })
      }

      const largest = widths[0]!
      const variants = { format: declared, widths }
      const db = sql()
      const rows = (await db`
        insert into media (id, r2_key, url, width, height, mime, variants)
        values (
          ${id},
          ${largest.key},
          ${largest.url},
          ${largest.w},
          ${largest.h},
          ${decoded[0]!.mime},
          ${JSON.stringify(variants)}::jsonb
        )
        returning id, url, width, height, mime, variants, created_at
      `) as MediaRow[]

      return json(toRecord(rows[0]!))
    } catch {
      await Promise.allSettled(uploaded.map((key) => deleteFromR2(key)))
      return fail(500, 'No se pudo guardar la imagen')
    }
  }),

  route('DELETE', '/api/media/:id', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')

    const db = sql()
    const rows = (await db`
      delete from media
      where id = ${params.id}
      returning r2_key, variants
    `) as { r2_key: string | null; variants: unknown }[]
    if (!rows[0]) return notFound()

    if (hasR2()) {
      const keys = r2KeysOf(rows[0].r2_key, rows[0].variants)
      const deleted = await Promise.allSettled(keys.map((key) => deleteFromR2(key)))
      if (deleted.some((item) => item.status === 'rejected')) {
        return fail(500, 'Se borró el registro pero falló borrar un archivo en R2')
      }
    }
    return json({ ok: true })
  }),
]

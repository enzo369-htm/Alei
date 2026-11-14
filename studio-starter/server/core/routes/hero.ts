import type { MediaRecord } from '../../../src/core/images/types.ts'
import { isAuthed } from '../auth.ts'
import { hasDatabase, sql } from '../db.ts'
import { fail, isUuid, json, readJson, unauthorized } from '../http.ts'
import { liveHeroMode } from '../hero-live.ts'
import { deleteFromR2, hasR2, uploadToR2 } from '../r2.ts'
import { route } from '../router.ts'

const FIT_MAX_BYTES = 4_000_000
const FIT_SCALE_MIN = 20
const FIT_SCALE_MAX = 100
const FIT_SCALE_DEFAULT = 60

type SlideRow = {
  id: string
  sort_order: number
  media_id: string
  url: string
  width: number | null
  height: number | null
  mime: string | null
  variants: unknown
}

type FitRow = {
  mode: string
  scale: number
  media_id: string | null
  url: string | null
  width: number | null
  height: number | null
  mime: string | null
  variants: unknown
}

function mediaOf(row: SlideRow): MediaRecord {
  return {
    id: row.media_id,
    url: row.url,
    width: row.width,
    height: row.height,
    mime: row.mime,
    variants: (row.variants as MediaRecord['variants']) ?? {},
  }
}

function clampScale(value: unknown) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isInteger(n) || n < FIT_SCALE_MIN || n > FIT_SCALE_MAX) return FIT_SCALE_DEFAULT
  return n
}

function fitMedia(row: FitRow): MediaRecord | null {
  if (!row.media_id || !row.url) return null
  return {
    id: row.media_id,
    url: row.url,
    width: row.width,
    height: row.height,
    mime: row.mime,
    variants: (row.variants as MediaRecord['variants']) ?? {},
  }
}

function sniffFitFile(body: Buffer): { mime: string; ext: string } | null {
  if (body.length >= 6) {
    const head = body.subarray(0, 6).toString('ascii')
    if (head === 'GIF87a' || head === 'GIF89a') return { mime: 'image/gif', ext: 'gif' }
  }
  if (body.length >= 12 && body.subarray(4, 8).toString('ascii') === 'ftyp') {
    return { mime: 'video/mp4', ext: 'mp4' }
  }
  if (
    body.length >= 4 &&
    body[0] === 0x1a &&
    body[1] === 0x45 &&
    body[2] === 0xdf &&
    body[3] === 0xa3
  ) {
    return { mime: 'video/webm', ext: 'webm' }
  }
  return null
}

async function loadSlides() {
  const db = sql()
  return (await db`
    select
      h.id, h.sort_order, h.media_id,
      m.url, m.width, m.height, m.mime, m.variants
    from hero_slides h
    join media m on m.id = h.media_id
    order by h.sort_order asc, h.id asc
  `) as SlideRow[]
}

async function loadFitRow() {
  const db = sql()
  const rows = (await db`
    select
      f.mode, f.scale, f.media_id,
      m.url, m.width, m.height, m.mime, m.variants
    from hero_fit f
    left join media m on m.id = f.media_id
    where f.id = 1
  `) as FitRow[]
  return rows[0]
}

function fitOf(row: FitRow | undefined) {
  const media = row ? fitMedia(row) : null
  return {
    mode: liveHeroMode(row?.mode, Boolean(media)),
    scale: clampScale(row?.scale),
    media,
  }
}

async function ensureFitRow() {
  const db = sql()
  await db`
    insert into hero_fit (id, mode, scale)
    values (1, 'motion', ${FIT_SCALE_DEFAULT})
    on conflict (id) do nothing
  `
}

async function payload() {
  const [rows, fit] = await Promise.all([loadSlides(), loadFitRow()])
  return {
    slides: rows.map((row) => ({
      id: row.id,
      sortOrder: row.sort_order,
      media: mediaOf(row),
    })),
    fit: fitOf(fit),
  }
}

export const heroRoutes = [
  route('GET', '/api/hero', async () => {
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    return json(await payload())
  }),

  route('PUT', '/api/hero', async ({ request }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const body = await readJson<{ mediaIds?: unknown }>(request)
    const raw = body.mediaIds
    if (!Array.isArray(raw)) return fail(400, 'mediaIds inválido')
    const mediaIds = raw.filter((id): id is string => typeof id === 'string' && isUuid(id))
    if (mediaIds.length !== raw.length) return fail(400, 'mediaIds inválido')
    if (mediaIds.length > 12) return fail(400, 'Máximo 12 pinturas en el hero')

    const unique = [...new Set(mediaIds)]
    const db = sql()
    if (unique.length > 0) {
      const found = (await db`select id from media where id = any(${unique})`) as { id: string }[]
      if (found.length !== unique.length) return fail(400, 'Hay una imagen que ya no existe')
    }
    await db`delete from hero_slides`
    for (const [index, mediaId] of unique.entries()) {
      await db`
        insert into hero_slides (media_id, sort_order)
        values (${mediaId}, ${index})
      `
    }
    return json(await payload())
  }),

  route('PUT', '/api/hero/fit', async ({ request }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const body = await readJson<{ mode?: unknown; scale?: unknown; mediaId?: unknown }>(request)
    await ensureFitRow()

    let scale: number | undefined
    if (body.scale !== undefined) {
      const next = typeof body.scale === 'number' ? body.scale : Number(body.scale)
      if (!Number.isInteger(next) || next < FIT_SCALE_MIN || next > FIT_SCALE_MAX) {
        return fail(400, 'El tamaño va de 20 a 100')
      }
      scale = next
    }

    let mode: 'motion' | 'fit' | undefined
    if (body.mode !== undefined) {
      if (body.mode !== 'motion' && body.mode !== 'fit') return fail(400, 'Modo inválido')
      mode = body.mode
    }

    let mediaId: string | null | undefined
    if (body.mediaId !== undefined) {
      if (body.mediaId === null) {
        mediaId = null
      } else if (typeof body.mediaId === 'string' && isUuid(body.mediaId)) {
        const db = sql()
        const found = (await db`select id from media where id = ${body.mediaId}`) as { id: string }[]
        if (!found[0]) return fail(400, 'Ese archivo ya no existe')
        mediaId = body.mediaId
      } else {
        return fail(400, 'mediaId inválido')
      }
    }

    const db = sql()
    if (mediaId === null) {
      await db`update hero_fit set media_id = null, mode = 'motion' where id = 1`
    } else if (typeof mediaId === 'string') {
      await db`update hero_fit set media_id = ${mediaId}, mode = 'fit' where id = 1`
    } else if (mode) {
      if (mode === 'fit') {
        const row = await loadFitRow()
        if (!row?.media_id || !row.url) mode = 'motion'
      }
      await db`update hero_fit set mode = ${mode} where id = 1`
    }
    if (scale !== undefined) {
      await db`update hero_fit set scale = ${scale} where id = 1`
    }
    return json({ fit: fitOf(await loadFitRow()) })
  }),

  route('POST', '/api/hero/fit-file', async ({ request }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    if (!hasR2()) return fail(503, 'Faltan variables de R2 (incluye R2_PUBLIC_BASE_URL)')

    const form = await request.formData().catch(() => null)
    if (!form) return fail(400, 'Se espera multipart/form-data')
    const file = form.get('file')
    if (!(file instanceof File)) return fail(400, 'Falta el archivo')

    const body = Buffer.from(await file.arrayBuffer())
    if (body.length < 1) return fail(400, 'El archivo está vacío')
    if (body.length > FIT_MAX_BYTES) return fail(413, 'El archivo pesa demasiado (máximo 4 MB)')
    const sniffed = sniffFitFile(body)
    if (!sniffed) return fail(400, 'Para GIF o video solo se aceptan GIF, MP4 o WebM')

    const id = crypto.randomUUID()
    const key = `media/${id}/fit.${sniffed.ext}`
    try {
      const url = await uploadToR2(key, body, sniffed.mime)
      const db = sql()
      const rows = (await db`
        insert into media (id, r2_key, url, width, height, mime, variants)
        values (${id}, ${key}, ${url}, null, null, ${sniffed.mime}, ${JSON.stringify({})}::jsonb)
        returning id, url, width, height, mime, variants
      `) as {
        id: string
        url: string
        width: number | null
        height: number | null
        mime: string | null
        variants: unknown
      }[]
      const row = rows[0]
      if (!row) return fail(500, 'No se pudo guardar el archivo')
      const media: MediaRecord = {
        id: row.id,
        url: row.url,
        width: row.width,
        height: row.height,
        mime: row.mime,
        variants: (row.variants as MediaRecord['variants']) ?? {},
      }
      return json(media)
    } catch {
      await deleteFromR2(key).catch(() => undefined)
      return fail(500, 'No se pudo guardar el archivo')
    }
  }),
]

import type { MediaRecord } from '../../../src/core/images/types.ts'
import { isAuthed } from '../auth.ts'
import { hasDatabase, sql } from '../db.ts'
import { fail, isUuid, json, readJson, unauthorized } from '../http.ts'
import { route } from '../router.ts'

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

function payload(rows: SlideRow[]) {
  return {
    slides: rows.map((row) => ({
      id: row.id,
      sortOrder: row.sort_order,
      media: mediaOf(row),
    })),
  }
}

export const heroRoutes = [
  route('GET', '/api/hero', async () => {
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    return json(payload(await loadSlides()))
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
    return json(payload(await loadSlides()))
  }),
]

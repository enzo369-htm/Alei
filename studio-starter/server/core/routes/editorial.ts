import type { MediaRecord } from '../../../src/core/images/types.ts'
import { isAuthed } from '../auth.ts'
import { hasDatabase, sql } from '../db.ts'
import { asText, fail, isUuid, json, notFound, readJson, unauthorized } from '../http.ts'
import { route } from '../router.ts'

type ItemRow = {
  id: string
  title: string
  excerpt: string
  body: string
  cover_media_id: string | null
  sort_order: number
  created_at: string
  cover_url: string | null
  cover_width: number | null
  cover_height: number | null
  cover_mime: string | null
  cover_variants: unknown
}

function coverOf(row: ItemRow): MediaRecord | null {
  if (!row.cover_media_id || !row.cover_url) return null
  return {
    id: row.cover_media_id,
    url: row.cover_url,
    width: row.cover_width,
    height: row.cover_height,
    mime: row.cover_mime,
    variants: (row.cover_variants as MediaRecord['variants']) ?? {},
  }
}

function toRecord(row: ItemRow, withBody: boolean) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    ...(withBody ? { body: row.body } : {}),
    cover: coverOf(row),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

function selectSql(db: ReturnType<typeof sql>, whereId?: string) {
  if (whereId) {
    return db`
      select
        i.id, i.title, i.excerpt, i.body, i.cover_media_id, i.sort_order, i.created_at,
        m.url as cover_url, m.width as cover_width, m.height as cover_height,
        m.mime as cover_mime, m.variants as cover_variants
      from editorial_items i
      left join media m on m.id = i.cover_media_id
      where i.id = ${whereId}
    `
  }
  return db`
    select
      i.id, i.title, i.excerpt, i.body, i.cover_media_id, i.sort_order, i.created_at,
      m.url as cover_url, m.width as cover_width, m.height as cover_height,
      m.mime as cover_mime, m.variants as cover_variants
    from editorial_items i
    left join media m on m.id = i.cover_media_id
    order by i.sort_order, i.created_at desc
  `
}

function coverIdFrom(raw: unknown) {
  const value = asText(raw)
  if (!value) return null
  if (!isUuid(value)) return undefined
  return value
}

export const editorialRoutes = [
  route('GET', '/api/editorial', async () => {
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const rows = (await selectSql(sql())) as ItemRow[]
    return json({ items: rows.map((row) => toRecord(row, false)) })
  }),

  route('GET', '/api/editorial/:id', async ({ params }) => {
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const rows = (await selectSql(sql(), params.id)) as ItemRow[]
    if (!rows[0]) return notFound()
    return json(toRecord(rows[0], true))
  }),

  route('POST', '/api/editorial', async ({ request }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const body = await readJson<{
      title?: unknown
      excerpt?: unknown
      body?: unknown
      coverMediaId?: unknown
    }>(request)
    const title = asText(body.title)
    if (!title) return fail(400, 'El título es obligatorio')
    const coverMediaId = coverIdFrom(body.coverMediaId)
    if (coverMediaId === undefined) return fail(400, 'coverMediaId inválido')

    const db = sql()
    const inserted = (await db`
      insert into editorial_items (title, excerpt, body, cover_media_id, sort_order)
      values (
        ${title},
        ${asText(body.excerpt)},
        ${asText(body.body)},
        ${coverMediaId},
        (select coalesce(max(sort_order), -1) + 1 from editorial_items)
      )
      returning id
    `) as { id: string }[]
    if (!inserted[0]) return fail(500, 'No se pudo crear el ítem')
    const rows = (await selectSql(db, inserted[0].id)) as ItemRow[]
    return json(toRecord(rows[0]!, true))
  }),

  route('PUT', '/api/editorial/:id', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const body = await readJson<{
      title?: unknown
      excerpt?: unknown
      body?: unknown
      coverMediaId?: unknown
    }>(request)
    const title = asText(body.title)
    if (!title) return fail(400, 'El título es obligatorio')
    const coverMediaId = coverIdFrom(body.coverMediaId)
    if (coverMediaId === undefined) return fail(400, 'coverMediaId inválido')

    const db = sql()
    const updated = (await db`
      update editorial_items
      set
        title = ${title},
        excerpt = ${asText(body.excerpt)},
        body = ${asText(body.body)},
        cover_media_id = ${coverMediaId}
      where id = ${params.id}
      returning id
    `) as { id: string }[]
    if (!updated[0]) return notFound()
    const rows = (await selectSql(db, params.id)) as ItemRow[]
    return json(toRecord(rows[0]!, true))
  }),

  route('POST', '/api/editorial/:id/move', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const payload = await readJson<{ dir?: unknown }>(request)
    const dir = asText(payload.dir)
    if (dir !== 'up' && dir !== 'down') return fail(400, 'dir tiene que ser up o down')

    const db = sql()
    const list = (await db`
      select id, sort_order from editorial_items
      order by sort_order, created_at desc
    `) as { id: string; sort_order: number }[]
    const index = list.findIndex((row) => row.id === params.id)
    if (index < 0) return notFound()
    const swapWith = dir === 'up' ? index - 1 : index + 1
    const a = list[index]!
    const b = list[swapWith]
    if (!b) return json({ ok: true })

    await db`
      update editorial_items
      set sort_order = case
        when id = ${a.id} then ${b.sort_order}
        when id = ${b.id} then ${a.sort_order}
      end
      where id = ${a.id} or id = ${b.id}
    `
    return json({ ok: true })
  }),

  route('DELETE', '/api/editorial/:id', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    const db = sql()
    const rows = (await db`
      delete from editorial_items where id = ${params.id} returning id
    `) as { id: string }[]
    if (!rows[0]) return notFound()
    return json({ ok: true })
  }),
]

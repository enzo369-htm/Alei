import type { MediaRecord } from '../../../src/core/images/types.ts'
import { isCanvasScope } from '../canvas-scope.ts'
import { mediaIdsOf, parseCanvasPut, type ParsedBlock, type PieceAvailability } from '../canvas-put.ts'
import { isAuthed } from '../auth.ts'
import { hasDatabase, sql } from '../db.ts'
import { asText, fail, isUuid, json, notFound, readJson, unauthorized } from '../http.ts'
import { route } from '../router.ts'

const MAX_PER_KIND = 4
const KINDS = new Set(['canvas', 'text'])

type CanvasRow = {
  id: string
  scope: string
  kind: 'canvas' | 'text'
  title: string
  body: string
  sort_order: number
  height_ratio: number
  visible: boolean
}

type PlacementRow = {
  id: string
  canvas_id: string
  media_id: string
  x: number
  y: number
  width: number
  z_index: number
  title: string
  ficha: string
  availability: PieceAvailability
  url: string | null
  media_width: number | null
  media_height: number | null
  mime: string | null
  variants: unknown
}

export type CanvasPiece = {
  id: string
  mediaId: string
  src: string
  x: number
  y: number
  width: number
  z: number
  title: string
  ficha: string
  availability: PieceAvailability
  media: MediaRecord | null
}

export type CanvasBlock = {
  id: string
  kind: 'canvas' | 'text'
  title: string
  body: string
  sortOrder: number
  heightRatio: number
  visible: boolean
  pieces: CanvasPiece[]
}

function mediaOf(row: PlacementRow): MediaRecord | null {
  if (!row.media_id || !row.url) return null
  return {
    id: row.media_id,
    url: row.url,
    width: row.media_width,
    height: row.media_height,
    mime: row.mime,
    variants: (row.variants as MediaRecord['variants']) ?? {},
  }
}

function pieceOf(row: PlacementRow): CanvasPiece {
  const media = mediaOf(row)
  return {
    id: row.id,
    mediaId: row.media_id,
    src: media?.url ?? '',
    x: row.x,
    y: row.y,
    width: row.width,
    z: row.z_index,
    title: row.title ?? '',
    ficha: row.ficha ?? '',
    availability: row.availability === 'sold' ? 'sold' : 'available',
    media,
  }
}

function blockOf(row: CanvasRow, pieces: CanvasPiece[]): CanvasBlock {
  return {
    id: row.id,
    kind: row.kind === 'text' ? 'text' : 'canvas',
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    heightRatio: row.height_ratio,
    visible: row.visible !== false,
    pieces,
  }
}

function scopeOr400(raw: string | undefined) {
  const scope = asText(raw)
  if (!isCanvasScope(scope)) return null
  return scope
}

async function loadScope(scope: string) {
  const db = sql()
  const canvases = (await db`
    select id, scope, kind, title, body, sort_order, height_ratio, visible
    from canvases
    where scope = ${scope}
    order by sort_order, created_at
  `) as CanvasRow[]

  const placements = (await db`
    select
      p.id, p.canvas_id, p.media_id, p.x, p.y, p.width, p.z_index,
      p.title, p.ficha, p.availability,
      m.url, m.width as media_width, m.height as media_height,
      m.mime, m.variants
    from canvas_placements p
    join media m on m.id = p.media_id
    join canvases c on c.id = p.canvas_id
    where c.scope = ${scope}
    order by p.z_index, p.created_at
  `) as PlacementRow[]

  const byCanvas = new Map<string, CanvasPiece[]>()
  for (const row of placements) {
    const list = byCanvas.get(row.canvas_id) ?? []
    list.push(pieceOf(row))
    byCanvas.set(row.canvas_id, list)
  }

  return {
    scope,
    blocks: canvases.map((row) => blockOf(row, byCanvas.get(row.id) ?? [])),
  }
}

async function replacePlacements(db: ReturnType<typeof sql>, block: ParsedBlock) {
  const previous = (await db`
    select id from canvas_placements where canvas_id = ${block.id}
  `) as { id: string }[]

  const previousIds = new Set(previous.map((row) => row.id))
  const kept = new Set<string>()
  let z = 0
  for (const piece of block.pieces) {
    if (piece.id && previousIds.has(piece.id)) {
      await db`
        update canvas_placements
        set
          media_id = ${piece.mediaId},
          x = ${piece.x},
          y = ${piece.y},
          width = ${piece.width},
          z_index = ${z},
          title = ${piece.title},
          ficha = ${piece.ficha},
          availability = ${piece.availability}
        where id = ${piece.id} and canvas_id = ${block.id}
      `
      kept.add(piece.id)
    } else {
      await db`
        insert into canvas_placements (
          canvas_id, media_id, x, y, width, z_index, title, ficha, availability
        )
        values (
          ${block.id}, ${piece.mediaId}, ${piece.x}, ${piece.y}, ${piece.width}, ${z},
          ${piece.title}, ${piece.ficha}, ${piece.availability}
        )
      `
    }
    z += 1
  }

  for (const row of previous) {
    if (!kept.has(row.id)) await db`delete from canvas_placements where id = ${row.id}`
  }
}

export const canvasRoutes = [
  route('GET', '/api/canvas/:scope', async ({ params }) => {
    const scope = scopeOr400(params.scope)
    if (!scope) return fail(400, 'Scope inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')
    return json(await loadScope(scope))
  }),

  route('POST', '/api/canvas/:scope', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    const scope = scopeOr400(params.scope)
    if (!scope) return fail(400, 'Scope inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')

    const body = await readJson<{ kind?: unknown }>(request)
    const kind = asText(body.kind) || 'canvas'
    if (!KINDS.has(kind)) return fail(400, 'kind tiene que ser canvas o text')

    const db = sql()
    const counted = (await db`
      select count(*)::int as n from canvases
      where scope = ${scope} and kind = ${kind}
    `) as { n: number }[]
    if ((counted[0]?.n ?? 0) >= MAX_PER_KIND) {
      return fail(400, `Máximo ${MAX_PER_KIND} bloques de este tipo`)
    }

    const inserted = (await db`
      insert into canvases (scope, kind, sort_order)
      values (
        ${scope},
        ${kind},
        (select coalesce(max(sort_order), -1) + 1 from canvases where scope = ${scope})
      )
      returning id, scope, kind, title, body, sort_order, height_ratio, visible
    `) as CanvasRow[]
    if (!inserted[0]) return fail(500, 'No se pudo crear el bloque')
    return json({ block: blockOf(inserted[0], []) })
  }),

  route('PUT', '/api/canvas/:scope', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    const scope = scopeOr400(params.scope)
    if (!scope) return fail(400, 'Scope inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')

    const payload = await readJson<{ blocks?: unknown }>(request)
    const db = sql()
    const existing = (await db`
      select id from canvases where scope = ${scope}
    `) as { id: string }[]
    const known = new Set(existing.map((row) => row.id))
    const parsed = parseCanvasPut(payload.blocks, known)
    if (!parsed.ok) return fail(400, parsed.error)

    for (const mediaId of mediaIdsOf(parsed.blocks)) {
      const found = (await db`select id from media where id = ${mediaId}`) as { id: string }[]
      if (!found[0]) return fail(400, 'mediaId inválido')
    }

    let sortOrder = 0
    for (const block of parsed.blocks) {
      await db`
        update canvases
        set
          title = ${block.title},
          body = ${block.body},
          height_ratio = ${block.heightRatio},
          visible = ${block.visible},
          sort_order = ${sortOrder}
        where id = ${block.id} and scope = ${scope}
      `
      sortOrder += 1
    }

    for (const block of parsed.blocks) {
      await replacePlacements(db, block)
    }

    return json(await loadScope(scope))
  }),

  route('DELETE', '/api/canvas/:scope/:id', async ({ request, params }) => {
    if (!(await isAuthed(request))) return unauthorized()
    const scope = scopeOr400(params.scope)
    if (!scope) return fail(400, 'Scope inválido')
    if (!isUuid(params.id ?? '')) return fail(400, 'Id inválido')
    if (!hasDatabase()) return fail(503, 'Falta DATABASE_URL')

    const db = sql()
    const rows = (await db`
      delete from canvases
      where id = ${params.id} and scope = ${scope}
      returning id
    `) as { id: string }[]
    if (!rows[0]) return notFound()
    return json({ ok: true })
  }),
]

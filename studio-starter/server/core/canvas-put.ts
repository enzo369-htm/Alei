import { asText, isUuid } from './http.ts'

export const TITLE_MAX = 200
export const BODY_MAX = 6000

export type ParsedPiece = {
  mediaId: string
  x: number
  y: number
  width: number
}

export type ParsedBlock = {
  id: string
  title: string
  body: string
  heightRatio: number
  pieces: ParsedPiece[]
}

function clampNum(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function clip(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max)
}

/**
 * PUT actualiza solo los bloques listados y reemplaza piezas de esos ids.
 * Un array vacío no toca placements. Un id desconocido es error, no skip.
 */
export function parseCanvasPut(
  blocks: unknown,
  knownIds: Set<string>,
): { ok: true; blocks: ParsedBlock[] } | { ok: false; error: string } {
  if (!Array.isArray(blocks)) return { ok: false, error: 'blocks es obligatorio' }

  const parsed: ParsedBlock[] = []
  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'bloque inválido' }
    const block = raw as Record<string, unknown>
    const id = asText(block.id)
    if (!isUuid(id) || !knownIds.has(id)) return { ok: false, error: 'Id de bloque inválido' }
    const kind = asText(block.kind)
    if (kind && kind !== 'canvas' && kind !== 'text') return { ok: false, error: 'kind inválido' }

    const piecesRaw = block.pieces
    if (piecesRaw !== undefined && !Array.isArray(piecesRaw)) {
      return { ok: false, error: 'pieces inválido' }
    }

    const pieces: ParsedPiece[] = []
    for (const pieceRaw of piecesRaw ?? []) {
      if (!pieceRaw || typeof pieceRaw !== 'object') return { ok: false, error: 'pieza inválida' }
      const piece = pieceRaw as Record<string, unknown>
      const mediaId = asText(piece.mediaId)
      if (!isUuid(mediaId)) return { ok: false, error: 'mediaId inválido' }
      pieces.push({
        mediaId,
        x: clampNum(piece.x, 0, 95, 8),
        y: clampNum(piece.y, 0, 98, 8),
        width: clampNum(piece.width, 5, 90, 24),
      })
    }

    parsed.push({
      id,
      title: clip(asText(block.title), TITLE_MAX),
      body: clip(asText(block.body), BODY_MAX),
      heightRatio: clampNum(block.heightRatio, 0.6, 2.5, 1.2),
      pieces,
    })
  }

  return { ok: true, blocks: parsed }
}

export function mediaIdsOf(blocks: ParsedBlock[]) {
  return [...new Set(blocks.flatMap((block) => block.pieces.map((piece) => piece.mediaId)))]
}

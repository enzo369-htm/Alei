/** Imán del lienzo. Coordenadas en píxeles del tablero, origen arriba a la izquierda. */

export const SNAP_PX = 8
export const AXIS_DEADZONE_PX = 10

export type Rect = { x: number; y: number; w: number; h: number }

/** Horizontal traba Y. Vertical traba X. */
export type Axis = 'horizontal' | 'vertical'

export type GapMark = {
  axis: 'x' | 'y'
  start: number
  end: number
  cross: number
}

export type SnapGuides = {
  vertical: number | null
  horizontal: number | null
  gaps: GapMark[]
}

export function pickAxis(dx: number, dy: number): Axis | null {
  if (Math.hypot(dx, dy) < AXIS_DEADZONE_PX) return null
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
}

export function applyAxis(
  originX: number,
  originY: number,
  x: number,
  y: number,
  axis: Axis | null,
): { x: number; y: number } {
  if (axis === 'horizontal') return { x, y: originY }
  if (axis === 'vertical') return { x: originX, y }
  return { x, y }
}

type Candidate = {
  delta: number
  line: number | null
  rank: number
  gaps: Array<{ start: number; end: number }>
}

const RANK_CENTER = 0
const RANK_EDGE = 1
const RANK_SPACE = 2

function overlap(a0: number, a1: number, b0: number, b1: number) {
  return Math.min(a1, b1) - Math.max(a0, b0)
}

function choose(candidates: Candidate[], threshold: number): Candidate | null {
  let best: Candidate | null = null
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.delta)
    if (distance > threshold) continue
    if (!best) {
      best = candidate
      continue
    }
    const bestDistance = Math.abs(best.delta)
    const closer = distance < bestDistance - 0.5
    const tie = Math.abs(distance - bestDistance) <= 0.5 && candidate.rank < best.rank
    if (closer || tie) best = candidate
  }
  return best
}

type Span = { start: number; size: number; crossStart: number; crossEnd: number }

function snapAlong(raw: Span, others: Span[], board: number, threshold: number) {
  const rawEnd = raw.start + raw.size
  const rawMid = raw.start + raw.size / 2
  const candidates: Candidate[] = []

  const pushAlign = (target: number, edge: number, rank: number) => {
    candidates.push({ delta: target - edge, line: target, rank, gaps: [] })
  }

  if (board > 1) {
    pushAlign(0, raw.start, RANK_EDGE)
    pushAlign(board, rawEnd, RANK_EDGE)
    pushAlign(board / 2, rawMid, RANK_CENTER)
  }

  for (const other of others) {
    const otherEnd = other.start + other.size
    const otherMid = other.start + other.size / 2
    pushAlign(other.start, raw.start, RANK_EDGE)
    pushAlign(otherEnd, raw.start, RANK_EDGE)
    pushAlign(other.start, rawEnd, RANK_EDGE)
    pushAlign(otherEnd, rawEnd, RANK_EDGE)
    if (raw.size > 1 && other.size > 1) pushAlign(otherMid, rawMid, RANK_CENTER)
  }

  const band = others.filter(
    (other) =>
      overlap(
        raw.crossStart - threshold,
        raw.crossEnd + threshold,
        other.crossStart,
        other.crossEnd,
      ) > 0,
  )
  const gaps: number[] = []
  for (const item of others) {
    const next = others
      .filter(
        (other) =>
          other !== item &&
          other.start >= item.start + item.size &&
          overlap(item.crossStart, item.crossEnd, other.crossStart, other.crossEnd) > 0,
      )
      .sort((a, b) => a.start - b.start)[0]
    if (!next) continue
    const gapStart = item.start + item.size
    const gapEnd = next.start
    const gap = gapEnd - gapStart
    if (gap < 4) continue
    if (overlap(gapStart, gapEnd, raw.start, rawEnd) > 1) continue
    gaps.push(gap)
  }

  const left = band
    .filter((other) => other.start + other.size <= rawMid)
    .sort((a, b) => b.start + b.size - (a.start + a.size))[0]
  const right = band
    .filter((other) => other.start >= rawMid)
    .sort((a, b) => a.start - b.start)[0]

  if (left && right) {
    const leftEnd = left.start + left.size
    const span = right.start - leftEnd
    if (span > raw.size + 4) {
      const desired = leftEnd + (span - raw.size) / 2
      candidates.push({
        delta: desired - raw.start,
        line: null,
        rank: RANK_SPACE,
        gaps: [
          { start: leftEnd, end: desired },
          { start: desired + raw.size, end: right.start },
        ],
      })
    }
  }

  const uniqueGaps = [...new Set(gaps.map((gap) => Math.round(gap * 10) / 10))]
  if (left) {
    const leftEnd = left.start + left.size
    for (const gap of uniqueGaps) {
      const desired = leftEnd + gap
      candidates.push({
        delta: desired - raw.start,
        line: null,
        rank: RANK_SPACE,
        gaps: [{ start: leftEnd, end: desired }],
      })
    }
  }
  if (right) {
    for (const gap of uniqueGaps) {
      const desired = right.start - gap - raw.size
      candidates.push({
        delta: desired - raw.start,
        line: null,
        rank: RANK_SPACE,
        gaps: [{ start: desired + raw.size, end: right.start }],
      })
    }
  }

  const best = choose(candidates, threshold)
  if (!best) return { start: raw.start, line: null as number | null, gaps: [] as Array<{ start: number; end: number }> }
  return { start: raw.start + best.delta, line: best.line, gaps: best.gaps }
}

function spanX(rect: Rect): Span {
  return { start: rect.x, size: rect.w, crossStart: rect.y, crossEnd: rect.y + rect.h }
}

function spanY(rect: Rect): Span {
  return { start: rect.y, size: rect.h, crossStart: rect.x, crossEnd: rect.x + rect.w }
}

export function snapPosition(
  raw: Rect,
  others: Rect[],
  board: { w: number; h: number },
  threshold = SNAP_PX,
): { x: number; y: number; guides: SnapGuides } {
  const usable = others.filter((rect) => rect.w > 1 && rect.h > 1)
  const x = snapAlong(spanX(raw), usable.map(spanX), board.w, threshold)
  const y = snapAlong(spanY(raw), usable.map(spanY), board.h, threshold)
  const crossY = y.start + raw.h / 2
  const crossX = x.start + raw.w / 2

  return {
    x: x.start,
    y: y.start,
    guides: {
      vertical: x.line,
      horizontal: y.line,
      gaps: [
        ...x.gaps
          .filter((gap) => gap.end - gap.start > 1)
          .map((gap) => ({ axis: 'x' as const, start: gap.start, end: gap.end, cross: crossY })),
        ...y.gaps
          .filter((gap) => gap.end - gap.start > 1)
          .map((gap) => ({ axis: 'y' as const, start: gap.start, end: gap.end, cross: crossX })),
      ],
    },
  }
}

export function snapWidth(
  rawWidth: number,
  left: number,
  aspect: number,
  others: Rect[],
  boardW: number,
  threshold = SNAP_PX,
): { width: number; line: number | null } {
  const candidates: Candidate[] = []
  const push = (width: number, rank: number, line: number | null) => {
    if (!(width > 1)) return
    candidates.push({ delta: width - rawWidth, line, rank, gaps: [] })
  }

  for (const other of others) {
    if (other.w > 1) push(other.w, 0, null)
    if (aspect > 0.01 && other.h > 1) push(other.h / aspect, 1, null)
    if (other.w > 1) {
      push(other.x - left, 2, other.x)
      push(other.x + other.w - left, 2, other.x + other.w)
    }
  }
  if (boardW > 1) push(boardW - left, 2, boardW)

  const best = choose(candidates, threshold)
  if (!best) return { width: rawWidth, line: null }
  return { width: rawWidth + best.delta, line: best.line }
}

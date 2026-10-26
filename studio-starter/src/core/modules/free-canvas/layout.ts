import type { CanvasItem, CanvasItemInput } from './types.ts'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function hasPosition(item: CanvasItemInput): boolean {
  return item.x != null && item.y != null && item.width != null
}

/** Staggered defaults so new items are never stacked on top of each other. */
export function withDefaultPositions(items: CanvasItemInput[]): CanvasItem[] {
  return items.map((item, i) => {
    const extras = {
      ...(item.media ? { media: item.media } : {}),
      ...(item.label ? { label: item.label } : {}),
      ...(item.href ? { href: item.href } : {}),
      ...(item.availability ? { availability: item.availability } : {}),
    }

    if (hasPosition(item)) {
      return {
        id: item.id,
        imageUrl: item.imageUrl,
        x: item.x as number,
        y: item.y as number,
        width: item.width as number,
        ...extras,
      }
    }

    return {
      id: item.id,
      imageUrl: item.imageUrl,
      ...extras,
      ...defaultPositionForIndex(i),
    }
  })
}

/** Top to bottom, and left to right inside the same row of the canvas. */
export function readingOrder<T extends { x: number; y: number }>(items: T[]): T[] {
  const pending = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: T[][] = []
  for (const item of pending) {
    const row = rows.find((group) => Math.abs(group[0].y - item.y) < 12)
    if (row) row.push(item)
    else rows.push([item])
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x))
}

export function defaultPositionForIndex(index: number): Pick<CanvasItem, 'x' | 'y' | 'width'> {
  const col = index % 2
  const row = Math.floor(index / 2)
  return {
    width: 24,
    x: col === 0 ? 8 + (row % 2) * 6 : 58 - (row % 2) * 6,
    y: clamp(4 + (row % 6) * 14, 0, 85),
  }
}

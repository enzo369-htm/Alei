import type { MediaRecord } from '../../images/types.ts'

export type CanvasItem = {
  id: string
  imageUrl: string
  media?: MediaRecord | null
  x: number
  y: number
  width: number
  label?: string
  href?: string
  availability?: 'available' | 'sold'
}

export type CanvasItemInput = {
  id: string
  imageUrl: string
  media?: MediaRecord | null
  x?: number | null
  y?: number | null
  width?: number | null
  label?: string
  href?: string
  availability?: 'available' | 'sold'
}

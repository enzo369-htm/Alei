import type { MediaRecord } from '../images/types.ts'
import { request } from './client.ts'

export type PieceAvailability = 'available' | 'sold'

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

export type CanvasScopePayload = {
  scope: string
  blocks: CanvasBlock[]
}

export async function apiGetCanvas(scope: string) {
  return request<CanvasScopePayload>(`/api/canvas/${scope}`)
}

export async function apiAddCanvasBlock(scope: string, kind: 'canvas' | 'text') {
  return request<{ block: CanvasBlock }>(`/api/canvas/${scope}`, {
    method: 'POST',
    body: JSON.stringify({ kind }),
  })
}

export async function apiSaveCanvas(scope: string, blocks: CanvasBlock[]) {
  return request<CanvasScopePayload>(`/api/canvas/${scope}`, {
    method: 'PUT',
    body: JSON.stringify({ blocks }),
  })
}

export async function apiDeleteCanvasBlock(scope: string, id: string) {
  return request<{ ok: boolean }>(`/api/canvas/${scope}/${id}`, { method: 'DELETE' })
}

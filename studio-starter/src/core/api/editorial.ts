import type { MediaRecord } from '../images/types.ts'
import { request } from './client.ts'

export type EditorialItem = {
  id: string
  title: string
  excerpt: string
  body?: string
  cover: MediaRecord | null
  sortOrder: number
  createdAt: string
}

export type EditorialPayload = {
  title: string
  excerpt: string
  body: string
  coverMediaId: string | null
}

export async function apiListEditorial() {
  return request<{ items: EditorialItem[] }>('/api/editorial')
}

export async function apiGetEditorial(id: string) {
  return request<EditorialItem>(`/api/editorial/${id}`)
}

export async function apiCreateEditorial(payload: EditorialPayload) {
  return request<EditorialItem>('/api/editorial', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiSaveEditorial(id: string, payload: EditorialPayload) {
  return request<EditorialItem>(`/api/editorial/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function apiMoveEditorial(id: string, dir: 'up' | 'down') {
  return request<{ ok: boolean }>(`/api/editorial/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ dir }),
  })
}

export async function apiDeleteEditorial(id: string) {
  return request<{ ok: boolean }>(`/api/editorial/${id}`, { method: 'DELETE' })
}

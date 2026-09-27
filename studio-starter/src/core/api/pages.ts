import type { MediaRecord } from '../images/types.ts'
import { request } from './client.ts'

export type PageRecord = {
  slug: string
  title: string
  body: string
  image: MediaRecord | null
  updatedAt?: string
}

export async function apiGetPage(slug: string) {
  return request<PageRecord>(`/api/pages/${slug}`)
}

export async function apiSavePage(
  slug: string,
  payload: { title: string; body: string; imageMediaId: string | null },
) {
  return request<PageRecord>(`/api/pages/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

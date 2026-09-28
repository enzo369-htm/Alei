import type { MediaRecord } from '../images/types.ts'
import { request } from './client.ts'

export type HeroSlide = {
  id: string
  sortOrder: number
  media: MediaRecord
}

export async function apiGetHero() {
  return request<{ slides: HeroSlide[] }>('/api/hero')
}

export async function apiSaveHero(mediaIds: string[]) {
  return request<{ slides: HeroSlide[] }>('/api/hero', {
    method: 'PUT',
    body: JSON.stringify({ mediaIds }),
  })
}

import type { MediaRecord } from '../images/types.ts'
import { request } from './client.ts'

export type HeroSlide = {
  id: string
  sortOrder: number
  media: MediaRecord
}

export type HeroMode = 'motion' | 'fit'

export type HeroFitSettings = {
  mode: HeroMode
  scale: number
  media: MediaRecord | null
}

export type HeroPayload = {
  slides: HeroSlide[]
  fit: HeroFitSettings
}

export async function apiGetHero() {
  return request<HeroPayload>('/api/hero')
}

export async function apiSaveHero(mediaIds: string[]) {
  return request<HeroPayload>('/api/hero', {
    method: 'PUT',
    body: JSON.stringify({ mediaIds }),
  })
}

export async function apiSaveHeroFit(patch: {
  mode?: HeroMode
  scale?: number
  mediaId?: string | null
}) {
  return request<{ fit: HeroFitSettings }>('/api/hero/fit', {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

/** GIF, MP4 o WebM, sin pasar por las variantes de foto. */
export function apiUploadHeroFitFile(file: File): Promise<MediaRecord> {
  const body = new FormData()
  body.set('file', file)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/hero/fit-file')
    xhr.withCredentials = true
    xhr.responseType = 'text'
    xhr.onload = () => {
      let data: MediaRecord & { error?: string } = {} as MediaRecord
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText) as MediaRecord & { error?: string }
        } catch {
          reject(new Error(xhr.responseText.slice(0, 180) || `Error ${xhr.status}`))
          return
        }
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.error || `Error ${xhr.status}`))
        return
      }
      resolve(data)
    }
    xhr.onerror = () => reject(new Error('No se pudo subir'))
    xhr.send(body)
  })
}

import type { MediaRecord } from '../images/types.ts'
import type { PreparedVariants } from '../images/prepareVariants.ts'
import { request } from './client.ts'

export async function apiListMedia() {
  return request<{ items: MediaRecord[] }>('/api/media')
}

export async function apiGetMedia(id: string) {
  return request<MediaRecord>(`/api/media/${id}`)
}

export async function apiDeleteMedia(id: string) {
  return request<{ ok: boolean }>(`/api/media/${id}`, { method: 'DELETE' })
}

export type UploadProgress = {
  stage: 'upload'
  percent: number
}

/**
 * Sube las variantes ya preparadas. Usa XHR para poder mostrar % real;
 * fetch no expone el progreso del body.
 */
export function apiUploadMedia(
  prepared: PreparedVariants,
  onProgress?: (progress: UploadProgress) => void,
): Promise<MediaRecord> {
  const body = new FormData()
  body.set(
    'meta',
    JSON.stringify({
      format: prepared.format,
      widths: prepared.variants.map((item) => ({ w: item.w, h: item.h })),
    }),
  )
  for (const item of prepared.variants) {
    body.append('variant', item.file)
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media')
    xhr.withCredentials = true
    xhr.responseType = 'text'
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.({
        stage: 'upload',
        percent: Math.round((event.loaded / event.total) * 100),
      })
    }
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

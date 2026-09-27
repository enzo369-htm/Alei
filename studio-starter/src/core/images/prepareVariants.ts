import { displaySize, readImageSize } from './readImageSize.ts'
import {
  JPEG_QUALITY,
  UPLOAD_MAX_BYTES,
  VARIANT_TARGETS,
  WEBP_QUALITY,
  capLongSide,
  pickVariantSizes,
} from './sizes.ts'
import type { MediaFormat } from './types.ts'

export type PreparedVariant = {
  file: File
  w: number
  h: number
}

export type PreparedVariants = {
  format: MediaFormat
  variants: PreparedVariant[]
}

export type PrepareProgress = {
  stage: 'decode' | 'encode' | 'done'
  current: number
  total: number
}

function supportsWebp() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: string,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

const RASTER = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const DECODE_MAX = VARIANT_TARGETS[0]

async function decodeImage(file: File): Promise<ImageBitmap> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const header = readImageSize(bytes)
  const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' })
  const options: ImageBitmapOptions = { imageOrientation: 'from-image', resizeQuality: 'high' }

  if (header) {
    const shown = displaySize(header)
    const target = capLongSide(shown.w, shown.h, DECODE_MAX)
    try {
      return await createImageBitmap(blob, {
        ...options,
        resizeWidth: target.w,
        resizeHeight: target.h,
      })
    } catch {
      throw new Error('No se pudo leer la imagen')
    }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('No se pudo leer la imagen')
  }
  const target = capLongSide(bitmap.width, bitmap.height, DECODE_MAX)
  if (target.w === bitmap.width && target.h === bitmap.height) return bitmap
  try {
    const capped = await createImageBitmap(bitmap, {
      resizeWidth: target.w,
      resizeHeight: target.h,
      resizeQuality: 'high',
    })
    bitmap.close()
    return capped
  } catch {
    bitmap.close()
    throw new Error('No se pudo leer la imagen')
  }
}

/**
 * Lee headers, decodifica ya capado a 3000 px, emite variantes (WebP si se puede, si no JPEG).
 * MIME vacío se acepta: algunos celulares no mandan type. onProgress: encode 1/N, 2/N…
 */
export async function prepareVariants(
  file: File,
  onProgress?: (progress: PrepareProgress) => void,
): Promise<PreparedVariants> {
  if (file.type && !RASTER.has(file.type)) {
    throw new Error('Solo se aceptan JPEG, PNG o WebP')
  }

  onProgress?.({ stage: 'decode', current: 0, total: 1 })

  const bitmap = await decodeImage(file)

  const sizes = pickVariantSizes(bitmap.width, bitmap.height)
  if (sizes.length === 0) {
    bitmap.close()
    throw new Error('La imagen no tiene dimensiones válidas')
  }

  const useWebp = supportsWebp()
  const format: MediaFormat = useWebp ? 'webp' : 'jpeg'
  const mime = useWebp ? 'image/webp' : 'image/jpeg'
  const ext = useWebp ? 'webp' : 'jpg'
  let quality = useWebp ? WEBP_QUALITY : JPEG_QUALITY

  const encodeAll = async (q: number) => {
    const variants: PreparedVariant[] = []
    for (let i = 0; i < sizes.length; i += 1) {
      const size = sizes[i]!
      onProgress?.({ stage: 'encode', current: i + 1, total: sizes.length })
      const blob = await encode(bitmap, size.w, size.h, mime, q)
      if (!blob) throw new Error('No se pudo reencodar la imagen')
      variants.push({
        file: new File([blob], `v-${size.w}.${ext}`, { type: mime }),
        w: size.w,
        h: size.h,
      })
    }
    return variants
  }

  try {
    let variants = await encodeAll(quality)
    let total = variants.reduce((sum, item) => sum + item.file.size, 0)
    while (total > UPLOAD_MAX_BYTES && quality > 0.62) {
      quality -= 0.08
      variants = await encodeAll(quality)
      total = variants.reduce((sum, item) => sum + item.file.size, 0)
    }
    if (total > UPLOAD_MAX_BYTES) {
      throw new Error('La imagen sigue pesando demasiado. Probá un JPEG más liviano.')
    }
    onProgress?.({ stage: 'done', current: sizes.length, total: sizes.length })
    return { format, variants }
  } finally {
    bitmap.close()
  }
}

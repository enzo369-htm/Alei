/** Techo de un clip de ficha. Un archivo más grande no pasa por la subida. */
export const VIDEO_MAX_BYTES = 3_500_000

/** Duración máxima, en segundos. */
export const VIDEO_MAX_SECONDS = 8

/** Lado mayor. 1920 es 1080p horizontal o vertical. */
export const VIDEO_MAX_LONG_SIDE = 1920

/** Texto del admin. Tiene que coincidir con los topes de arriba. */
export const VIDEO_LIMITS_COPY =
  'Hasta 8 segundos, 1080p, sin audio, máximo 3,5 MB. MP4 con H.264 o GIF.'

const DURATION_SLACK = 0.05

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts'])

export type VideoInfo = {
  width: number
  height: number
  duration: number
}

export type VideoInspect =
  | { ok: true; info: VideoInfo }
  | { ok: false; error: string }

export type ClipInspect =
  | { ok: true; format: 'mp4' | 'gif'; info: VideoInfo }
  | { ok: false; error: string }

export function inspectMp4(bytes: Uint8Array): VideoInspect {
  if (bytes.byteLength > VIDEO_MAX_BYTES) {
    return { ok: false, error: 'El video pesa más de 3,5 MB' }
  }
  if (bytes.byteLength < 8) return { ok: false, error: 'Solo se acepta MP4 o GIF' }

  let duration: number | null = null
  let width = 0
  let height = 0
  let hasVideo = false
  let hasAudio = false
  let avc = false
  let sawFtyp = false

  const walk = (start: number, end: number) => {
    let offset = start
    while (offset + 8 <= end) {
      const size32 = readU32(bytes, offset)
      const type = ascii(bytes, offset + 4, 4)
      let header = 8
      let size = size32
      if (size32 === 1) {
        if (offset + 16 > end) return
        size = readU64(bytes, offset + 8)
        header = 16
      } else if (size32 === 0) {
        size = end - offset
      }
      if (!Number.isFinite(size) || size < header || offset + size > end) return
      const payload = offset + header
      const boxEnd = offset + size
      if (type === 'ftyp') sawFtyp = true
      if (type === 'mvhd') {
        const parsed = readMvhd(bytes, payload, boxEnd)
        if (parsed != null) duration = parsed
      }
      if (type === 'tkhd') {
        const dim = readTkhd(bytes, payload, boxEnd)
        if (dim && Math.max(dim.width, dim.height) >= Math.max(width, height)) {
          width = dim.width
          height = dim.height
        }
      }
      if (type === 'hdlr') {
        const handler = readHandler(bytes, payload, boxEnd)
        if (handler === 'vide') hasVideo = true
        if (handler === 'soun') hasAudio = true
      }
      if (type === 'stsd') {
        const visual = readAvcSample(bytes, payload, boxEnd)
        if (visual) {
          avc = true
          if (Math.max(width, height) < 1 && visual.width > 0 && visual.height > 0) {
            width = visual.width
            height = visual.height
          }
        }
      }
      if (CONTAINERS.has(type)) walk(payload, boxEnd)
      offset = boxEnd
    }
  }

  walk(0, bytes.byteLength)

  if (!sawFtyp) return { ok: false, error: 'Solo se acepta MP4 o GIF' }
  if (hasAudio) return { ok: false, error: 'El video no puede tener audio' }
  if (!hasVideo || !avc) return { ok: false, error: 'Tiene que ser MP4 con H.264' }
  if (duration == null || duration <= 0) return { ok: false, error: 'No se pudo leer la duración' }
  if (duration > VIDEO_MAX_SECONDS + DURATION_SLACK) {
    return { ok: false, error: 'El video dura más de 8 segundos' }
  }
  if (width < 1 || height < 1) return { ok: false, error: 'No se pudieron leer las dimensiones' }
  if (Math.max(width, height) > VIDEO_MAX_LONG_SIDE) {
    return { ok: false, error: 'El video pasa de 1080p' }
  }
  return { ok: true, info: { width, height, duration } }
}

function readU32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset]! * 0x1000000 +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  )
}

function readU64(bytes: Uint8Array, offset: number) {
  return readU32(bytes, offset) * 0x100000000 + readU32(bytes, offset + 4)
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  let out = ''
  for (let index = 0; index < length; index += 1) {
    out += String.fromCharCode(bytes[offset + index] ?? 0)
  }
  return out
}

function readMvhd(bytes: Uint8Array, payload: number, end: number) {
  const version = bytes[payload]
  if (version === 0) {
    if (payload + 20 > end) return null
    const timescale = readU32(bytes, payload + 12)
    if (!timescale) return null
    return readU32(bytes, payload + 16) / timescale
  }
  if (version === 1) {
    if (payload + 32 > end) return null
    const timescale = readU32(bytes, payload + 20)
    if (!timescale) return null
    return readU64(bytes, payload + 24) / timescale
  }
  return null
}

function readTkhd(bytes: Uint8Array, payload: number, end: number) {
  if (end - payload < 8) return null
  return {
    width: Math.round(readU32(bytes, end - 8) / 65536),
    height: Math.round(readU32(bytes, end - 4) / 65536),
  }
}

function readHandler(bytes: Uint8Array, payload: number, end: number) {
  if (payload + 12 > end) return null
  return ascii(bytes, payload + 8, 4)
}

function readAvcSample(bytes: Uint8Array, payload: number, end: number) {
  if (payload + 8 > end) return null
  const count = readU32(bytes, payload + 4)
  let offset = payload + 8
  for (let index = 0; index < count && offset + 8 <= end; index += 1) {
    const size = readU32(bytes, offset)
    const format = ascii(bytes, offset + 4, 4)
    if (format === 'avc1' || format === 'avc3') {
      const width = offset + 36 <= end ? (bytes[offset + 32]! << 8) + bytes[offset + 33]! : 0
      const height = offset + 36 <= end ? (bytes[offset + 34]! << 8) + bytes[offset + 35]! : 0
      return { width, height }
    }
    if (size < 8) return null
    offset += size
  }
  return null
}

/** MP4 H.264 o GIF animado, con los mismos topes. */
export function inspectClip(bytes: Uint8Array): ClipInspect {
  if (bytes.byteLength > VIDEO_MAX_BYTES) {
    return { ok: false, error: 'El video pesa más de 3,5 MB' }
  }
  if (isGif(bytes)) {
    const parsed = inspectGif(bytes)
    return parsed.ok ? { ok: true, format: 'gif', info: parsed.info } : parsed
  }
  const parsed = inspectMp4(bytes)
  return parsed.ok ? { ok: true, format: 'mp4', info: parsed.info } : parsed
}

function isGif(bytes: Uint8Array) {
  const mark = ascii(bytes, 0, 6)
  return mark === 'GIF87a' || mark === 'GIF89a'
}

function inspectGif(bytes: Uint8Array): VideoInspect {
  if (bytes.byteLength < 13 || !isGif(bytes)) return { ok: false, error: 'Solo se acepta MP4 o GIF' }
  const width = readU16(bytes, 6)
  const height = readU16(bytes, 8)
  let offset = 13
  if (bytes[10]! & 0x80) offset += 3 * (2 << (bytes[10]! & 7))

  let durationCs = 0
  let frames = 0
  let pendingDelay: number | null = null

  while (offset < bytes.byteLength) {
    const marker = bytes[offset]
    if (marker === 0x3b) break
    if (marker === 0x21) {
      const label = bytes[offset + 1]
      offset += 2
      if (label === 0xf9 && offset + 4 < bytes.byteLength && bytes[offset]! >= 4) {
        pendingDelay = bytes[offset + 2]! + (bytes[offset + 3]! << 8)
      }
      offset = skipSubBlocks(bytes, offset)
      continue
    }
    if (marker === 0x2c) {
      frames += 1
      durationCs += pendingDelay == null || pendingDelay === 0 ? 10 : pendingDelay
      pendingDelay = null
      if (offset + 10 > bytes.byteLength) break
      const packed = bytes[offset + 9]!
      offset += 10
      if (packed & 0x80) offset += 3 * (2 << (packed & 7))
      offset += 1
      offset = skipSubBlocks(bytes, offset)
      continue
    }
    break
  }

  if (frames < 1) return { ok: false, error: 'El GIF no tiene cuadros' }
  const duration = durationCs / 100
  if (duration > VIDEO_MAX_SECONDS + DURATION_SLACK) {
    return { ok: false, error: 'El video dura más de 8 segundos' }
  }
  if (width < 1 || height < 1) return { ok: false, error: 'No se pudieron leer las dimensiones' }
  if (Math.max(width, height) > VIDEO_MAX_LONG_SIDE) {
    return { ok: false, error: 'El video pasa de 1080p' }
  }
  return { ok: true, info: { width, height, duration } }
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset]! + (bytes[offset + 1]! << 8)
}

function skipSubBlocks(bytes: Uint8Array, offset: number) {
  while (offset < bytes.byteLength) {
    const size = bytes[offset]!
    offset += 1
    if (size === 0) return offset
    offset += size
  }
  return offset
}

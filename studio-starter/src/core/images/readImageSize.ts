export type ImageSize = {
  w: number
  h: number
  /** EXIF 1–8. ≥5 implica w/h de pantalla intercambiados. */
  orientation: number
}

function u16be(body: Uint8Array, i: number) {
  return (body[i]! << 8) | body[i + 1]!
}

function u32be(body: Uint8Array, i: number) {
  return ((body[i]! << 24) | (body[i + 1]! << 16) | (body[i + 2]! << 8) | body[i + 3]!) >>> 0
}

function u16le(body: Uint8Array, i: number) {
  return body[i]! | (body[i + 1]! << 8)
}

function u32le(body: Uint8Array, i: number) {
  return (body[i]! | (body[i + 1]! << 8) | (body[i + 2]! << 16) | (body[i + 3]! << 24)) >>> 0
}

function u24le(body: Uint8Array, i: number) {
  return body[i]! | (body[i + 1]! << 8) | (body[i + 2]! << 16)
}

function fourcc(body: Uint8Array, i: number) {
  return String.fromCharCode(body[i]!, body[i + 1]!, body[i + 2]!, body[i + 3]!)
}

function jpegOrientation(body: Uint8Array) {
  let i = 2
  while (i + 4 < body.length) {
    if (body[i] !== 0xff) break
    while (i < body.length && body[i] === 0xff) i += 1
    const marker = body[i++]
    if (marker === undefined || marker === 0xda || marker === 0xd9) break
    if (marker >= 0xd0 && marker <= 0xd7) continue
    if (i + 2 > body.length) break
    const len = u16be(body, i)
    if (len < 2) break
    if (marker === 0xe1 && i + len <= body.length) {
      const start = i + 2
      if (
        body[start] === 0x45 &&
        body[start + 1] === 0x78 &&
        body[start + 2] === 0x69 &&
        body[start + 3] === 0x66 &&
        body[start + 4] === 0 &&
        body[start + 5] === 0
      ) {
        const value = tiffOrientation(body, start + 6, i + len)
        if (value) return value
      }
    }
    i += len
  }
  return 1
}

function tiffOrientation(body: Uint8Array, offset: number, end: number) {
  if (offset + 8 > end) return 0
  const le = body[offset] === 0x49 && body[offset + 1] === 0x49
  const be = body[offset] === 0x4d && body[offset + 1] === 0x4d
  if (!le && !be) return 0
  const read16 = (i: number) => (le ? u16le(body, i) : u16be(body, i))
  const read32 = (i: number) => (le ? u32le(body, i) : u32be(body, i))
  const ifd = offset + read32(offset + 4)
  if (ifd + 2 > end) return 0
  const count = read16(ifd)
  for (let n = 0; n < count; n += 1) {
    const entry = ifd + 2 + n * 12
    if (entry + 12 > end) break
    if (read16(entry) === 0x0112) {
      const value = read16(entry + 8)
      if (value >= 1 && value <= 8) return value
    }
  }
  return 0
}

function jpegSize(body: Uint8Array): ImageSize | null {
  let i = 2
  while (i + 8 < body.length) {
    if (body[i] !== 0xff) {
      i += 1
      continue
    }
    while (i < body.length && body[i] === 0xff) i += 1
    const marker = body[i++]
    if (marker === undefined || marker === 0xda || marker === 0xd9) break
    if (marker >= 0xd0 && marker <= 0xd7) continue
    if (i + 2 > body.length) break
    const len = u16be(body, i)
    if (len < 2) return null
    const sof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (sof && i + 7 < body.length) {
      const h = u16be(body, i + 3)
      const w = u16be(body, i + 5)
      if (w < 1 || h < 1) return null
      return { w, h, orientation: jpegOrientation(body) }
    }
    i += len
  }
  return null
}

function pngSize(body: Uint8Array): ImageSize | null {
  if (body.length < 24) return null
  if (fourcc(body, 12) !== 'IHDR') return null
  const w = u32be(body, 16)
  const h = u32be(body, 20)
  if (w < 1 || h < 1) return null
  return { w, h, orientation: 1 }
}

function webpSize(body: Uint8Array): ImageSize | null {
  let offset = 12
  while (offset + 8 <= body.length) {
    const kind = fourcc(body, offset)
    const size = u32le(body, offset + 4)
    const data = offset + 8
    if (kind === 'VP8X' && data + 10 <= body.length) {
      const w = u24le(body, data + 4) + 1
      const h = u24le(body, data + 7) + 1
      if (w < 1 || h < 1) return null
      return { w, h, orientation: 1 }
    }
    if (kind === 'VP8 ' && data + 10 <= body.length) {
      if (body[data + 3] === 0x9d && body[data + 4] === 0x01 && body[data + 5] === 0x2a) {
        const w = u16le(body, data + 6) & 0x3fff
        const h = u16le(body, data + 8) & 0x3fff
        if (w < 1 || h < 1) return null
        return { w, h, orientation: 1 }
      }
    }
    if (kind === 'VP8L' && data + 5 <= body.length && body[data] === 0x2f) {
      const bits = u32le(body, data + 1)
      const w = (bits & 0x3fff) + 1
      const h = ((bits >> 14) & 0x3fff) + 1
      if (w < 1 || h < 1) return null
      return { w, h, orientation: 1 }
    }
    offset += 8 + size + (size & 1)
  }
  return null
}

/** Lee w/h de los headers. No decodifica píxeles. */
export function readImageSize(body: Uint8Array): ImageSize | null {
  if (body.length < 12) return null
  if (body[0] === 0xff && body[1] === 0xd8) return jpegSize(body)
  if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
    return pngSize(body)
  }
  if (
    body[0] === 0x52 &&
    body[1] === 0x49 &&
    body[2] === 0x46 &&
    body[3] === 0x46 &&
    body[8] === 0x57 &&
    body[9] === 0x45 &&
    body[10] === 0x42 &&
    body[11] === 0x50
  ) {
    return webpSize(body)
  }
  return null
}

/** Tamaño de pantalla (EXIF 5–8 rota 90°). */
export function displaySize(size: ImageSize) {
  if (size.orientation >= 5) return { w: size.h, h: size.w }
  return { w: size.w, h: size.h }
}

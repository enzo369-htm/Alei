export type SniffedImage = {
  mime: 'image/jpeg' | 'image/webp'
  format: 'jpeg' | 'webp'
}

/** Solo JPEG (SOI) o WebP (RIFF…WEBP). PNG y el resto son null. */
export function sniffImage(body: Uint8Array): SniffedImage | null {
  if (body.length < 12) return null
  if (body[0] === 0xff && body[1] === 0xd8) return { mime: 'image/jpeg', format: 'jpeg' }
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
    return { mime: 'image/webp', format: 'webp' }
  }
  return null
}

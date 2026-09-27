import assert from 'node:assert/strict'
import test from 'node:test'
import { displaySize, readImageSize } from './readImageSize.ts'

function jpegWithSize(w: number, h: number) {
  return Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, (h >> 8) & 0xff, h & 0xff, (w >> 8) & 0xff,
    w & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
  ])
}

function pngWithSize(w: number, h: number) {
  const buf = Buffer.alloc(8 + 8 + 13 + 4)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12)
  buf.writeUInt32BE(w, 16)
  buf.writeUInt32BE(h, 20)
  buf[24] = 8
  buf[25] = 2
  return new Uint8Array(buf)
}

function webpVp8x(w: number, h: number) {
  const payload = Buffer.alloc(10)
  payload.writeUIntLE(w - 1, 4, 3)
  payload.writeUIntLE(h - 1, 7, 3)
  const chunk = Buffer.concat([Buffer.from('VP8X'), Buffer.alloc(4), payload])
  chunk.writeUInt32LE(10, 4)
  const riff = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), chunk])
  riff.writeUInt32LE(riff.length - 8, 4)
  return new Uint8Array(riff)
}

test('JPEG SOF0', () => {
  assert.deepEqual(readImageSize(jpegWithSize(2400, 1600)), { w: 2400, h: 1600, orientation: 1 })
})

test('PNG IHDR', () => {
  assert.deepEqual(readImageSize(pngWithSize(480, 320)), { w: 480, h: 320, orientation: 1 })
})

test('WebP VP8X', () => {
  assert.deepEqual(readImageSize(webpVp8x(1400, 933)), { w: 1400, h: 933, orientation: 1 })
})

test('buffer corto', () => {
  assert.equal(readImageSize(new Uint8Array([0xff, 0xd8])), null)
})

test('PNG no es un tamaño inventado', () => {
  const size = readImageSize(pngWithSize(12, 34))
  assert.equal(size?.w, 12)
  assert.equal(size?.h, 34)
})

test('displaySize intercambia en orientación 6 (celular vertical)', () => {
  assert.deepEqual(displaySize({ w: 4000, h: 3000, orientation: 6 }), { w: 3000, h: 4000 })
  assert.deepEqual(displaySize({ w: 4000, h: 3000, orientation: 1 }), { w: 4000, h: 3000 })
})

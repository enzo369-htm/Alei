import assert from 'node:assert/strict'
import test from 'node:test'
import { sniffImage } from './sniff-image.ts'

test('JPEG SOI', () => {
  const buf = new Uint8Array(12)
  buf[0] = 0xff
  buf[1] = 0xd8
  assert.equal(sniffImage(buf)?.format, 'jpeg')
})

test('WebP RIFF', () => {
  const buf = new Uint8Array(12)
  buf.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  assert.equal(sniffImage(buf)?.format, 'webp')
})

test('PNG no se disfraza de jpeg', () => {
  const buf = new Uint8Array(12)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  assert.equal(sniffImage(buf), null)
})

test('buffer corto', () => {
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8])), null)
})

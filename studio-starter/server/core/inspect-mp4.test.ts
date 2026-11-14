import assert from 'node:assert/strict'
import test from 'node:test'
import { VIDEO_MAX_BYTES, inspectClip, inspectMp4 } from '../../src/core/video/inspectMp4.ts'

function u32(value: number) {
  return Uint8Array.from([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255])
}

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function box(type: string, payload: Uint8Array) {
  return concat(u32(8 + payload.length), new TextEncoder().encode(type), payload)
}

function mvhd(duration: number, timescale = 1000) {
  const payload = new Uint8Array(100)
  payload.set(u32(timescale), 12)
  payload.set(u32(duration), 16)
  return box('mvhd', payload)
}

function tkhd(width: number, height: number) {
  const payload = new Uint8Array(8)
  payload.set(u32(width * 65536), 0)
  payload.set(u32(height * 65536), 4)
  return box('tkhd', payload)
}

function hdlr(kind: string) {
  const payload = new Uint8Array(12)
  payload.set(new TextEncoder().encode(kind), 8)
  return box('hdlr', payload)
}

function stsd(format: string) {
  const entry = concat(u32(8), new TextEncoder().encode(format))
  return box('stsd', concat(u32(0), u32(1), entry))
}

function trak(kind: 'vide' | 'soun', format: string, width = 0, height = 0) {
  const mdia = box('mdia', concat(hdlr(kind), box('minf', box('stbl', stsd(format)))))
  return box('trak', concat(tkhd(width, height), mdia))
}

function mp4(duration: number, traks: Uint8Array[]) {
  const ftyp = box('ftyp', concat(new TextEncoder().encode('isom'), u32(0), new TextEncoder().encode('isom')))
  return concat(ftyp, box('moov', concat(mvhd(duration), ...traks)))
}

const clip = () => mp4(6000, [trak('vide', 'avc1', 1920, 1080)])

test('acepta un MP4 H.264 de hasta 8 segundos y 1080p, sin audio', () => {
  const parsed = inspectMp4(clip())
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.info.width, 1920)
  assert.equal(parsed.info.height, 1080)
  assert.equal(parsed.info.duration, 6)
})

test('lee el tamaño desde el sample H.264 si el track no lo trae', () => {
  const entry = new Uint8Array(36)
  entry.set(u32(36), 0)
  entry.set(new TextEncoder().encode('avc1'), 4)
  entry[32] = 0x05
  entry[33] = 0x00
  entry[34] = 0x02
  entry[35] = 0xd0
  const stsd = box('stsd', concat(u32(0), u32(1), entry))
  const trak = box(
    'trak',
    concat(tkhd(0, 0), box('mdia', concat(hdlr('vide'), box('minf', box('stbl', stsd))))),
  )
  const parsed = inspectMp4(mp4(3000, [trak]))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.info.width, 1280)
  assert.equal(parsed.info.height, 720)
})

test('rechaza un archivo que no es MP4', () => {
  const parsed = inspectMp4(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /MP4/)
})

test('rechaza audio', () => {
  const parsed = inspectMp4(mp4(4000, [trak('vide', 'avc1', 1280, 720), trak('soun', 'mp4a')]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /audio/)
})

test('rechaza más de 8 segundos', () => {
  const parsed = inspectMp4(mp4(9000, [trak('vide', 'avc1', 1280, 720)]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /8 segundos/)
})

test('rechaza más de 1080p', () => {
  const parsed = inspectMp4(mp4(2000, [trak('vide', 'avc1', 1921, 1080)]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /1080p/)
})

test('rechaza un codec que no es H.264', () => {
  const parsed = inspectMp4(mp4(2000, [trak('vide', 'hvc1', 1280, 720)]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /H\.264/)
})

function u16(value: number) {
  return Uint8Array.from([value & 255, (value >>> 8) & 255])
}

function gif(width: number, height: number, delaysCs: number[]) {
  const parts = [new TextEncoder().encode('GIF89a'), u16(width), u16(height), Uint8Array.from([0, 0, 0])]
  for (const delay of delaysCs) {
    parts.push(Uint8Array.from([0x21, 0xf9, 0x04, 0x00, delay & 255, (delay >>> 8) & 255, 0x00, 0x00]))
    parts.push(Uint8Array.from([0x2c, 0, 0, 0, 0, width & 255, (width >>> 8) & 255, height & 255, (height >>> 8) & 255, 0, 2, 0]))
  }
  parts.push(Uint8Array.from([0x3b]))
  return concat(...parts)
}

test('acepta un GIF corto dentro de 1080p', () => {
  const parsed = inspectClip(gif(480, 270, [100, 100]))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.format, 'gif')
  assert.equal(parsed.info.width, 480)
  assert.equal(parsed.info.height, 270)
  assert.equal(parsed.info.duration, 2)
})

test('un GIF con demora 0 cuenta como un décima por cuadro', () => {
  const parsed = inspectClip(gif(100, 100, [0, 0]))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.info.duration, 0.2)
})

test('rechaza un GIF de más de 8 segundos', () => {
  const parsed = inspectClip(gif(100, 100, [900]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /8 segundos/)
})

test('rechaza un GIF de más de 1080p', () => {
  const parsed = inspectClip(gif(1921, 1080, [10]))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /1080p/)
})

test('rechaza un archivo de más de 3,5 MB', () => {
  const parsed = inspectMp4(new Uint8Array(VIDEO_MAX_BYTES + 1))
  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.match(parsed.error, /3,5 MB/)
})

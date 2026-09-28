import assert from 'node:assert/strict'
import test from 'node:test'
import { mediaIdsOf, parseCanvasPut } from './canvas-put.ts'

const known = new Set(['00000000-0000-4000-8000-000000000001'])

test('PUT vacío no marca ningún canvas para reemplazar piezas', () => {
  const parsed = parseCanvasPut([], known)
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.equal(parsed.blocks.length, 0)
})

test('PUT sin array es error', () => {
  const parsed = parseCanvasPut(undefined, known)
  assert.equal(parsed.ok, false)
})

test('PUT con id desconocido es error, no skip', () => {
  const parsed = parseCanvasPut(
    [{ id: '00000000-0000-4000-8000-000000000099', pieces: [] }],
    known,
  )
  assert.equal(parsed.ok, false)
})

test('PUT lista solo el bloque enviado', () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const parsed = parseCanvasPut(
    [
      {
        id,
        title: 'Hola',
        pieces: [{ mediaId: '00000000-0000-4000-8000-0000000000aa', x: 10, y: 12, width: 20 }],
      },
    ],
    known,
  )
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.blocks.length, 1)
  assert.equal(parsed.blocks[0]!.id, id)
  assert.equal(parsed.blocks[0]!.pieces.length, 1)
  assert.deepEqual(mediaIdsOf(parsed.blocks), ['00000000-0000-4000-8000-0000000000aa'])
})

test('PUT puede ocultar una grilla', () => {
  const parsed = parseCanvasPut(
    [{ id: '00000000-0000-4000-8000-000000000001', visible: false, pieces: [] }],
    known,
  )
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.equal(parsed.blocks[0]!.visible, false)
})

test('PUT recorta título largo', () => {
  const parsed = parseCanvasPut(
    [{ id: '00000000-0000-4000-8000-000000000001', title: 'x'.repeat(250) }],
    known,
  )
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.equal(parsed.blocks[0]!.title.length, 200)
})

test('PUT guarda título, ficha y Sold de la pieza', () => {
  const parsed = parseCanvasPut(
    [
      {
        id: '00000000-0000-4000-8000-000000000001',
        pieces: [
          {
            id: '00000000-0000-4000-8000-0000000000bb',
            mediaId: '00000000-0000-4000-8000-0000000000aa',
            title: 'Night field',
            ficha: 'Oil on canvas\n40 × 50 cm',
            availability: 'sold',
            x: 10,
            y: 12,
            width: 20,
          },
        ],
      },
    ],
    known,
  )
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const piece = parsed.blocks[0]!.pieces[0]!
  assert.equal(piece.id, '00000000-0000-4000-8000-0000000000bb')
  assert.equal(piece.title, 'Night field')
  assert.equal(piece.ficha, 'Oil on canvas\n40 × 50 cm')
  assert.equal(piece.availability, 'sold')
})

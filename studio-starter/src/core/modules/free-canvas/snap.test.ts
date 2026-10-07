import assert from 'node:assert/strict'
import test from 'node:test'
import { applyAxis, pickAxis, snapPosition, snapWidth } from './snap.ts'

const board = { w: 1000, h: 800 }

test('pickAxis espera a que el gesto salga de la zona muerta', () => {
  assert.equal(pickAxis(3, 1), null)
  assert.equal(pickAxis(0, 0), null)
})

test('pickAxis elige el eje dominante', () => {
  assert.equal(pickAxis(24, 4), 'horizontal')
  assert.equal(pickAxis(4, 24), 'vertical')
  assert.equal(pickAxis(12, 12), 'horizontal')
})

test('applyAxis traba el eje débil en el origen del gesto', () => {
  assert.deepEqual(applyAxis(10, 20, 40, 55, 'horizontal'), { x: 40, y: 20 })
  assert.deepEqual(applyAxis(10, 20, 40, 55, 'vertical'), { x: 10, y: 55 })
  assert.deepEqual(applyAxis(10, 20, 40, 55, null), { x: 40, y: 55 })
})

test('snapPosition engancha bordes izquierdos', () => {
  const snapped = snapPosition(
    { x: 106, y: 40, w: 80, h: 80 },
    [{ x: 100, y: 200, w: 50, h: 40 }],
    board,
  )
  assert.equal(snapped.x, 100)
  assert.equal(snapped.guides.vertical, 100)
})

test('snapPosition engancha centros', () => {
  const snapped = snapPosition(
    { x: 156, y: 40, w: 100, h: 80 },
    [{ x: 150, y: 300, w: 100, h: 120 }],
    board,
  )
  assert.equal(snapped.x, 150)
  assert.equal(snapped.guides.vertical, 200)
})

test('snapPosition engancha el centro del lienzo', () => {
  const snapped = snapPosition({ x: 446, y: 40, w: 100, h: 80 }, [], board)
  assert.equal(snapped.x, 450)
  assert.equal(snapped.guides.vertical, 500)
})

test('snapPosition no se mueve si el objetivo está lejos', () => {
  const snapped = snapPosition(
    { x: 200, y: 80, w: 100, h: 80 },
    [{ x: 20, y: 20, w: 40, h: 40 }],
    board,
  )
  assert.equal(snapped.x, 200)
  assert.equal(snapped.y, 80)
  assert.equal(snapped.guides.vertical, null)
  assert.equal(snapped.guides.horizontal, null)
})

test('snapPosition iguala la distancia entre dos vecinas', () => {
  const snapped = snapPosition(
    { x: 154, y: 0, w: 100, h: 100 },
    [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 300, y: 0, w: 100, h: 100 },
    ],
    board,
  )
  assert.equal(snapped.x, 150)
  assert.equal(snapped.guides.gaps.length, 2)
  assert.equal(snapped.guides.vertical, null)
})

test('snapPosition copia un hueco que ya existe', () => {
  const snapped = snapPosition(
    { x: 244, y: 0, w: 40, h: 40 },
    [
      { x: 0, y: 200, w: 30, h: 40 },
      { x: 70, y: 200, w: 30, h: 40 },
      { x: 160, y: 0, w: 40, h: 40 },
    ],
    board,
  )
  assert.equal(snapped.x, 240)
  assert.equal(snapped.guides.gaps.length, 1)
  assert.equal(snapped.guides.gaps[0]?.start, 200)
  assert.equal(snapped.guides.gaps[0]?.end, 240)
  assert.equal(snapped.guides.vertical, null)
})

test('el borde más cercano gana sobre un centro más lejano', () => {
  const snapped = snapPosition(
    { x: 96, y: 0, w: 100, h: 40 },
    [{ x: 100, y: 0, w: 200, h: 40 }],
    board,
  )
  assert.equal(snapped.x, 100)
})

test('snapWidth iguala el ancho', () => {
  const snapped = snapWidth(108, 20, 1, [{ x: 400, y: 0, w: 100, h: 80 }], 1000)
  assert.equal(snapped.width, 100)
  assert.equal(snapped.line, null)
})

test('snapWidth iguala el alto visual', () => {
  const snapped = snapWidth(108, 20, 2, [{ x: 400, y: 0, w: 40, h: 200 }], 1000)
  assert.equal(snapped.width, 100)
})

test('snapWidth engancha el borde derecho con el de otra', () => {
  const snapped = snapWidth(346, 100, 1, [{ x: 400, y: 0, w: 50, h: 50 }], 1000)
  assert.equal(snapped.width, 350)
  assert.equal(snapped.line, 450)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { capLongSide, pickVariantSizes } from './sizes.ts'

test('foto grande: tres anchos, sin agrandar', () => {
  const sizes = pickVariantSizes(6000, 4000)
  assert.deepEqual(
    sizes.map((s) => s.w),
    [3000, 1400, 480],
  )
  assert.equal(sizes[0]?.h, 2000)
})

test('foto chica: no inventa 1400 ni 3000', () => {
  const sizes = pickVariantSizes(900, 600)
  assert.deepEqual(sizes, [
    { w: 900, h: 600 },
    { w: 480, h: 320 },
  ])
})

test('cuadrada más chica que el target menor', () => {
  assert.deepEqual(pickVariantSizes(200, 200), [{ w: 200, h: 200 }])
})

test('capLongSide no toca una foto que ya entra', () => {
  assert.deepEqual(capLongSide(2000, 1000, 3000), { w: 2000, h: 1000 })
})

test('capLongSide achica el lado mayor a 3000 sin agrandar el otro', () => {
  assert.deepEqual(capLongSide(6000, 4000, 3000), { w: 3000, h: 2000 })
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { clamp, defaultPositionForIndex, withDefaultPositions } from './layout.ts'

test('clamp recorta al rango', () => {
  assert.equal(clamp(3, 0, 2), 2)
  assert.equal(clamp(-1, 0, 2), 0)
  assert.equal(clamp(1, 0, 2), 1)
})

test('withDefaultPositions deja las coordenadas que ya existen', () => {
  const [item] = withDefaultPositions([
    { id: 'a', imageUrl: '/a.jpg', x: 10, y: 20, width: 30 },
  ])
  assert.equal(item?.id, 'a')
  assert.equal(item?.x, 10)
  assert.equal(item?.y, 20)
  assert.equal(item?.width, 30)
})

test('withDefaultPositions no apila ítems nuevos', () => {
  const items = withDefaultPositions([
    { id: 'a', imageUrl: '/a.jpg' },
    { id: 'b', imageUrl: '/b.jpg' },
  ])
  assert.notEqual(items[0]!.x, items[1]!.x)
  assert.equal(items[0]!.width, 24)
})

test('defaultPositionForIndex alterna columnas', () => {
  const a = defaultPositionForIndex(0)
  const b = defaultPositionForIndex(1)
  assert.ok(a.x < 50)
  assert.ok(b.x > 50)
})

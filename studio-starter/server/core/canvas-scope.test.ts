import assert from 'node:assert/strict'
import test from 'node:test'
import { isCanvasScope } from './canvas-scope.ts'

test('scope de canvas válido', () => {
  assert.equal(isCanvasScope('demo'), true)
  assert.equal(isCanvasScope('editorial-abc'), true)
})

test('scope de canvas inválido', () => {
  assert.equal(isCanvasScope(''), false)
  assert.equal(isCanvasScope('Demo'), false)
  assert.equal(isCanvasScope('has space'), false)
})

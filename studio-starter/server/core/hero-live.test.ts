import assert from 'node:assert/strict'
import test from 'node:test'
import { liveHeroMode } from './hero-live.ts'

test('sin archivo, Hero 2 no puede quedar activo', () => {
  assert.equal(liveHeroMode('fit', false), 'motion')
  assert.equal(liveHeroMode('motion', false), 'motion')
  assert.equal(liveHeroMode(undefined, false), 'motion')
})

test('con archivo, Hero 2 queda activo solo si está elegido', () => {
  assert.equal(liveHeroMode('fit', true), 'fit')
  assert.equal(liveHeroMode('motion', true), 'motion')
})

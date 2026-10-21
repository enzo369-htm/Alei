import assert from 'node:assert/strict'
import test from 'node:test'
import { textOf } from './text-of.ts'

test('en español siempre se muestra el texto base', () => {
  assert.equal(textOf('hola', 'hello', 'es'), 'hola')
  assert.equal(textOf('hola', '', 'es'), 'hola')
})

test('en inglés se muestra la traducción solo si, recortada, tiene texto', () => {
  assert.equal(textOf('hola', 'hello', 'en'), 'hello')
  assert.equal(textOf('hola', '  ', 'en'), 'hola')
  assert.equal(textOf('hola', '', 'en'), 'hola')
  assert.equal(textOf('hola', null, 'en'), 'hola')
})

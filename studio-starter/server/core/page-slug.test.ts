import assert from 'node:assert/strict'
import test from 'node:test'
import { isPageSlug } from './page-slug.ts'

test('slug de página válido', () => {
  assert.equal(isPageSlug('bio'), true)
  assert.equal(isPageSlug('acerca-de'), true)
})

test('slug de página inválido', () => {
  assert.equal(isPageSlug(''), false)
  assert.equal(isPageSlug('Bio'), false)
  assert.equal(isPageSlug('has space'), false)
  assert.equal(isPageSlug('-bio'), false)
})

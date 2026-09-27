import assert from 'node:assert/strict'
import test from 'node:test'
import { r2KeysOf } from './media-keys.ts'

test('junta r2_key y variants.widths sin duplicar', () => {
  assert.deepEqual(
    r2KeysOf('media/a/3000.webp', {
      format: 'webp',
      widths: [
        { w: 3000, h: 2000, key: 'media/a/3000.webp', url: 'https://x/3000.webp' },
        { w: 1400, h: 933, key: 'media/a/1400.webp', url: 'https://x/1400.webp' },
      ],
    }).sort(),
    ['media/a/1400.webp', 'media/a/3000.webp'],
  )
})

test('sin variants solo queda r2_key', () => {
  assert.deepEqual(r2KeysOf('media/a/x.jpg', {}), ['media/a/x.jpg'])
})

test('ignora keys vacías', () => {
  assert.deepEqual(r2KeysOf('', { widths: [{ key: '' }, { key: 'media/a/480.webp' }] }), [
    'media/a/480.webp',
  ])
})

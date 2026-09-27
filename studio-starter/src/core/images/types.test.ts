import assert from 'node:assert/strict'
import test from 'node:test'
import type { MediaVariants } from './types.ts'

test('contrato variants: jsonb que guarda POST /api/media', () => {
  const variants: MediaVariants = {
    format: 'webp',
    widths: [
      {
        w: 1400,
        h: 933,
        key: 'media/00000000-0000-4000-8000-000000000001/1400.webp',
        url: 'https://pub.example/media/00000000-0000-4000-8000-000000000001/1400.webp',
      },
    ],
  }
  const raw = JSON.stringify(variants)
  const parsed = JSON.parse(raw) as MediaVariants
  assert.equal(parsed.format, 'webp')
  assert.equal(parsed.widths.length, 1)
  assert.equal(parsed.widths[0]?.w, 1400)
  assert.doesNotMatch(raw, /png/i)
})

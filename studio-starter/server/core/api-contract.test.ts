import assert from 'node:assert/strict'
import test from 'node:test'
import { sessionCookie, signSession } from './auth.ts'
import { core } from './index.ts'
import { apiPath } from './router.ts'

process.env.ADMIN_PASSWORD = 'test-password'
process.env.ADMIN_SESSION_SECRET = 'test-session-secret-not-password'

async function authed(url: string, method = 'GET') {
  const token = await signSession()
  return core(
    new Request(url, {
      method,
      headers: { cookie: sessionCookie(token).split(';')[0]! },
    }),
  )
}

test('rewrite: __path gana al pathname (shape de Vercel)', () => {
  const url = new URL('https://ejemplo.vercel.app/api/index?__path=auth/me')
  assert.equal(apiPath(url), '/api/auth/me')
})

test('rewrite: __path con slash extra', () => {
  const url = new URL('https://ejemplo.vercel.app/api/index?__path=/media/x')
  assert.equal(apiPath(url), '/api/media/x')
})

test('sin __path usa el pathname (Vite local)', () => {
  const url = new URL('http://localhost:5199/api/auth/me')
  assert.equal(apiPath(url), '/api/auth/me')
})

test('GET /api/index?__path=auth/me responde JSON del core, no HTML', async () => {
  const res = await core(new Request('https://ejemplo.vercel.app/api/index?__path=auth/me'))
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') ?? '', /json/)
  const body = (await res.json()) as { ok?: unknown }
  assert.equal(body.ok, false)
})

test('GET /api/auth/me por pathname también es JSON', async () => {
  const res = await core(new Request('http://localhost/api/auth/me'))
  assert.equal(res.status, 200)
  assert.equal(((await res.json()) as { ok: boolean }).ok, false)
})

test('ruta API inexistente es 404 JSON del core', async () => {
  const res = await core(new Request('https://ejemplo.vercel.app/api/index?__path=no-existe'))
  assert.equal(res.status, 404)
  assert.match(res.headers.get('content-type') ?? '', /json/)
  assert.equal(((await res.json()) as { error: string }).error, 'No encontrado')
})

test('POST /api/media sin sesión es 401', async () => {
  const res = await core(new Request('http://localhost/api/media', { method: 'POST' }))
  assert.equal(res.status, 401)
})

test('DELETE /api/media/:id sin sesión es 401', async () => {
  const res = await core(
    new Request('http://localhost/api/media/00000000-0000-4000-8000-000000000001', {
      method: 'DELETE',
    }),
  )
  assert.equal(res.status, 401)
})

test('DELETE /api/media/id-inválido es 400', async () => {
  const res = await authed('http://localhost/api/media/no-es-uuid', 'DELETE')
  assert.equal(res.status, 400)
})

test('DELETE /api/media/:id sin DATABASE_URL es 503', async () => {
  const prev = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  const res = await authed(
    'http://localhost/api/media/00000000-0000-4000-8000-000000000001',
    'DELETE',
  )
  if (prev) process.env.DATABASE_URL = prev
  assert.equal(res.status, 503)
})

test('GET /api/editorial sin DATABASE_URL es 503', async () => {
  const prev = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  const res = await core(new Request('http://localhost/api/editorial'))
  if (prev) process.env.DATABASE_URL = prev
  assert.equal(res.status, 503)
})

test('POST /api/editorial sin sesión es 401', async () => {
  const res = await core(new Request('http://localhost/api/editorial', { method: 'POST' }))
  assert.equal(res.status, 401)
})

test('DELETE /api/editorial/id-inválido es 400', async () => {
  const res = await authed('http://localhost/api/editorial/no-es-uuid', 'DELETE')
  assert.equal(res.status, 400)
})

test('GET /api/pages/bio sin DATABASE_URL es 503', async () => {
  const prev = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  const res = await core(new Request('http://localhost/api/pages/bio'))
  if (prev) process.env.DATABASE_URL = prev
  assert.equal(res.status, 503)
})

test('GET /api/pages/slug-inválido es 400', async () => {
  const res = await core(new Request('http://localhost/api/pages/NO'))
  assert.equal(res.status, 400)
})

test('PUT /api/pages/bio sin sesión es 401', async () => {
  const res = await core(
    new Request('http://localhost/api/pages/bio', { method: 'PUT', body: '{}' }),
  )
  assert.equal(res.status, 401)
})

test('GET /api/canvas/demo sin DATABASE_URL es 503', async () => {
  const prev = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  const res = await core(new Request('http://localhost/api/canvas/demo'))
  if (prev) process.env.DATABASE_URL = prev
  assert.equal(res.status, 503)
})

test('GET /api/canvas/scope-inválido es 400', async () => {
  const res = await core(new Request('http://localhost/api/canvas/NO'))
  assert.equal(res.status, 400)
})

test('POST /api/canvas/demo sin sesión es 401', async () => {
  const res = await core(
    new Request('http://localhost/api/canvas/demo', { method: 'POST', body: '{}' }),
  )
  assert.equal(res.status, 401)
})

test('PUT /api/canvas/demo sin sesión es 401', async () => {
  const res = await core(
    new Request('http://localhost/api/canvas/demo', { method: 'PUT', body: '{}' }),
  )
  assert.equal(res.status, 401)
})

test('DELETE /api/canvas/demo/id-inválido es 400', async () => {
  const res = await authed('http://localhost/api/canvas/demo/no-es-uuid', 'DELETE')
  assert.equal(res.status, 400)
})

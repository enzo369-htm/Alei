import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { runSmoke } from './smoke-api.mjs'

const script = fileURLToPath(new URL('./smoke-api.mjs', import.meta.url))

function listen(handler) {
  const server = createServer(handler)
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, origin: `http://127.0.0.1:${port}` })
    })
  })
}

test('sin ORIGIN sale 2', () => {
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, ORIGIN: '' },
  })
  assert.equal(result.status, 2)
})

test('HTML en /api falla', async () => {
  const { server, origin } = await listen((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<html>spa</html>')
  })
  try {
    const result = await runSmoke(origin)
    assert.equal(result.ok, false)
    assert.match(result.logs.join('\n'), /no es JSON/)
  } finally {
    server.close()
  }
})

test('JSON del core pasa', async () => {
  const { server, origin } = await listen((req, res) => {
    res.writeHead(req.url === '/api/auth/me' ? 200 : 404, { 'content-type': 'application/json' })
    res.end(req.url === '/api/auth/me' ? '{"ok":false}' : '{"error":"No encontrado"}')
  })
  try {
    const result = await runSmoke(origin)
    assert.equal(result.ok, true, result.logs.join('\n'))
  } finally {
    server.close()
  }
})

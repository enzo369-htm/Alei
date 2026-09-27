import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/**
 * Adaptador de desarrollo: traduce el req/res de Node de Vite al Request/Response
 * estándar que usa el core, para que el dev local ejecute exactamente el mismo
 * código que producción. El otro adaptador es `api/index.ts`.
 */

function toRequest(req: IncomingMessage, body: Buffer): Request {
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `http://${host}`)

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry))
    else headers.set(name, value)
  }

  const method = req.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD' && body.length > 0

  return new Request(url, {
    method,
    headers,
    body: hasBody ? body : undefined,
  })
}

function readBody(req: IncomingMessage, maxBytes = 6 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Cuerpo demasiado grande'))
        req.destroy()
        return
      }
      chunks.push(Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function send(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  // Contraparte del marcador de `api/index.ts`: deja ver cuál de los dos
  // adaptadores atendió la request.
  res.setHeader('x-studio-adapter', 'vite')

  const setCookies = response.headers.getSetCookie?.() ?? []
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') return
    res.setHeader(name, value)
  })
  if (setCookies.length > 0) res.setHeader('Set-Cookie', setCookies)

  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}

export function localApiPlugin(): Plugin {
  return {
    name: 'studio-local-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        if (!(req.url ?? '').startsWith('/api/')) {
          next()
          return
        }

        void (async () => {
          try {
            const body = await readBody(req)
            const { core } = (await server.ssrLoadModule('/server/core/index.ts')) as {
              core: (request: Request) => Promise<Response>
            }
            await send(res, await core(toRequest(req, body)))
          } catch (error) {
            const oversized = error instanceof Error && error.message === 'Cuerpo demasiado grande'
            console.error('[dev-api]', error)
            res.statusCode = oversized ? 413 : 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                error: oversized ? 'El archivo es demasiado grande' : 'Error de servidor',
              }),
            )
          }
        })()
      })
    },
  }
}

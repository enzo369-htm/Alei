import { methodNotAllowed, notFound } from './http.ts'

export type RouteContext = {
  request: Request
  url: URL
  params: Record<string, string>
}

export type Handler = (ctx: RouteContext) => Response | Promise<Response>

export type Route = {
  method: string
  /** Patrón por segmentos, con `:nombre` para las partes variables. */
  pattern: string
  handler: Handler
}

export function route(method: string, pattern: string, handler: Handler): Route {
  return { method: method.toUpperCase(), pattern, handler }
}

/**
 * Path real de la request.
 *
 * En Vercel todas las rutas entran por `api/index.ts` vía el rewrite de
 * `vercel.json`, que pasa el path original en `__path`. Se lee eso primero
 * porque no depende de que Vercel preserve el pathname al reescribir. En el dev
 * local no hay rewrite y el pathname ya es el correcto.
 */
export function apiPath(url: URL) {
  const fromQuery = url.searchParams.get('__path')
  if (fromQuery === null) return url.pathname
  const clean = fromQuery.split('?')[0]?.replace(/^\/+/, '') ?? ''
  return `/api/${clean}`
}

function matchPattern(pattern: string, path: string) {
  const expected = pattern.split('/').filter(Boolean)
  const actual = path.split('/').filter(Boolean)
  if (expected.length !== actual.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < expected.length; i += 1) {
    const segment = expected[i]!
    const value = actual[i]!
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(value)
      continue
    }
    if (segment !== value) return null
  }
  return params
}

export function createRouter(routes: Route[]) {
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = apiPath(url)
    const method = request.method.toUpperCase()

    let pathMatched = false
    for (const candidate of routes) {
      const params = matchPattern(candidate.pattern, path)
      if (!params) continue
      pathMatched = true
      if (candidate.method !== method) continue
      return candidate.handler({ request, url, params })
    }

    return pathMatched ? methodNotAllowed() : notFound()
  }
}

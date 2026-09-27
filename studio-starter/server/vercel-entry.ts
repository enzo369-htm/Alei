import { core } from './core/index.ts'

/**
 * Entrada de la función de Vercel. `scripts/bundle-api.mjs` la empaqueta a
 * `api/index.js` para que Node no intente importar archivos .ts en runtime.
 */
export default {
  fetch: async (request: Request) => {
    try {
      const response = await core(request)
      const out = new Response(response.body, response)
      out.headers.set('x-studio-adapter', 'vercel')
      return out
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de servidor'
      return Response.json({ error: message }, { status: 500 })
    }
  },
}

import { core } from '../server/core/index.ts'

/**
 * Única función de Vercel del proyecto. El rewrite de `vercel.json` manda todo
 * `/api/*` acá con el path original en `__path`, y el router del core resuelve
 * desde ahí.
 *
 * Es a propósito que sea una sola: sin framework, Vercel crea una función por
 * archivo dentro de `api/`, y el plan Hobby corta en 12 por deploy. Con esta
 * forma, la cantidad de rutas del sitio no tiene relación con ese límite.
 *
 * Para agregar una ruta, editá `server/core/index.ts`. No creés archivos acá.
 */
export default {
  fetch: async (request: Request) => {
    const response = await core(request)
    // Marca de qué adaptador respondió. Sirve para comprobar, con `vercel dev` o
    // en producción, que la request entró por la función y no por otro lado.
    const out = new Response(response.body, response)
    out.headers.set('x-studio-adapter', 'vercel')
    return out
  },
}

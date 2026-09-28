import { createRouter, type Route } from './router.ts'
import { authRoutes } from './routes/auth.ts'
import { canvasRoutes } from './routes/canvas.ts'
import { editorialRoutes } from './routes/editorial.ts'
import { heroRoutes } from './routes/hero.ts'
import { mediaRoutes } from './routes/media.ts'
import { pageRoutes } from './routes/pages.ts'

/**
 * Todas las rutas del sitio, en un solo lugar. Las recetas y los módulos
 * agregan sus rutas acá; nunca creando un archivo nuevo dentro de `api/`.
 */
const routes: Route[] = [
  ...authRoutes,
  ...mediaRoutes,
  ...editorialRoutes,
  ...pageRoutes,
  ...canvasRoutes,
  ...heroRoutes,
]

const handle = createRouter(routes)

export async function core(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } catch (error) {
    console.error('[api]', error)
    return Response.json({ error: 'Error de servidor' }, { status: 500 })
  }
}

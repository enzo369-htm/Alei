import { neon } from '@neondatabase/serverless'
import { hasDatabase, requireEnv } from './env.ts'

/**
 * Cliente Neon. Lanza si falta DATABASE_URL, así que las rutas que quieran
 * degradar en vez de fallar deben consultar hasDatabase() primero.
 */
export function sql() {
  if (!hasDatabase()) throw new Error('DATABASE_URL no está configurada')
  return neon(requireEnv('DATABASE_URL'))
}

export { hasDatabase }

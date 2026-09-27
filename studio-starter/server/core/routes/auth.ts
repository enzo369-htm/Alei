import {
  clearedCookie,
  isAuthed,
  passwordsMatch,
  sessionCookie,
  signSession,
} from '../auth.ts'
import { fail, json, readJson } from '../http.ts'
import { route } from '../router.ts'

/**
 * Freno de intentos de login. Es best-effort: en serverless cada instancia
 * tiene su propio Map, así que no es un límite duro, solo encarece la fuerza
 * bruta desde una misma IP contra una misma instancia.
 */
const attempts = new Map<string, { count: number; startedAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 12

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

function tooManyAttempts(ip: string) {
  const now = Date.now()
  const row = attempts.get(ip)
  if (!row || now - row.startedAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, startedAt: now })
    return false
  }
  row.count += 1
  return row.count > MAX_ATTEMPTS
}

function clearAttempts(ip: string) {
  attempts.delete(ip)
}

function expectedPassword() {
  return process.env.ADMIN_PASSWORD || ''
}

export const authRoutes = [
  route('POST', '/api/auth/login', async ({ request }) => {
    if (tooManyAttempts(clientIp(request))) {
      return fail(429, 'Demasiados intentos. Esperá unos minutos.')
    }

    const expected = expectedPassword()
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || ''
    if (!expected) return fail(503, 'Falta configurar ADMIN_PASSWORD')
    if (!sessionSecret) return fail(503, 'Falta configurar ADMIN_SESSION_SECRET')
    if (expected === sessionSecret) {
      return fail(503, 'ADMIN_SESSION_SECRET no puede ser igual a ADMIN_PASSWORD')
    }

    const body = await readJson<{ password?: string }>(request)
    if (!(await passwordsMatch(typeof body.password === 'string' ? body.password : '', expected))) {
      return fail(401, 'Contraseña incorrecta')
    }

    clearAttempts(clientIp(request))
    return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(await signSession()) } })
  }),

  route('POST', '/api/auth/logout', () =>
    json({ ok: true }, { headers: { 'Set-Cookie': clearedCookie() } }),
  ),

  route('GET', '/api/auth/me', async ({ request }) => json({ ok: await isAuthed(request) })),
]

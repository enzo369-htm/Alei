import { optionalEnv } from './env.ts'

const SESSION_DAYS = 7
const MAX_AGE_SECONDS = 60 * 60 * 24 * SESSION_DAYS

/**
 * Única implementación de sesión de admin del proyecto. Si necesitás saber si
 * alguien está autenticado, importá isAuthed de acá. No la copies a otro archivo.
 *
 * El token es `<expiración>.<hmac>`: sin estado en servidor, así que sirve igual
 * en una función serverless que en el dev local.
 */

export function cookieName() {
  return optionalEnv('ADMIN_COOKIE_NAME') || 'studio_admin'
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value) throw new Error('Falta ADMIN_SESSION_SECRET')
  return value
}

async function hmacHex(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Comparación de tiempo constante: no corta en el primer byte distinto. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function parseCookies(header: string | null) {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (!name) continue
    try {
      out[name] = decodeURIComponent(rest.join('='))
    } catch {
      out[name] = rest.join('=')
    }
  }
  return out
}

export async function passwordsMatch(given: string, expected: string) {
  const a = await hmacHex(`pw:${given}`)
  const b = await hmacHex(`pw:${expected}`)
  return safeEqual(a, b)
}

export async function signSession() {
  const payload = String(Date.now() + MAX_AGE_SECONDS * 1000)
  return `${payload}.${await hmacHex(payload)}`
}

export async function sessionValid(token: string | undefined) {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(signature, await hmacHex(payload))) return false
  return Number(payload) > Date.now()
}

export async function isAuthed(request: Request) {
  try {
    const token = parseCookies(request.headers.get('cookie'))[cookieName()]
    return sessionValid(token)
  } catch {
    return false
  }
}

function secureFlag() {
  const vercel = process.env.VERCEL_ENV
  if (vercel === 'production' || vercel === 'preview') return '; Secure'
  return process.env.NODE_ENV === 'production' ? '; Secure' : ''
}

export function sessionCookie(token: string) {
  return `${cookieName()}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secureFlag()}`
}

export function clearedCookie() {
  return `${cookieName()}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag()}`
}

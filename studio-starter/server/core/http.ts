export function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, init)
}

export function fail(status: number, error: string) {
  return Response.json({ error }, { status })
}

export const unauthorized = () => fail(401, 'No autorizado')
export const notFound = () => fail(404, 'No encontrado')
export const methodNotAllowed = () => fail(405, 'Método no permitido')

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    return {} as T
  }
}

export function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

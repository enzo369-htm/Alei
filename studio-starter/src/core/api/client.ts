/**
 * Único lugar donde se hace fetch a la API. Normaliza el manejo de errores para
 * que las pantallas siempre reciban un Error con mensaje legible.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const raw = await response.text()
  let data = {} as T & { error?: string }
  if (raw) {
    try {
      data = JSON.parse(raw) as T & { error?: string }
    } catch {
      throw new Error(raw.slice(0, 180) || `Error ${response.status}`)
    }
  }

  if (!response.ok) throw new Error(data.error || `Error ${response.status}`)
  return data
}

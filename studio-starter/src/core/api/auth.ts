import { request } from './client'

export async function fetchAdminSession() {
  try {
    const { ok } = await request<{ ok: boolean }>('/api/auth/me')
    return ok
  } catch {
    return false
  }
}

export async function loginAdmin(password: string) {
  await request<{ ok: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function logoutAdmin() {
  await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

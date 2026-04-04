const API_URL = import.meta.env.VITE_API_URL

function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || error.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

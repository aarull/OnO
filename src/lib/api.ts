const API_URL = import.meta.env.VITE_API_URL as string

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

async function apiPostForm(path: string, formData: FormData) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || error.message || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Absolute URL or path relative to API origin (e.g. `/storage/...`) */
export function resolveMediaUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim()
  if (/^https?:\/\//i.test(raw)) return raw
  const base = (API_URL || '').replace(/\/$/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${base}${path}`
}

export async function fetchAuthenticatedBlob(pathOrUrl: string): Promise<Blob> {
  const token = getToken()
  const url = resolveMediaUrl(pathOrUrl)
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error('Failed to load file')
  }
  return res.blob()
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: (path: string, formData: FormData) => apiPostForm(path, formData),
  patch: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

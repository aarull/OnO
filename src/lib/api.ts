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
    // Avoid stale dashboard data from browser/proxy caches.
    // (We also add per-call cache busters in critical polling views.)
    cache: options.cache ?? 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
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

/**
 * Resolve a browser-openable URL for an uploaded invoice PDF.
 * 1) GET /invoices/:id/file-url → { signed_url | signedUrl | url }
 * 2) Else use invoice_file_url if absolute, or resolve relative to API origin.
 */
export async function getInvoiceFileSignedUrl(
  invoiceId: string,
  invoiceFileRef?: string | null
): Promise<string> {
  try {
    const data = (await apiFetch(`/invoices/${encodeURIComponent(invoiceId)}/file-url`)) as {
      signed_url?: string
      signedUrl?: string
      url?: string
    }
    const u = data?.signed_url ?? data?.signedUrl ?? data?.url
    if (typeof u === 'string' && u.trim().length > 0) {
      return u.trim()
    }
  } catch (err) {
    console.warn('[getInvoiceFileSignedUrl] /file-url request failed:', err)
  }

  const ref = invoiceFileRef?.trim()
  if (!ref) {
    throw new Error('No invoice file reference')
  }
  if (/^https?:\/\//i.test(ref)) {
    return ref
  }
  return resolveMediaUrl(ref)
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: (path: string, formData: FormData) => apiPostForm(path, formData),
  patch: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

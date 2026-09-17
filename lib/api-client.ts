// Browser-side fetch helper for the /api/v1 routes and Payload's REST auth endpoints.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    /** Field-level messages from Payload validation errors, keyed by field path. */
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
  }
}

type PayloadErrorBody = {
  errors?: Array<{ message?: string; data?: { errors?: Array<{ message?: string; path?: string }> } }>
}
type V1ErrorBody = { error?: { code?: string; message?: string } }

const GENERIC_MESSAGE = 'Xəta baş verdi. Bir az sonra yenidən cəhd edin.'

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    })
  } catch {
    throw new ApiError('İnternet bağlantısını yoxlayın və yenidən cəhd edin.', 'NETWORK_ERROR', 0)
  }

  const body: unknown = await response.json().catch(() => null)
  if (response.ok) return body as T

  // /api/v1 routes answer { error: { code, message } }; Payload answers { errors: [{ message, data }] }.
  const v1 = (body as V1ErrorBody | null)?.error
  if (v1) throw new ApiError(v1.message || GENERIC_MESSAGE, v1.code || 'ERROR', response.status)

  const payloadError = (body as PayloadErrorBody | null)?.errors?.[0]
  const fields: Record<string, string> = {}
  for (const fieldError of payloadError?.data?.errors ?? []) {
    if (fieldError.path && fieldError.message) fields[fieldError.path] = fieldError.message
  }
  throw new ApiError(payloadError?.message || GENERIC_MESSAGE, 'ERROR', response.status, fields)
}

export function postJson<T>(path: string, data?: unknown) {
  return apiFetch<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) })
}

/** Builds "/path?a=1&b=2", skipping empty values. */
export function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

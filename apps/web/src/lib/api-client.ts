import type { ApiErrorCode, ApiErrorResponse } from './api-errors'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode | 'unknown',
    public details?: unknown,
    public requestId?: string,
  ) {
    super(`API ${status}: ${code}`)
    this.name = 'ApiError'
  }
}

export type FetchOpts = RequestInit & { signal?: AbortSignal | null }

export async function apiFetch<T>(path: string, init?: FetchOpts): Promise<T> {
  const requestId = crypto.randomUUID()
  const res = await fetch(API_URL + path, {
    ...init,
    credentials: 'include',
    signal: init?.signal,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    let body: ApiErrorResponse | null = null
    try {
      body = text ? (JSON.parse(text) as ApiErrorResponse) : null
    } catch {
      body = null
    }
    const serverRequestId = res.headers.get('x-request-id') ?? requestId
    throw new ApiError(res.status, body?.error ?? 'unknown', body?.details, serverRequestId)
  }

  // 204 No Content (and 205 Reset Content) carry no body — calling res.json()
  // would throw SyntaxError. Callers that type the response as `void` rely on
  // us short-circuiting here.
  if (res.status === 204 || res.status === 205) {
    return undefined as T
  }

  return (await res.json()) as T
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  })
}

export async function apiFetchWithMeta<T>(
  path: string,
  init?: FetchOpts,
): Promise<{ data: T; requestId: string }> {
  const requestId = crypto.randomUUID()
  const res = await fetch(API_URL + path, {
    ...init,
    credentials: 'include',
    signal: init?.signal,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      ...(init?.headers ?? {}),
    },
  })

  const serverRequestId = res.headers.get('x-request-id') ?? requestId

  if (!res.ok) {
    const text = await res.text()
    let body: ApiErrorResponse | null = null
    try {
      body = text ? (JSON.parse(text) as ApiErrorResponse) : null
    } catch {
      body = null
    }
    throw new ApiError(res.status, body?.error ?? 'unknown', body?.details, serverRequestId)
  }

  if (res.status === 204 || res.status === 205) {
    return { data: undefined as T, requestId: serverRequestId }
  }

  const data = (await res.json()) as T
  return { data, requestId: serverRequestId }
}

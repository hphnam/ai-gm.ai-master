import 'server-only'
import { cookies } from 'next/headers'
import { API_URL } from './api-client'

/// Server-side GET that forwards the request's session cookies so better-auth +
/// CurrentOrg resolve the caller — the RSC prefetch counterpart to the browser
/// `apiFetch` (which relies on `credentials: 'include'`). Throws on a non-OK
/// response; `prefetchQuery` swallows the throw, so a failed prefetch just
/// degrades to the client hook fetching normally (skeleton), never a 500.
export async function serverApiFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: { cookie: cookieHeader, accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`serverApiFetch ${res.status} ${path}`)
  return (await res.json()) as T
}

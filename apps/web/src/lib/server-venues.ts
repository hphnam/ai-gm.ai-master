import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type ServerVenue = {
  id: string
  name: string
  type: string
  address: string | null
  timezone: string
  squareLocationId: string | null
  createdAt: string
}

/// Server-side venue list for the active session's org. Forwards cookies so
/// better-auth + CurrentOrg resolve the caller. Returns null when the call
/// fails (no session, network error) so the page-level redirect logic can
/// distinguish "no auth" from "zero venues".
export async function getServerVenues(): Promise<ServerVenue[] | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
  if (!cookieHeader) return null

  try {
    const res = await fetch(`${API_URL}/venues`, {
      method: 'GET',
      headers: { cookie: cookieHeader, accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as ServerVenue[]
  } catch {
    return null
  }
}

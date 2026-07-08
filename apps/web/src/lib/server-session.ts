import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type ServerSession = {
  user: {
    id: string
    email: string
    name: string | null
  }
  session: {
    id: string
    token: string
  }
  membership: { role: string } | null
}

// Fail-closed: only owner/manager count as management roles; anything else
// (including a missing membership) is treated as staff.
export function isManagerRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager'
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
  if (!cookieHeader) return null

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as ServerSession | null
    if (!data?.user || !data?.session) return null
    return data
  } catch {
    return null
  }
}

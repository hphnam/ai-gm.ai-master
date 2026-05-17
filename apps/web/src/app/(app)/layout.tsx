import type { ReactNode } from 'react'
import { requireAppAccess } from '@/lib/require-app-access'

export const dynamic = 'force-dynamic'

/// Single auth + venue gate for the app surface (chat, tasks, docs,
/// compliance, reports). Middleware does the instant cookie-only check at
/// the edge; this layout does the full session validation + zero-venues
/// punt to /welcome. Pages inside this group should contain no auth code.
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireAppAccess()
  return <>{children}</>
}

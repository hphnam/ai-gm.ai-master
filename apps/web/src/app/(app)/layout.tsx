import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeaderProvider } from '@/components/shell/page-header-provider'
import { requireAppAccess } from '@/lib/require-app-access'

export const dynamic = 'force-dynamic'

/// Single auth + venue gate for the app surface (chat, tasks, docs,
/// compliance, reports). Middleware does the instant cookie-only check at
/// the edge; this layout does the full session validation + zero-venues
/// punt to /welcome. Pages inside this group should contain no auth code.
///
/// AppShell (sidebar + realtime sockets + mobile tab bar) is mounted HERE so it
/// persists across in-group navigation — the shared websocket no longer tears
/// down and reconnects on every page change, and the sidebar stops re-mounting.
///
/// The `header` parallel slot (@header/**) renders the top bar ONCE, above the
/// scrollable content, so it never re-mounts on navigation. Static route titles
/// stream from their slot page; dynamic pages push title/actions up through
/// PageHeaderProvider via <SetPageHeader/>.
export default async function AppLayout({
  children,
  header,
}: {
  children: ReactNode
  header: ReactNode
}) {
  const session = await requireAppAccess()
  return (
    <AppShell initialUser={{ name: session.user.name, email: session.user.email }}>
      <PageHeaderProvider>
        {header}
        {children}
      </PageHeaderProvider>
    </AppShell>
  )
}

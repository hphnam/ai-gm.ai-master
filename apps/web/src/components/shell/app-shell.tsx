'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { useAppRealtime } from '@/lib/hooks/use-app-realtime'
import { useKbSocket } from '@/lib/hooks/use-kb-socket'
import { InboxProvider } from './inbox-provider'
import { InboxSheetHost } from './inbox-sheet-host'
import { MobileMoreSheet } from './mobile-more-sheet'
import { MobileTabBar } from './mobile-tab-bar'
import { MobileTopBar } from './mobile-top-bar'
import { PwaInstallBanner } from './pwa-install-banner'
import { Sidebar } from './sidebar'
import type { SidebarUserInfo } from './sidebar-user'

type ShellCtx = { openMobileSidebar: () => void; openMore: () => void }
const Ctx = createContext<ShellCtx | null>(null)

export function useAppShell(): ShellCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppShell must be used inside <AppShell>')
  return v
}

export function AppShell({
  children,
  initialUser,
}: {
  children: ReactNode
  // Server-resolved identity from the (app) layout, so the sidebar profile
  // paints on first render instead of popping in after a client session fetch.
  initialUser: SidebarUserInfo
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // Realtime listeners. All share one socket via acquireSocket() so we don't
  // multi-connect. Each hook subscribes to its domain's events and invalidates
  // the matching React Query keys — no polling anywhere in the app.
  useKbSocket()
  useAppRealtime()
  // Stable context value so useAppShell consumers (PageHeader) don't re-render
  // on every AppShell render — matters now the shell is the persistent layout.
  const ctxValue = useMemo(
    () => ({ openMobileSidebar: () => setMobileOpen(true), openMore: () => setMoreOpen(true) }),
    [],
  )
  return (
    <Ctx.Provider value={ctxValue}>
      <InboxProvider>
        <div className="flex h-dvh w-full bg-background">
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            initialUser={initialUser}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar initialUser={initialUser} onOpenMore={() => setMoreOpen(true)} />
            {children}
            <PwaInstallBanner />
            <MobileTabBar onOpenMore={() => setMoreOpen(true)} />
          </div>
        </div>
        <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} initialUser={initialUser} />
        <InboxSheetHost />
      </InboxProvider>
    </Ctx.Provider>
  )
}

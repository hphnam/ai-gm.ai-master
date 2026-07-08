'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { useAppRealtime } from '@/lib/hooks/use-app-realtime'
import { useKbSocket } from '@/lib/hooks/use-kb-socket'
import { InboxProvider } from './inbox-provider'
import { MobileTabBar } from './mobile-tab-bar'
import { PwaInstallBanner } from './pwa-install-banner'
import { Sidebar } from './sidebar'

type ShellCtx = { openMobileSidebar: () => void }
const Ctx = createContext<ShellCtx | null>(null)

export function useAppShell(): ShellCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppShell must be used inside <AppShell>')
  return v
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // Realtime listeners. All share one socket via acquireSocket() so we don't
  // multi-connect. Each hook subscribes to its domain's events and invalidates
  // the matching React Query keys — no polling anywhere in the app.
  useKbSocket()
  useAppRealtime()
  // Stable context value so useAppShell consumers (PageHeader) don't re-render
  // on every AppShell render — matters now the shell is the persistent layout.
  const ctxValue = useMemo(() => ({ openMobileSidebar: () => setMobileOpen(true) }), [])
  return (
    <Ctx.Provider value={ctxValue}>
      <InboxProvider>
        <div className="flex h-dvh w-full bg-background">
          <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            {children}
            <PwaInstallBanner />
            <MobileTabBar />
          </div>
        </div>
      </InboxProvider>
    </Ctx.Provider>
  )
}

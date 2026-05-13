'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'
import { useAppRealtime } from '@/lib/hooks/use-app-realtime'
import { useKbSocket } from '@/lib/hooks/use-kb-socket'
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
  return (
    <Ctx.Provider value={{ openMobileSidebar: () => setMobileOpen(true) }}>
      <div className="flex h-dvh w-full bg-background">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </Ctx.Provider>
  )
}

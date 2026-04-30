'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
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
  // One global KB socket per session. Pushes status flips into React Query
  // caches so we don't have to poll for live updates on the docs list.
  useKbSocket()
  return (
    <Ctx.Provider value={{ openMobileSidebar: () => setMobileOpen(true) }}>
      <div className="flex h-dvh w-full bg-background">
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </Ctx.Provider>
  )
}

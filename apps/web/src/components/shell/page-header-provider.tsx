'use client'

import { createContext, type ReactNode, use, useCallback, useEffect, useState } from 'react'

type HeaderConfig = { title: string | null; description?: string; actions: ReactNode }
type SetHeader = (config: HeaderConfig) => void

// Two contexts on purpose. The config context changes on every push and is read
// ONLY by the header view (in the @header slot), so its consumers re-render.
// The setter context is referentially stable and is the only thing <SetPageHeader>
// reads — so a push never re-renders <SetPageHeader> itself. That split is what
// keeps the render loop closed: a push re-renders the header view but NOT the
// content body, and the body's element ref is stable (it comes from the layout,
// which never re-renders), so React bails out of re-rendering it.
const ConfigContext = createContext<HeaderConfig>({ title: null, actions: null })
const SetContext = createContext<SetHeader>(() => {})

export function usePageHeaderConfig(): HeaderConfig {
  return use(ConfigContext)
}

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>({ title: null, actions: null })
  const set = useCallback<SetHeader>((next) => {
    setConfig(next)
  }, [])
  return (
    <SetContext.Provider value={set}>
      <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
    </SetContext.Provider>
  )
}

// Renders nothing. A content page mounts this to push its dynamic title/actions
// up to the persistent header. The effect has no dependency array so it re-runs
// on every render of THIS component — which only happens when the content body
// re-renders (its own state changed), i.e. exactly when the actions node may
// have changed. It can't loop: `set` is stable, and pushing config re-renders
// the header view (a ConfigContext consumer) but not this component (which only
// reads the stable SetContext) or the body.
export function SetPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  const set = use(SetContext)
  // No dependency array: re-push on every render of this component (which only
  // happens when the content body re-renders), so live actions stay current.
  useEffect(() => {
    set({ title, description, actions: actions ?? null })
  })
  return null
}

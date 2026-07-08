'use client'

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'

export type InboxFocus = { kind: 'alert'; id: string } | { kind: 'thread'; otherUserId: string }

type InboxCtx = {
  open: boolean
  focus: InboxFocus | null
  openInbox: (focus?: InboxFocus) => void
  setOpen: (open: boolean) => void
  clearFocus: () => void
}

const Ctx = createContext<InboxCtx | null>(null)

export function useInbox(): InboxCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInbox must be used inside <InboxProvider>')
  return v
}

/// Owns the notifications sheet's open/focus state. Lifted out of the bell so
/// deep-link pages (/notes/[id]) can open the inbox on a specific note or
/// conversation thread from anywhere under the app shell.
export function InboxProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false)
  const [focus, setFocus] = useState<InboxFocus | null>(null)

  const openInbox = useCallback((f?: InboxFocus) => {
    if (f) setFocus(f)
    setOpenState(true)
  }, [])

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    if (!next) {
      // Clear after the sheet's exit animation so the focused row doesn't
      // visibly lose its highlight mid-close.
      setTimeout(() => setFocus(null), 200)
    }
  }, [])

  const clearFocus = useCallback(() => setFocus(null), [])

  const value = useMemo(
    () => ({ open, focus, openInbox, setOpen, clearFocus }),
    [open, focus, openInbox, setOpen, clearFocus],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

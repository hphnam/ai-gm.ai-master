'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { AlertsView } from './alerts-view'
import { ConversationsView } from './conversations-view'

type SidebarTab = 'conversations' | 'alerts'

export function NotificationsSidebar({
  open,
  onOpenChange,
  focusId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  focusId?: string | null
}) {
  // Default to Conversations — it's the day-to-day surface. Alerts is the
  // "your scheduled report / compliance reminder" backwater.
  const [tab, setTab] = useState<SidebarTab>('conversations')

  // Reset to Conversations whenever the sheet closes so the next open lands
  // on the primary tab rather than the previous Alerts state.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setTab('conversations'), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // A focusId (set by clicking "View" on a toast) always points at an alert
  // notification — chat events don't surface toasts. Switch to Alerts when
  // a focusId arrives so the focused row is actually visible.
  useEffect(() => {
    if (open && focusId) setTab('alerts')
  }, [open, focusId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="gap-0 p-0 sm:max-w-[440px]"
        side="right"
        hideCloseButton
        onOpenAutoFocus={(e) => {
          // Skip auto-focus so the search input doesn't pop a mobile keyboard
          // when the user just wants to glance at the list.
          e.preventDefault()
        }}
      >
        <SheetTitle className="sr-only">Inbox</SheetTitle>
        <SidebarHeader />
        <SidebarTabs tab={tab} onTabChange={setTab} />
        {tab === 'conversations' ? <ConversationsView /> : <AlertsView focusId={focusId ?? null} />}
      </SheetContent>
    </Sheet>
  )
}

function SidebarHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className="font-semibold text-base text-foreground">Inbox</h2>
      <SheetClose
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden />
      </SheetClose>
    </div>
  )
}

function SidebarTabs({
  tab,
  onTabChange,
}: {
  tab: SidebarTab
  onTabChange: (t: SidebarTab) => void
}) {
  return (
    <div
      className="flex items-center gap-0 border-b border-border px-4"
      role="tablist"
      aria-label="Conversations or alerts"
    >
      <Tab
        active={tab === 'conversations'}
        onClick={() => onTabChange('conversations')}
        label="Conversations"
      />
      <Tab active={tab === 'alerts'} onClick={() => onTabChange('alerts')} label="Alerts" />
    </div>
  )
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative -mb-px cursor-pointer border-b-2 px-3 py-2 font-medium text-xs transition-colors',
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-foreground/55 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

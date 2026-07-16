'use client'

import { useInbox } from './inbox-provider'
import { NotificationsSidebar } from './notifications-sidebar'

/// Single mount of the inbox sheet, driven by InboxProvider state, rendered at
/// the shell root so it's available on every screen and every role (mobile
/// included) — deep links (/notes/:id), the bell, and the Alerts screen's
/// "Messages" button all open this one sheet.
export function InboxSheetHost() {
  const { open, focus, setOpen } = useInbox()
  return <NotificationsSidebar open={open} onOpenChange={setOpen} focus={focus} />
}

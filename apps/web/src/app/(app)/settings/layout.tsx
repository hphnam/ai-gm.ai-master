import { SettingsShell } from '@/components/shell/settings-shell'
import { getServerSession, isManagerRole } from '@/lib/server-session'

// Auth + venue gate is handled by the (app) layout (requireAppAccess); the
// persistent AppShell is provided there too. This layout only adds the
// settings tab chrome — and resolves the caller's role server-side so the
// manager-only nav items render correctly on first paint instead of popping in
// after a client session fetch.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  const isManager = isManagerRole(session?.membership?.role)
  return <SettingsShell isManager={isManager}>{children}</SettingsShell>
}

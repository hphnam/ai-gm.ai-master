import { SettingsShell } from '@/components/shell/settings-shell'

// Auth + venue gate is handled by the (app) layout (requireAppAccess); the
// persistent AppShell is provided there too. This layout only adds the
// settings tab chrome.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>
}

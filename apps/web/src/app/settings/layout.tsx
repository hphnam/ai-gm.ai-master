import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { SettingsShell } from '@/components/shell/settings-shell'
import { getServerSession } from '@/lib/server-session'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) {
    redirect('/auth/sign-in?redirect=/settings/organization')
  }
  return (
    <AppShell>
      <SettingsShell>{children}</SettingsShell>
    </AppShell>
  )
}

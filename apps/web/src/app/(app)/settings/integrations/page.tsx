import { HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { IntegrationsBody } from '@/components/integrations/integrations-body'
import { SettingsPageHeader } from '@/components/ui/setting-card'
import { integrationsListQuery } from '@/lib/queries/keys'
import { dehydrateSpecs } from '@/lib/server-prefetch'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function IntegrationsSettingsPage() {
  const session = await getServerSession()
  if (!isManagerRole(session?.membership?.role)) redirect('/settings/phone')

  const state = await dehydrateSpecs([integrationsListQuery])
  return (
    <div>
      <SettingsPageHeader
        title="Integrations"
        description="Connect your POS and other tools so GM can read live numbers."
      />
      <HydrationBoundary state={state}>
        <IntegrationsBody />
      </HydrationBoundary>
    </div>
  )
}

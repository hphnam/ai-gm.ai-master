import { HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { GeneralSettingsBody } from '@/components/organization/general-settings-body'
import { orgProfileQuery } from '@/lib/queries/keys'
import { dehydrateSpecs } from '@/lib/server-prefetch'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function GeneralSettingsPage() {
  const session = await getServerSession()
  if (!isManagerRole(session?.membership?.role)) redirect('/settings/phone')
  const state = await dehydrateSpecs([orgProfileQuery])
  return (
    <HydrationBoundary state={state}>
      <GeneralSettingsBody />
    </HydrationBoundary>
  )
}

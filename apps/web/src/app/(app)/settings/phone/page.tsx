import { HydrationBoundary } from '@tanstack/react-query'
import { PhoneStatusCard } from '@/components/phone/phone-status-card'
import { SettingsPageHeader } from '@/components/ui/setting-card'
import { phoneStatusQuery } from '@/lib/queries/keys'
import { dehydrateSpecs } from '@/lib/server-prefetch'

export default async function PhonePage() {
  const state = await dehydrateSpecs([phoneStatusQuery])
  return (
    <div>
      <SettingsPageHeader
        title="Phone"
        description="Link your mobile number to use GM over WhatsApp."
      />
      <HydrationBoundary state={state}>
        <PhoneStatusCard />
      </HydrationBoundary>
    </div>
  )
}

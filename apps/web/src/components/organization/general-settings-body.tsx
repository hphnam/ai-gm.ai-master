'use client'

import { SettingsPageHeader } from '@/components/ui/setting-card'
import { BusinessProfileForm } from './business-profile-form'

export function GeneralSettingsBody() {
  return (
    <div>
      <SettingsPageHeader
        title="General"
        description="Your organisation's profile — this shapes how GM answers."
      />
      <BusinessProfileForm />
    </div>
  )
}

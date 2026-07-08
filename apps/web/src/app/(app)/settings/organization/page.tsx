import { redirect } from 'next/navigation'
import { OrganizationSettingsBody } from '@/components/invitations/organization-settings-body'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function OrganizationSettingsPage() {
  const session = await getServerSession()
  if (!isManagerRole(session?.membership?.role)) redirect('/settings/phone')

  return (
    <section aria-labelledby="org-settings-title">
      <h2 id="org-settings-title" className="sr-only">
        Organisation
      </h2>
      <OrganizationSettingsBody />
    </section>
  )
}

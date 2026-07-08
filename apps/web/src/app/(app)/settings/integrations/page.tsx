import { redirect } from 'next/navigation'
import { IntegrationsBody } from '@/components/integrations/integrations-body'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function IntegrationsSettingsPage() {
  const session = await getServerSession()
  if (!isManagerRole(session?.membership?.role)) redirect('/settings/phone')

  return (
    <section aria-labelledby="integrations-settings-title">
      <h2 id="integrations-settings-title" className="sr-only">
        Integrations
      </h2>
      <IntegrationsBody />
    </section>
  )
}

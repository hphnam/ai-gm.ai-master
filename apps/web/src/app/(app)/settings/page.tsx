import { redirect } from 'next/navigation'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function SettingsIndexPage() {
  const session = await getServerSession()
  redirect(isManagerRole(session?.membership?.role) ? '/settings/organization' : '/settings/phone')
}

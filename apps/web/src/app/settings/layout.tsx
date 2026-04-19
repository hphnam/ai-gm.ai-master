import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserMenu } from '@/components/auth/user-menu'
import { getServerSession } from '@/lib/server-session'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) {
    redirect('/auth/sign-in?redirect=/settings/organization')
  }
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/chat" className="text-sm font-semibold">
          GM AI
        </Link>
        <UserMenu />
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  )
}

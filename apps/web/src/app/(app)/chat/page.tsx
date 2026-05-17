import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { ChatBody } from './chat-body'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/chat')
  return <ChatBody />
}

import { redirect } from 'next/navigation'
import { getServerVenues } from '@/lib/server-venues'
import { ChatBody } from './chat-body'

export const dynamic = 'force-dynamic'

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; conv?: string }>
}) {
  const { venue, conv } = await searchParams
  // Single-venue orgs skip venue selection entirely. Resolve it on the SERVER
  // so the picker never flashes before a client redirect. Multi-venue + the
  // transient-fetch-failure case fall through to the client (ChatInner) picker.
  if (!venue && !conv) {
    const venues = await getServerVenues()
    if (venues && venues.length === 1) redirect(`/chat?venue=${venues[0].id}`)
  }
  return <ChatBody />
}

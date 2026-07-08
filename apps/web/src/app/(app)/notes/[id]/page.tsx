import { NoteRedirectBody } from './note-redirect-body'

export const dynamic = 'force-dynamic'

/// Canonical deep-link URL for a single note — used by the email digest.
/// Resolves the note, opens the inbox sheet on it, and settles on /chat.
export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NoteRedirectBody id={id} />
}

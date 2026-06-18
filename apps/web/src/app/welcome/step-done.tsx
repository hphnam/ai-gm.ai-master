'use client'

import { ArrowRight, MessageSquarePlus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useVenue } from '@/lib/hooks/use-venues'
import { markMinted } from '@/lib/minted-conv-ids'
import { StepShell } from './step-shell'

const FALLBACK_PROMPTS = [
  'What should I check before opening today?',
  'Who do I call for an urgent plumber?',
  'Walk me through the closing procedure.',
] as const

function buildPrompts(
  profile: {
    openingHours?: string
    layoutNotes?: string
    fireEscapes?: string[]
    alarmPolicy?: string
    deliveryNotes?: string
  } | null,
): readonly string[] {
  if (!profile) return FALLBACK_PROMPTS

  const prompts: string[] = []
  if (profile.openingHours) prompts.push('What time do we open on Friday?')
  if (profile.fireEscapes && profile.fireEscapes.length > 0)
    prompts.push('Where are the fire escapes?')
  if (profile.layoutNotes) prompts.push('Where do I find the cellar trap?')
  if (profile.alarmPolicy) prompts.push('What do I do if the alarm goes off?')
  if (profile.deliveryNotes) prompts.push('Where do suppliers drop off?')
  prompts.push('What should I check before opening today?')

  return prompts.slice(0, 3)
}

export function StepDone({ venueId }: { venueId: string }) {
  const router = useRouter()
  const { data: venue } = useVenue(venueId)

  const prompts = useMemo(() => buildPrompts(venue?.profile ?? null), [venue?.profile])

  const startChat = (firstMessage?: string) => {
    const conv =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`
    markMinted(conv)
    // Chat composer reads `chat:prefill` from sessionStorage on mount
    // (apps/web/src/app/chat/chat-body.tsx) and clears it after — so a
    // refresh doesn't replay the prompt.
    if (firstMessage && typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('chat:prefill', firstMessage)
      } catch {
        /* sessionStorage can fail in private mode; the chat still loads */
      }
    }
    router.push(`/chat?venue=${venueId}&conv=${conv}`)
  }

  return (
    <StepShell
      eyebrow="You&rsquo;re set"
      title={
        <>
          {venue?.name ?? 'Your venue'} is live.
          <br />
          <span className="text-muted-foreground">Try asking your AI GM&hellip;</span>
        </>
      }
      intro="Pick a prompt to start, or jump straight in."
    >
      <div className="space-y-6">
        <ul className="space-y-2">
          {prompts.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => startChat(p)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm shadow-sm transition-colors hover:border-foreground/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sparkles
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{p}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
          <Link
            href="/docs"
            className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Add more files later
          </Link>
          <Button type="button" onClick={() => startChat()}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Start chatting
          </Button>
        </div>
      </div>
    </StepShell>
  )
}

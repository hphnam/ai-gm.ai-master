'use client'

import { useMemo } from 'react'
import type { ConversationResponseDto as ConversationResponse } from '@/generated/api'

// Wave-C auto-verify state, indexed by assistant messageId. Drives the small
// "verified" / "couldn't verify" badge under each answer.
export type VerifyEntry = {
  status: 'pending' | 'clean' | 'issues' | 'skipped' | 'error'
  issueCount: number | null
}

/// Derives the read-only, history-backed lookups a thread needs from the
/// persisted conversation: the latest assistant turn's follow-up pills, and the
/// per-message feedback + verify maps that seed the thumbs buttons and verify
/// badges so they survive a refresh. Pure derivation — keeps ChatCore focused
/// on live streaming state.
export function useConversationDerivedState(
  historyMessages: ConversationResponse['messages'] | undefined,
  status: string,
) {
  const lastAssistantFollowUps = useMemo<string[]>(() => {
    if (!historyMessages) return []
    if (status !== 'ready') return []
    for (let i = historyMessages.length - 1; i >= 0; i--) {
      const m = historyMessages[i]
      if (m.role === 'assistant') return m.followUps ?? []
    }
    return []
  }, [historyMessages, status])

  // Persisted feedback indexed by assistant messageId — seeds the thumbs
  // buttons so a thumbs-up survives a refresh.
  const feedbackByMessageId = useMemo<Record<string, 'up' | 'down' | 'regenerate'>>(() => {
    if (!historyMessages) return {}
    const map: Record<string, 'up' | 'down' | 'regenerate'> = {}
    for (const m of historyMessages) {
      if (m.role === 'assistant' && m.feedbackKind) {
        map[m.id] = m.feedbackKind
      }
    }
    return map
  }, [historyMessages])

  const verifyByMessageId = useMemo<Record<string, VerifyEntry>>(() => {
    if (!historyMessages) return {}
    const map: Record<string, VerifyEntry> = {}
    for (const m of historyMessages) {
      if (m.role === 'assistant' && m.verifyStatus) {
        map[m.id] = {
          status: m.verifyStatus,
          issueCount: m.verifyIssueCount ?? null,
        }
      }
    }
    return map
  }, [historyMessages])

  return { lastAssistantFollowUps, feedbackByMessageId, verifyByMessageId }
}

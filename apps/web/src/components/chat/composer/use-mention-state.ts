'use client'

import { useCallback, useEffect, useState } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import type { Recipient } from '@/lib/hooks/use-notifications'
import {
  type ChipMention,
  detectMentionTrigger,
  insertMention,
  pruneMissingMentions,
} from '../mention-picker'

type MentionSetter = UseFormSetValue<{ userMessage: string }>

export function useMentionState({
  value,
  setValue,
  textareaRef,
}: {
  value: string
  setValue: MentionSetter
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  // @-mention picker — opens whenever the caret sits inside an active "@..."
  // fragment in the textarea. Trigger detection runs on every keystroke + on
  // every selection change; the picker reads the same `mentionQuery` to
  // render itself. The recipientsList query is enabled lazily by the picker
  // so we don't fan out a fetch until someone actually types '@'.
  const [mentionState, setMentionState] = useState<{
    query: string
    triggerStart: number
  } | null>(null)
  // Picker-inserted chips. Visible text holds `@Name`; we keep the userId
  // mapping here and reattach it at submit time via serializeMentions. A
  // value-change effect drops entries whose `@Name` no longer appears in the
  // text (user backspaced the chip) so this list never grows unbounded.
  const [chipMentions, setChipMentions] = useState<ChipMention[]>([])
  const recomputeMention = useCallback(() => {
    const el = textareaRef.current
    if (!el) {
      setMentionState(null)
      return
    }
    const caret = el.selectionStart ?? 0
    const trigger = detectMentionTrigger(el.value, caret)
    setMentionState(trigger)
  }, [textareaRef])
  const onMentionPick = useCallback(
    (member: Recipient) => {
      const el = textareaRef.current
      if (!el || !mentionState) return
      const caret = el.selectionStart ?? mentionState.triggerStart
      const {
        value: nextValue,
        nextCaret,
        mention,
      } = insertMention(el.value, mentionState.triggerStart, caret, member)
      setValue('userMessage', nextValue, { shouldDirty: true })
      setChipMentions((prev) => [...prev, mention])
      setMentionState(null)
      // Restore caret position on the next frame — RHF's controlled-ish flow
      // re-renders the textarea, so we can't set selection synchronously.
      requestAnimationFrame(() => {
        const elNow = textareaRef.current
        if (!elNow) return
        elNow.focus()
        elNow.setSelectionRange(nextCaret, nextCaret)
      })
    },
    [mentionState, setValue, textareaRef],
  )
  // Cover the voice-transcription path: `setValue` doesn't fire DOM input
  // events, so onInput-driven recomputeMention never sees voice-dictated
  // "@...". Re-run trigger detection whenever the watched form value
  // changes — picks up programmatic setValue calls from anywhere. Same
  // effect prunes the chipMentions list so stale entries (user deleted the
  // chip) don't leak userIds at submit time.
  useEffect(() => {
    recomputeMention()
    setChipMentions((prev) => {
      const pruned = pruneMissingMentions(value ?? '', prev)
      return pruned.length === prev.length ? prev : pruned
    })
  }, [value, recomputeMention])

  return {
    mentionState,
    setMentionState,
    chipMentions,
    setChipMentions,
    recomputeMention,
    onMentionPick,
  }
}

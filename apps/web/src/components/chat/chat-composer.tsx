'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUp, ImagePlus, Loader2, Mic, Square, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { IMAGE_ALLOWED_MIME, useImageAttachment } from './composer/use-image-attachment'
import { useMentionState } from './composer/use-mention-state'
import { useVoiceInput } from './composer/use-voice-input'
import { MentionPicker, serializeMentions } from './mention-picker'

const ComposerSchema = z.object({
  // Allow empty when an image is attached; we add a stand-in question on send.
  userMessage: z.string().trim().max(8000, 'Message too long (max 8000 characters)'),
})
type ComposerInput = z.infer<typeof ComposerSchema>

type Props = {
  onSubmit: (userMessage: string) => Promise<void>
  /// Phase G1 — when an image is attached, the parent uploads via the
  /// non-streaming /chat/messages/with-image endpoint. Pure-text messages
  /// continue through the streaming useChat path.
  onSubmitWithImage?: (userMessage: string, file: File) => Promise<void>
  isPending: boolean
  /// When defined, the assistant is mid-stream and pressing the send button
  /// aborts the in-flight turn instead of being disabled.
  onStop?: () => void
  initialValue?: string
  disabled?: boolean
  disabledReason?: string
}

export function ChatComposer({
  onSubmit,
  onSubmitWithImage,
  isPending,
  onStop,
  initialValue,
  disabled = false,
  disabledReason,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<ComposerInput>({
    resolver: zodResolver(ComposerSchema),
    defaultValues: { userMessage: '' },
  })

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const { ref: formRef, onBlur: rhfOnBlur, ...rest } = register('userMessage')
  const value = watch('userMessage')

  const {
    fileInputRef,
    attachedImage,
    setAttachedImage,
    imagePreview,
    handlePickImage,
    handleFileChange,
    clearImage,
  } = useImageAttachment()

  const {
    mentionState,
    setMentionState,
    chipMentions,
    setChipMentions,
    recomputeMention,
    onMentionPick,
  } = useMentionState({ value, setValue, textareaRef })

  const {
    voiceSupported,
    voiceListening,
    voiceConsentOpen,
    setVoiceConsentOpen,
    toggleVoice,
    grantConsent,
  } = useVoiceInput({ value, setValue, disabled, isPending })

  useEffect(() => {
    if (initialValue) setValue('userMessage', initialValue)
    setFocus('userMessage')
  }, [initialValue, setValue, setFocus])

  // Auto-grow the textarea between a roomy two-line floor and a max height,
  // then scroll internally. The floor gives the input generous space to type
  // into before it needs to grow (mobile-first), matching the two-line feel.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const min = 52
    const max = 220
    el.style.height = `${Math.min(Math.max(el.scrollHeight, min), max)}px`
  }, [value])

  const submit = handleSubmit(async (data) => {
    const text = data.userMessage
    const image = attachedImage
    if (!image && text.trim().length === 0) return // need at least one
    if (image && !onSubmitWithImage) {
      toast.error('Image upload is unavailable here.')
      return
    }
    // Reattach userIds to mention chips before sending — the textarea only
    // ever holds `@Name`, but the agent's tool dispatchers expect the full
    // `@[Name](userId)` wire format so it can pass canonical assigneeUserId /
    // recipientUserId without a disambiguation round-trip.
    const sendText = serializeMentions(text, chipMentions)
    // Clear + refocus synchronously so pressing enter feels instant; the send
    // happens in the background. Any error is surfaced by the parent via toast.
    reset({ userMessage: '' })
    setAttachedImage(null)
    setChipMentions([])
    setFocus('userMessage')
    if (image && onSubmitWithImage) {
      onSubmitWithImage(sendText, image).catch(() => undefined)
    } else {
      onSubmit(sendText).catch(() => undefined)
    }
  })

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // When the mention picker is open it owns Enter / Tab / Escape / arrows.
    // The picker's document-level keydown listener will preventDefault and
    // handle the keystroke before this React handler runs — but we ALSO need
    // to skip the submit branch so a closed picker that just opened on this
    // very Enter doesn't double-fire.
    if (mentionState && (e.key === 'Enter' || e.key === 'Tab')) {
      // Picker takes priority; don't submit.
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const hasText = value?.trim().length > 0
  const hasImage = !!attachedImage
  const canSend = !isPending && !disabled && (hasText || hasImage)
  const canStop = isPending && typeof onStop === 'function'
  // Lock the textarea while voice is active — without it, anything the user
  // types is silently overwritten on the next interim-result tick because
  // transcriptBaseRef was snapshotted when listening started.
  const inputDisabled = isPending || disabled || voiceListening

  return (
    <form onSubmit={submit} className="w-full">
      <label htmlFor="composer-input" className="sr-only">
        Message
      </label>
      <div
        className={cn(
          'relative flex flex-col gap-1 rounded-[18px] border border-[var(--hairline)] bg-[#fcfaf3]',
          'px-2 py-2 shadow-[0_2px_10px_-4px_rgba(32,26,18,0.12)] transition-colors duration-150',
          'focus-within:border-[var(--brass)]/45 focus-within:ring-2 focus-within:ring-[var(--brass)]/10',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
        <textarea
          id="composer-input"
          rows={2}
          aria-invalid={Boolean(errors.userMessage)}
          placeholder={disabled && disabledReason ? disabledReason : 'Ask about your venue…'}
          disabled={inputDisabled}
          onKeyDown={onKeyDown}
          // Recompute the mention trigger on every input + selection change.
          // RHF owns onChange via {...rest}; we layer onInput / onSelect /
          // onClick on top — React fires onInput AFTER RHF's onChange so the
          // caret value is up-to-date here. Voice-driven setValue() still
          // works because the effect on `value` below covers that path.
          onInput={recomputeMention}
          onSelect={recomputeMention}
          onClick={recomputeMention}
          {...rest}
          // Wrap RHF's onBlur so we close the picker on focus loss without
          // losing the validation hook. Spread order matters: this onBlur
          // must come AFTER {...rest} to override RHF's.
          onBlur={(e) => {
            setMentionState(null)
            rhfOnBlur(e)
          }}
          ref={(el) => {
            formRef(el)
            textareaRef.current = el
          }}
          // Full width — the toolbar lives on its own row below, so the text
          // gets the entire composer width to breathe (mobile-first). Auto-grow
          // (effect above) owns the height between a two-line floor and the cap.
          className={cn(
            'w-full resize-none bg-transparent px-2 pt-1 text-[15px] leading-6',
            'placeholder:text-muted-foreground/70 focus:outline-none',
            'min-h-[52px] max-h-[220px]',
          )}
        />
        <div className="flex items-center gap-1">
          {onSubmitWithImage ? (
            <button
              type="button"
              onClick={handlePickImage}
              disabled={inputDisabled}
              aria-label="Attach image"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:opacity-50"
            >
              <ImagePlus className="h-[18px] w-[18px]" aria-hidden />
            </button>
          ) : null}
          {voiceSupported ? (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={disabled || isPending}
              aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={voiceListening}
              title={voiceListening ? 'Listening — tap to stop' : 'Voice input'}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-50',
                voiceListening
                  ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Mic
                className={cn('h-[18px] w-[18px]', voiceListening && 'animate-pulse')}
                aria-hidden
              />
            </button>
          ) : null}
          {canStop ? (
            <button
              type="button"
              onClick={() => onStop?.()}
              aria-label="Stop generating"
              title="Stop"
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground transition-all hover:brightness-110 active:scale-95"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label={isPending ? 'Sending' : 'Send'}
              className={cn(
                'ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150',
                canSend
                  ? 'bg-[var(--brass)] text-[var(--cream-hi)] shadow-[0_2px_0_var(--brass-shadow)] hover:bg-[var(--brass-shadow)] active:translate-y-px cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
      {imagePreview && attachedImage ? (
        <div className="mt-2 inline-flex items-center gap-2 rounded-md border bg-muted/40 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Attached" className="h-12 w-12 rounded object-cover" />
          <span className="max-w-[180px] truncate text-xs text-muted-foreground">
            {attachedImage.name}
          </span>
          <button
            type="button"
            onClick={clearImage}
            aria-label="Remove image"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {errors.userMessage ? (
        <div className="mt-1.5 px-2">
          <span className="text-[11px] text-destructive" role="alert">
            {errors.userMessage.message}
          </span>
        </div>
      ) : null}
      <Dialog open={voiceConsentOpen} onOpenChange={setVoiceConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enable voice input?</DialogTitle>
            <DialogDescription className="text-left">
              In Chromium-based browsers (Chrome, Edge), voice input streams microphone audio to
              Google's transcription service. Audio doesn't pass through our servers. Don't use
              voice for sensitive customer details, supplier prices, payment data, or incident
              specifics — type those instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setVoiceConsentOpen(false)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={grantConsent}
              className="rounded-md bg-brand px-3 py-1.5 text-sm text-brand-foreground hover:brightness-110"
            >
              Enable voice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MentionPicker
        anchor={textareaRef.current}
        query={mentionState ? mentionState.query : null}
        onSelect={onMentionPick}
        onClose={() => setMentionState(null)}
      />
    </form>
  )
}

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

  // Auto-grow textarea up to a max height, then scroll internally.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const max = 220
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
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
          'relative flex items-end gap-2 rounded-2xl border border-border bg-background',
          'px-3 py-2.5 shadow-sm transition-all',
          'focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-foreground/10',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
        {onSubmitWithImage ? (
          <button
            type="button"
            onClick={handlePickImage}
            disabled={inputDisabled}
            aria-label="Attach image"
            className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
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
              'flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full transition-colors disabled:opacity-50',
              voiceListening
                ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Mic className={cn('h-4 w-4', voiceListening && 'animate-pulse')} aria-hidden />
          </button>
        ) : null}
        <textarea
          id="composer-input"
          rows={1}
          aria-invalid={Boolean(errors.userMessage)}
          placeholder={
            disabled && disabledReason ? disabledReason : 'Ask about stock, ordering, SOPs…'
          }
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
          className={cn(
            'flex-1 resize-none self-center bg-transparent text-[15px] leading-6',
            'placeholder:text-muted-foreground/70 focus:outline-none',
            // min-h matches the h-8 (32px) of the side buttons; py-1 centres
            // the single-line text vertically in that 32px box so its baseline
            // sits on the same line as the icon centres. As the textarea grows
            // multi-line it expands downward and the parent's items-end keeps
            // the buttons aligned to the new bottom edge.
            'min-h-8 max-h-[220px] py-1',
          )}
        />
        {canStop ? (
          <button
            type="button"
            onClick={() => onStop?.()}
            aria-label="Stop generating"
            title="Stop"
            className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full bg-destructive text-destructive-foreground transition-all hover:brightness-110"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label={isPending ? 'Sending' : 'Send'}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full transition-all',
              canSend
                ? 'bg-brand text-brand-foreground hover:brightness-110 cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
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

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUp, ImagePlus, Loader2, Mic, Square, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const VOICE_CONSENT_KEY = 'gm.voice.consent.v1'

const ComposerSchema = z.object({
  // Allow empty when an image is attached; we add a stand-in question on send.
  userMessage: z.string().trim().max(8000, 'Message too long (max 8000 characters)'),
})
type ComposerInput = z.infer<typeof ComposerSchema>

const IMAGE_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const IMAGE_MAX_BYTES = 10 * 1024 * 1024

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

// Web Speech API typing — DOM lib doesn't expose SpeechRecognition globally
// in every TS setup, so we declare just what we need.
type SpeechRecognitionLike = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [attachedImage, setAttachedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'unsupported'>('idle')
  const [voiceConsentOpen, setVoiceConsentOpen] = useState(false)
  const [voiceConsentGranted, setVoiceConsentGranted] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptBaseRef = useRef('')

  // Read prior consent on mount. Stored locally per browser/device, not synced
  // server-side — this is a one-time UX nudge, not auth.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setVoiceConsentGranted(window.localStorage.getItem(VOICE_CONSENT_KEY) === 'granted')
    } catch {
      // localStorage blocked (private mode) — treat as un-granted; user will be re-asked.
    }
  }, [])
  const { ref: formRef, ...rest } = register('userMessage')
  const value = watch('userMessage')

  // Detect Web Speech API support once on mount. SSR-safe: window is gated.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition
    if (!Ctor) {
      setVoiceState('unsupported')
      return
    }
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-GB' : 'en-GB'
    rec.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? ''
      }
      const combined = `${transcriptBaseRef.current}${transcript}`.trimStart()
      setValue('userMessage', combined, { shouldDirty: true })
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error('Microphone permission denied')
      } else if (event.error === 'no-speech') {
        // benign — user didn't speak; quietly end
      } else {
        toast.error(`Voice input error (${event.error})`)
      }
      setVoiceState('idle')
    }
    rec.onend = () => setVoiceState('idle')
    recognitionRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        // ignore abort errors on teardown
      }
      recognitionRef.current = null
    }
  }, [setValue])

  const startListening = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    transcriptBaseRef.current = value ? `${value.trimEnd()} ` : ''
    try {
      rec.start()
      setVoiceState('listening')
    } catch {
      try {
        rec.abort()
      } catch {
        // best-effort
      }
      setVoiceState('idle')
    }
  }, [value])

  const grantConsent = useCallback(() => {
    try {
      window.localStorage.setItem(VOICE_CONSENT_KEY, 'granted')
    } catch {
      // best-effort persistence
    }
    setVoiceConsentGranted(true)
    setVoiceConsentOpen(false)
    startListening()
  }, [startListening])

  const toggleVoice = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    if (voiceState === 'listening') {
      rec.stop()
      setVoiceState('idle')
      return
    }
    if (!voiceConsentGranted) {
      setVoiceConsentOpen(true)
      return
    }
    startListening()
  }, [voiceState, voiceConsentGranted, startListening])

  // Stop listening if the parent disables the composer (venue switch,
  // conversation flip to read-only, etc.) or while a turn is in flight.
  // Without this the mic keeps recording into a textarea the user can no
  // longer send from.
  useEffect(() => {
    if ((disabled || isPending) && voiceState === 'listening') {
      recognitionRef.current?.stop()
    }
  }, [disabled, isPending, voiceState])

  useEffect(() => {
    if (!attachedImage) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(attachedImage)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [attachedImage])

  const handlePickImage = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!IMAGE_ALLOWED_MIME.includes(file.type)) {
      toast.error('Image must be JPEG, PNG, WebP or GIF')
      return
    }
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error('Image too large (max 10MB)')
      return
    }
    setAttachedImage(file)
  }

  const clearImage = () => setAttachedImage(null)

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
    // Clear + refocus synchronously so pressing enter feels instant; the send
    // happens in the background. Any error is surfaced by the parent via toast.
    reset({ userMessage: '' })
    setAttachedImage(null)
    setFocus('userMessage')
    if (image && onSubmitWithImage) {
      onSubmitWithImage(text, image).catch(() => undefined)
    } else {
      onSubmit(text).catch(() => undefined)
    }
  })

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const hasText = value?.trim().length > 0
  const hasImage = !!attachedImage
  const canSend = !isPending && !disabled && (hasText || hasImage)
  const canStop = isPending && typeof onStop === 'function'
  const voiceSupported = voiceState !== 'unsupported'
  const voiceListening = voiceState === 'listening'
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
          'focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/15',
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
          aria-describedby="composer-hint"
          aria-invalid={Boolean(errors.userMessage)}
          placeholder={
            disabled && disabledReason ? disabledReason : 'Ask about stock, ordering, SOPs…'
          }
          disabled={inputDisabled}
          onKeyDown={onKeyDown}
          {...rest}
          ref={(el) => {
            formRef(el)
            textareaRef.current = el
          }}
          className={cn(
            'flex-1 resize-none bg-transparent text-[15px] leading-6',
            'placeholder:text-muted-foreground/70 focus:outline-none',
            'min-h-[24px] max-h-[220px]',
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
      <div className="mt-1.5 flex items-center justify-between gap-3 px-2">
        <span id="composer-hint" className="text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for newline
          {onSubmitWithImage ? ' · attach a photo for visual help' : ''}
        </span>
        {errors.userMessage ? (
          <span className="text-[11px] text-destructive" role="alert">
            {errors.userMessage.message}
          </span>
        ) : null}
      </div>
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
    </form>
  )
}

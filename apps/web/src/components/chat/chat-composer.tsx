'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUp, ImagePlus, Loader2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { cn } from '@/lib/utils'

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
  initialValue?: string
  disabled?: boolean
  disabledReason?: string
}

export function ChatComposer({
  onSubmit,
  onSubmitWithImage,
  isPending,
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
  const { ref: formRef, ...rest } = register('userMessage')
  const value = watch('userMessage')

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
  const inputDisabled = isPending || disabled

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
        <button
          type="submit"
          disabled={!canSend}
          aria-label={isPending ? 'Sending' : 'Send'}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
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
    </form>
  )
}

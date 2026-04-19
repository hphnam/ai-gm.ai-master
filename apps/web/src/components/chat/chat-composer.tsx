'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const ComposerSchema = z.object({
  userMessage: z
    .string()
    .trim()
    .min(1, 'Message required')
    .max(8000, 'Message too long (max 8000 characters)'),
})
type ComposerInput = z.infer<typeof ComposerSchema>

type Props = {
  onSubmit: (userMessage: string) => Promise<void>
  isPending: boolean
  initialValue?: string
}

export function ChatComposer({ onSubmit, isPending, initialValue }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<ComposerInput>({
    resolver: zodResolver(ComposerSchema),
    defaultValues: { userMessage: '' },
  })

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { ref: formRef, ...rest } = register('userMessage')

  useEffect(() => {
    if (initialValue) setValue('userMessage', initialValue)
    setFocus('userMessage')
  }, [initialValue, setValue, setFocus])

  const submit = handleSubmit(async (data) => {
    await onSubmit(data.userMessage)
    reset({ userMessage: '' })
    setFocus('userMessage')
  })

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="composer-input" className="sr-only">
        Message
      </label>
      <Textarea
        id="composer-input"
        rows={3}
        aria-describedby="composer-hint"
        aria-invalid={Boolean(errors.userMessage)}
        placeholder="Ask about stock, ordering, SOPs…"
        disabled={isPending}
        onKeyDown={onKeyDown}
        {...rest}
        ref={(el) => {
          formRef(el)
          textareaRef.current = el
        }}
      />
      <div className="flex items-center justify-between">
        <span id="composer-hint" className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for newline.
        </span>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {errors.userMessage ? (
        <div className="text-xs text-destructive" role="alert">
          {errors.userMessage.message}
        </div>
      ) : null}
    </form>
  )
}

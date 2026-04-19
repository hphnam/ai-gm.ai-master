'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { CreateDocRequestSchema, type CreateDocRequest } from '@gm-ai/types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useVenues } from '@/lib/hooks/use-venues'
import { useCreateDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'

const GLOBAL_VENUE = '__global__'

type Mode = 'full' | 'qa'

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Doc type"
      className="inline-flex items-center rounded-md border p-0.5 text-xs"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'full'}
        onClick={() => onChange('full')}
        className={`px-3 py-1 rounded ${mode === 'full' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
      >
        Full doc
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'qa'}
        onClick={() => onChange('qa')}
        className={`px-3 py-1 rounded ${mode === 'qa' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
      >
        Q&A
      </button>
    </div>
  )
}

export function DocForm({ onSaved }: { onSaved?: () => void }) {
  const [mode, setMode] = useState<Mode>('full')
  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} onChange={setMode} />
      {mode === 'full' ? (
        <FullDocForm onSaved={onSaved} />
      ) : (
        <QuickQaForm onSaved={onSaved} />
      )}
    </div>
  )
}

function FullDocForm({ onSaved }: { onSaved?: () => void }) {
  const { data: venues } = useVenues()
  const createDoc = useCreateDoc()
  const [reading, setReading] = useState(false)

  const form = useForm<CreateDocRequest>({
    resolver: zodResolver(CreateDocRequestSchema),
    defaultValues: { title: '', content: '', venueId: null },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReading(true)
    try {
      const text = await file.text()
      form.setValue('content', text, { shouldValidate: true })
      if (!form.getValues('title')) {
        form.setValue(
          'title',
          file.name.replace(/\.(md|txt)$/i, ''),
          { shouldValidate: true },
        )
      }
    } catch {
      toast.error('Could not read file')
    } finally {
      setReading(false)
    }
  }

  async function onSubmit(values: CreateDocRequest) {
    try {
      const res = await createDoc.mutateAsync(values)
      if (res.failSoft) {
        toast.warning(
          'Saved, but AI enrichment failed — the doc is stored without tags/summary.',
        )
      } else {
        toast.success(
          `Saved — ${res.tags.length} tags${res.docType ? ` · ${res.docType}` : ''}`,
        )
      }
      form.reset({ title: '', content: '', venueId: values.venueId ?? null })
      onSaved?.()
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createDoc.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Cellar temperature thresholds"
                  disabled={submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="venueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <Select
                value={field.value ?? GLOBAL_VENUE}
                onValueChange={(v) =>
                  field.onChange(v === GLOBAL_VENUE ? null : v)
                }
                disabled={submitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={GLOBAL_VENUE}>
                    Global (applies to all venues)
                  </SelectItem>
                  {(venues ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Venue-specific docs rank higher for chats at that venue.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={10}
                  placeholder="Paste markdown or plain text here…"
                  disabled={submitting}
                />
              </FormControl>
              <FormDescription>
                Plain text or markdown. AI extracts tags, doc type, cross-refs on save.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            <input
              type="file"
              accept=".md,.txt,text/plain,text/markdown"
              className="hidden"
              onChange={handleFileChange}
              disabled={submitting || reading}
            />
            {reading ? 'Reading…' : 'Upload .md or .txt'}
          </label>
          <div className="ml-auto">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Save doc'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

const QaSchema = z.object({
  question: z.string().trim().min(1, 'question required').max(500),
  answer: z.string().trim().min(1, 'answer required').max(10_000),
  venueId: z.union([z.string().uuid(), z.null()]),
})
type QaValues = z.infer<typeof QaSchema>

function QuickQaForm({ onSaved }: { onSaved?: () => void }) {
  const { data: venues } = useVenues()
  const createDoc = useCreateDoc()

  const form = useForm<QaValues>({
    resolver: zodResolver(QaSchema),
    defaultValues: { question: '', answer: '', venueId: null },
  })

  async function onSubmit(values: QaValues) {
    const title = values.question.replace(/[?.!]+$/, '').slice(0, 200)
    const content = `Q: ${values.question}\nA: ${values.answer}`
    const payload: CreateDocRequest = { title, content, venueId: values.venueId }
    try {
      const res = await createDoc.mutateAsync(payload)
      if (res.failSoft) {
        toast.warning('Saved, but AI enrichment failed — stored without tags/summary.')
      } else {
        toast.success(
          `Saved — ${res.tags.length} tags${res.docType ? ` · ${res.docType}` : ''}`,
        )
      }
      form.reset({ question: '', answer: '', venueId: values.venueId ?? null })
      onSaved?.()
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createDoc.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Which gas bottle do we put the soda gun onto?"
                  disabled={submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="answer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Answer</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={5}
                  placeholder="Check the bottles to make sure what you're replacing, but I'm fairly sure it's CO2."
                  disabled={submitting}
                />
              </FormControl>
              <FormDescription>
                Short authoritative answer. The chat will repeat it verbatim.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="venueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <Select
                value={field.value ?? GLOBAL_VENUE}
                onValueChange={(v) =>
                  field.onChange(v === GLOBAL_VENUE ? null : v)
                }
                disabled={submitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={GLOBAL_VENUE}>
                    Global (applies to all venues)
                  </SelectItem>
                  {(venues ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save Q&A'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

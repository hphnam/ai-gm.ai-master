'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquareText,
  NotebookPen,
  Upload as UploadIcon,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateDoc, useUploadDoc } from '@/lib/hooks/use-docs'
import { useVenues } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

const GLOBAL_VENUE = '__global__'

// Accept list mirrors the backend's UPLOAD_MIME_ALLOWLIST. Kept loose (extensions)
// because browsers don't always report correct MIME types for office files.
const FILE_ACCEPT = '.md,.txt,.pdf,.docx,.xlsx,.csv,.pptx,.jpg,.jpeg,.png,.webp'

type Intent = 'choose' | 'document' | 'qa' | 'text'

export function UploadModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [intent, setIntent] = useState<Intent>('choose')

  const close = (next: boolean) => {
    if (!next) setIntent('choose')
    onOpenChange(next)
  }
  // Enrichment is async server-side — when the save request resolves, the
  // row already shows up in the list with a "Processing…" badge. Closing
  // immediately lets the user queue up another upload right away.
  const handleSaved = () => {
    close(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        {intent === 'choose' ? (
          <IntentPicker onPick={setIntent} />
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIntent('choose')}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            {intent === 'document' ? (
              <DocumentForm onSaved={handleSaved} />
            ) : intent === 'qa' ? (
              <QaForm onSaved={handleSaved} />
            ) : (
              <TextForm onSaved={handleSaved} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function IntentPicker({ onPick }: { onPick: (i: Intent) => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add to knowledge base</DialogTitle>
        <DialogDescription>
          What are you adding? This affects how the AI files and retrieves it later.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <IntentCard
          icon={<FileText className="h-5 w-5" />}
          title="Document"
          description="Upload a file — PDF, spreadsheet, Word doc, or image."
          onClick={() => onPick('document')}
        />
        <IntentCard
          icon={<NotebookPen className="h-5 w-5" />}
          title="Note"
          description="Paste or type text directly — SOPs, lists, anything you'd otherwise paste into a doc."
          onClick={() => onPick('text')}
        />
        <IntentCard
          icon={<MessageSquareText className="h-5 w-5" />}
          title="Q&A"
          description="One question, one authoritative answer. Best for facts staff keep asking."
          onClick={() => onPick('qa')}
        />
      </div>
    </>
  )
}

function IntentCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-foreground/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

// ─── Document form ────────────────────────────────────────────────────────

const AUTO_VENUE = '__auto__'

// Per-file row in the upload queue. The AI auto-detects category + venue
// server-side, so the form's job is just to collect files + an optional
// venue override. Title defaults to the filename.
type QueueStatus = 'pending' | 'uploading' | 'done' | 'error'
type QueueItem = {
  key: string
  file: File
  status: QueueStatus
  error: string | null
}

const DocumentBatchSchema = z.object({
  // AUTO → server-side auto-detect. GLOBAL → explicit org-wide. uuid → pinned.
  venueId: z.union([z.string().uuid(), z.literal(AUTO_VENUE), z.literal(GLOBAL_VENUE)]),
})
type DocumentBatchValues = z.infer<typeof DocumentBatchSchema>

function DocumentForm({ onSaved }: { onSaved: () => void }) {
  const { data: venues } = useVenues()
  const uploadDoc = useUploadDoc()
  const [items, setItems] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<DocumentBatchValues>({
    resolver: zodResolver(DocumentBatchSchema),
    defaultValues: { venueId: AUTO_VENUE },
  })

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
    if (incoming.length === 0) return
    setItems((prev) => {
      const existingKeys = new Set(prev.map((i) => `${i.file.name}:${i.file.size}`))
      const next: QueueItem[] = [...prev]
      for (const f of incoming) {
        const k = `${f.name}:${f.size}`
        if (existingKeys.has(k)) continue
        next.push({
          key: `${k}:${crypto.randomUUID()}`,
          file: f,
          status: 'pending',
          error: null,
        })
      }
      return next
    })
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key))

  const updateItem = useCallback(
    (key: string, patch: Partial<QueueItem>) =>
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i))),
    [],
  )

  const counts = useMemo(() => {
    return {
      total: items.length,
      done: items.filter((i) => i.status === 'done').length,
      error: items.filter((i) => i.status === 'error').length,
      pending: items.filter((i) => i.status === 'pending' || i.status === 'uploading').length,
    }
  }, [items])

  async function onSubmit(values: DocumentBatchValues) {
    const queue = items.filter((i) => i.status === 'pending' || i.status === 'error')
    if (queue.length === 0) {
      toast.error('Add at least one file.')
      return
    }
    setSubmitting(true)
    const venueId =
      values.venueId === AUTO_VENUE || values.venueId === GLOBAL_VENUE ? null : values.venueId
    const autoDetectVenue = values.venueId === AUTO_VENUE

    // Mark every queued file as uploading immediately so the UI reflects the
    // batch state before the parallel mutations resolve in any order.
    setItems((prev) =>
      prev.map((i) =>
        i.status === 'pending' || i.status === 'error'
          ? { ...i, status: 'uploading', error: null }
          : i,
      ),
    )

    const results = await Promise.allSettled(
      queue.map(async (item) => {
        try {
          const titleFromName = item.file.name.replace(/\.[^.]+$/, '')
          await uploadDoc.mutateAsync({
            file: item.file,
            venueId,
            title: titleFromName,
            autoDetectVenue,
          })
          updateItem(item.key, { status: 'done', error: null })
          return { key: item.key, ok: true as const }
        } catch (err) {
          const msg = mapApiError(err)
          updateItem(item.key, { status: 'error', error: msg })
          return { key: item.key, ok: false as const, error: msg }
        }
      }),
    )

    setSubmitting(false)
    const okCount = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length
    const failCount = results.length - okCount

    if (okCount > 0 && failCount === 0) {
      toast.success(
        okCount === 1
          ? 'Added 1 document — AI is filing it now'
          : `Added ${okCount} documents — AI is filing them now`,
      )
      onSaved()
    } else if (okCount > 0 && failCount > 0) {
      toast.warning(`${okCount} uploaded, ${failCount} failed — see list.`)
    } else {
      toast.error('All uploads failed — see list for details.')
    }
  }

  const hasFiles = items.length > 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <DialogHeader>
          <DialogTitle>Add documents</DialogTitle>
          <DialogDescription>
            Drop in as many files as you like. The AI auto-detects the category and venue. Anything
            it&rsquo;s unsure about lands in your inbox to confirm.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone — always visible so users can keep adding to the queue */}
        {/* biome-ignore lint/a11y/useSemanticElements: drag-and-drop zone needs div for native DnD events */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-5 text-center transition-colors',
            dragOver ? 'border-foreground bg-accent' : 'border-muted-foreground/30 hover:bg-accent',
            submitting && 'pointer-events-none opacity-60',
          )}
        >
          <UploadIcon className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium">Drop files here</span>{' '}
            <span className="text-muted-foreground">or click to pick</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            PDF · DOCX · XLSX · CSV · PPTX · MD · TXT · JPG · PNG · WEBP — multiple OK
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={onInputChange}
            disabled={submitting}
          />
        </div>

        {hasFiles ? (
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
            {items.map((item) => (
              <QueueRow
                key={item.key}
                item={item}
                onRemove={() => removeItem(item.key)}
                disabled={submitting}
              />
            ))}
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="venueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v)}
                disabled={submitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={AUTO_VENUE}>Auto (let AI detect from each doc)</SelectItem>
                  <SelectItem value={GLOBAL_VENUE}>Global (applies to all venues)</SelectItem>
                  {(venues ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Auto reads each document and picks the venue if it&rsquo;s clear. Pick one
                explicitly to pin the whole batch.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-xs text-muted-foreground">
            {counts.total === 0
              ? 'No files yet'
              : `${counts.total} file${counts.total === 1 ? '' : 's'}` +
                (counts.done > 0 ? ` · ${counts.done} done` : '') +
                (counts.error > 0 ? ` · ${counts.error} failed` : '')}
          </p>
          <Button type="submit" disabled={submitting || counts.pending === 0}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Uploading
                {counts.total > 1 ? ` ${counts.total}` : ''}…
              </>
            ) : counts.total > 1 ? (
              `Upload ${counts.pending} file${counts.pending === 1 ? '' : 's'}`
            ) : (
              'Upload & save'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function QueueRow({
  item,
  onRemove,
  disabled,
}: {
  item: QueueItem
  onRemove: () => void
  disabled: boolean
}) {
  const sizeKb = (item.file.size / 1024).toFixed(0)
  return (
    <div className="flex items-center gap-2 rounded-sm bg-background px-2 py-1.5">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{item.file.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {item.status === 'error' && item.error ? item.error : `${sizeKb} KB`}
        </p>
      </div>
      {item.status === 'pending' || item.status === 'error' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove"
          onClick={onRemove}
          disabled={disabled}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  )
}

function StatusIcon({ status }: { status: QueueStatus }) {
  if (status === 'uploading')
    return (
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
    )
  if (status === 'done')
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
  if (status === 'error')
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />
  return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
}

// ─── Note (paste-text) form ───────────────────────────────────────────────

const TextSchema = z.object({
  title: z.string().trim().min(1, 'Title required').max(200),
  // Mirrors backend CreateDocRequestSchema.content cap (50_000).
  content: z.string().trim().min(1, 'Content required').max(50_000),
  venueId: z.union([z.string().uuid(), z.null()]),
  description: z.string().trim().max(1_000),
})
type TextValues = z.infer<typeof TextSchema>

function TextForm({ onSaved }: { onSaved: () => void }) {
  const { data: venues } = useVenues()
  const createDoc = useCreateDoc()

  const form = useForm<TextValues>({
    resolver: zodResolver(TextSchema),
    defaultValues: { title: '', content: '', venueId: null, description: '' },
  })

  async function onSubmit(values: TextValues) {
    try {
      await createDoc.mutateAsync({
        title: values.title,
        content: values.content,
        venueId: values.venueId ?? null,
        description: values.description.length > 0 ? values.description : undefined,
      })
      toast.success('Added — AI is filing it now')
      onSaved()
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createDoc.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <DialogHeader>
          <DialogTitle>Add a note</DialogTitle>
          <DialogDescription>
            Paste or type the text directly. The AI classifies it the same way as an uploaded file.
          </DialogDescription>
        </DialogHeader>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Cellar opening checklist"
                  disabled={submitting}
                  autoFocus
                />
              </FormControl>
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
                  placeholder="Paste the text here…"
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
                onValueChange={(v) => field.onChange(v === GLOBAL_VENUE ? null : v)}
                disabled={submitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={GLOBAL_VENUE}>Global (applies to all venues)</SelectItem>
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                AI brief{' '}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={2}
                  placeholder="One sentence telling the AI what this is and when it applies."
                  disabled={submitting}
                />
              </FormControl>
              <FormDescription>
                Prepended to the content so retrieval and classification see your intent hint.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              'Save note'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ─── Q&A form ─────────────────────────────────────────────────────────────

const QaSchema = z.object({
  question: z.string().trim().min(1, 'Question required').max(500),
  answer: z.string().trim().min(1, 'Answer required').max(10_000),
  venueId: z.union([z.string().uuid(), z.null()]),
})
type QaValues = z.infer<typeof QaSchema>

function QaForm({ onSaved }: { onSaved: () => void }) {
  const { data: venues } = useVenues()
  const createDoc = useCreateDoc()

  const form = useForm<QaValues>({
    resolver: zodResolver(QaSchema),
    defaultValues: { question: '', answer: '', venueId: null },
  })

  async function onSubmit(values: QaValues) {
    const title = values.question.replace(/[?.!]+$/, '').slice(0, 200)
    const content = `Q: ${values.question}\nA: ${values.answer}`
    try {
      await createDoc.mutateAsync({
        title,
        content,
        venueId: values.venueId ?? null,
      })
      toast.success('Added — processing in background')
      onSaved()
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createDoc.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <DialogHeader>
          <DialogTitle>Add a Q&A</DialogTitle>
          <DialogDescription>
            One question, one authoritative answer — the chat will repeat it verbatim.
          </DialogDescription>
        </DialogHeader>
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
                  placeholder="Check the bottles to make sure what you're replacing, but it's CO2."
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
                onValueChange={(v) => field.onChange(v === GLOBAL_VENUE ? null : v)}
                disabled={submitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={GLOBAL_VENUE}>Global (applies to all venues)</SelectItem>
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
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

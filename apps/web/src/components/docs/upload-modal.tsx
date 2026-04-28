'use client'

import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquareText,
  Upload as UploadIcon,
  X,
} from 'lucide-react'
import { CreateDocRequestSchema, type CreateDocRequest } from '@gm-ai/types'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useVenues } from '@/lib/hooks/use-venues'
import { useCreateDoc, useUploadDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

const GLOBAL_VENUE = '__global__'

// Accept list mirrors the backend's UPLOAD_MIME_ALLOWLIST. Kept loose (extensions)
// because browsers don't always report correct MIME types for office files.
const FILE_ACCEPT =
  '.md,.txt,.pdf,.docx,.xlsx,.csv,.pptx,.jpg,.jpeg,.png,.webp'

type Intent = 'choose' | 'document' | 'qa'

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
            ) : (
              <QaForm onSaved={handleSaved} />
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <IntentCard
          icon={<FileText className="h-5 w-5" />}
          title="Document"
          description="Upload a file (PDF, spreadsheet, doc, image) or paste a full SOP / procedure."
          onClick={() => onPick('document')}
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

const DocumentFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title required').max(200),
    venueId: z.union([z.string().uuid(), z.null()]),
    description: z.string().trim().max(1_000),
    content: z.string().trim().max(50_000),
  })
  .refine((v) => v.content.length >= 1 || true, { message: '' })

type DocumentFormValues = z.infer<typeof DocumentFormSchema>

function DocumentForm({ onSaved }: { onSaved: () => void }) {
  const { data: venues } = useVenues()
  const createDoc = useCreateDoc()
  const uploadDoc = useUploadDoc()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(DocumentFormSchema),
    defaultValues: { title: '', venueId: null, description: '', content: '' },
  })

  const attachFile = useCallback(
    (f: File) => {
      setFile(f)
      // Auto-fill title from filename if empty.
      const current = form.getValues('title').trim()
      if (!current) {
        form.setValue('title', f.name.replace(/\.[^.]+$/, ''), {
          shouldValidate: true,
        })
      }
    },
    [form],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) attachFile(f)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) attachFile(f)
  }

  async function onSubmit(values: DocumentFormValues) {
    try {
      if (file) {
        await uploadDoc.mutateAsync({
          file,
          venueId: values.venueId ?? null,
          title: values.title,
          description: values.description || undefined,
        })
        toast.success(`Added "${values.title}" — processing in background`)
        onSaved()
        return
      }
      // No file attached — paste-text path. content required.
      if (!values.content.trim()) {
        form.setError('content', {
          type: 'manual',
          message: 'Attach a file or write content.',
        })
        return
      }
      const body: CreateDocRequest = CreateDocRequestSchema.parse({
        title: values.title,
        content: values.content,
        venueId: values.venueId ?? null,
        description: values.description || undefined,
      })
      await createDoc.mutateAsync(body)
      toast.success(`Added "${values.title}" — processing in background`)
      onSaved()
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createDoc.isPending || uploadDoc.isPending

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            Upload a file or paste text. The AI extracts tags and doc type on save.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone / file state */}
        {file ? (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              onClick={() => setFile(null)}
              disabled={submitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
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
              'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-6 text-center transition-colors',
              dragOver
                ? 'border-foreground bg-accent'
                : 'border-muted-foreground/30 hover:bg-accent',
            )}
          >
            <UploadIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium">Drop a file here</span>{' '}
              <span className="text-muted-foreground">or click to pick</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              PDF · DOCX · XLSX · CSV · PPTX · MD · TXT · JPG · PNG · WEBP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={onInputChange}
              disabled={submitting}
            />
          </div>
        )}

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
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={2}
                  placeholder="e.g. This is the midweek deep-clean SOP — runs Mondays after the nightly close."
                  disabled={submitting}
                />
              </FormControl>
              <FormDescription>
                One or two sentences telling the AI what this is and when it applies.
                Gets prepended to the document so retrieval + classification see it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!file ? (
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={8}
                    placeholder="Paste markdown or plain text here…"
                    disabled={submitting}
                  />
                </FormControl>
                <FormDescription>
                  Required when no file is attached.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : file ? (
              'Upload & save'
            ) : (
              'Save'
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

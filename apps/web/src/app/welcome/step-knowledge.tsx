'use client'

import { AlertCircle, CheckCircle2, FileText, Loader2, Upload as UploadIcon, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUploadDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'
import { StepFooter, StepShell } from './step-shell'
import type { OnboardingStepId } from './steps'

const FILE_ACCEPT = '.md,.txt,.pdf,.docx,.xlsx,.csv,.pptx,.jpg,.jpeg,.png,.webp'

// Hint chips below the dropzone. Purely informational — clicking one does
// nothing because we can't synthesise file contents. The aim is to seed the
// user's idea of "what counts" so they pick the right things.
const SUGGESTIONS = [
  'Opening checklist',
  'Closing checklist',
  'Allergen menu',
  'Supplier list',
  'Staff handbook',
  'Cellar SOP',
  'Fire risk assessment',
  'Premises licence',
] as const

type QueueStatus = 'uploading' | 'done' | 'error'
type QueueItem = {
  key: string
  file: File
  status: QueueStatus
  error: string | null
}

export function StepKnowledge({
  venueId,
  onAdvance,
  onBack,
}: {
  venueId: string
  onAdvance: (next: OnboardingStepId) => void
  onBack: () => void
}) {
  const uploadDoc = useUploadDoc()
  const [items, setItems] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const updateItem = useCallback(
    (key: string, patch: Partial<QueueItem>) =>
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i))),
    [],
  )

  // Uploads run in the background as soon as the file lands in the queue —
  // the user never blocks on this step. If they click Continue mid-flight,
  // we advance and the in-flight mutations resolve into a stale component
  // (React Query keeps the cache hot, so the docs index sees them once
  // they're done).
  const startUpload = useCallback(
    (item: QueueItem) => {
      const title = item.file.name.replace(/\.[^.]+$/, '')
      uploadDoc
        .mutateAsync({ file: item.file, venueId, title })
        .then(() => updateItem(item.key, { status: 'done', error: null }))
        .catch((err) => updateItem(item.key, { status: 'error', error: mapApiError(err) }))
    },
    [uploadDoc, venueId, updateItem],
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
      if (incoming.length === 0) return
      const queued: QueueItem[] = []
      setItems((prev) => {
        const existing = new Set(prev.map((i) => `${i.file.name}:${i.file.size}`))
        const next = [...prev]
        for (const f of incoming) {
          const k = `${f.name}:${f.size}`
          if (existing.has(k)) continue
          const item: QueueItem = {
            key: `${k}:${crypto.randomUUID()}`,
            file: f,
            status: 'uploading',
            error: null,
          }
          next.push(item)
          queued.push(item)
        }
        return next
      })
      // Kick off uploads outside the setState updater — mutations are side
      // effects, not state transitions.
      for (const item of queued) startUpload(item)
    },
    [startUpload],
  )

  const retry = (item: QueueItem) => {
    updateItem(item.key, { status: 'uploading', error: null })
    startUpload(item)
  }

  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key))

  const counts = useMemo(() => {
    return {
      total: items.length,
      done: items.filter((i) => i.status === 'done').length,
      uploading: items.filter((i) => i.status === 'uploading').length,
      error: items.filter((i) => i.status === 'error').length,
    }
  }, [items])

  return (
    <StepShell
      eyebrow="Knowledge"
      title="Drop in anything written about your venue."
      intro="SOPs, opening checklists, supplier lists, training docs, menus — drop them in and keep moving. The AI files everything in the background."
    >
      <div className="space-y-5">
        {/* biome-ignore lint/a11y/useSemanticElements: drag-and-drop zone needs div for native DnD events */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            dragOver
              ? 'border-foreground bg-accent'
              : 'border-border hover:border-foreground/40 hover:bg-accent/50',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground/70">
            <UploadIcon className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm">
            <span className="font-medium">Drop files here</span>{' '}
            <span className="text-muted-foreground">or click to pick</span>
          </p>
          <p className="text-xs text-muted-foreground">
            PDF &middot; DOCX &middot; XLSX &middot; CSV &middot; PPTX &middot; MD &middot; TXT
            &middot; JPG &middot; PNG &middot; WEBP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ideas for what to upload
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {items.length > 0 ? (
          <ul
            className="space-y-1.5 rounded-lg border bg-muted/20 p-2"
            aria-live="polite"
            aria-label="Upload queue"
          >
            {items.map((item) => (
              <QueueRow
                key={item.key}
                item={item}
                onRemove={() => removeItem(item.key)}
                onRetry={() => retry(item)}
              />
            ))}
          </ul>
        ) : null}

        <StepFooter
          onBack={onBack}
          onSkip={counts.total === 0 ? () => onAdvance('done') : undefined}
          helper={
            counts.total > 0 ? (
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {counts.done > 0 ? `${counts.done} added` : null}
                {counts.done > 0 && counts.uploading > 0 ? ' · ' : ''}
                {counts.uploading > 0 ? `${counts.uploading} uploading…` : null}
                {counts.error > 0
                  ? `${counts.done > 0 || counts.uploading > 0 ? ' · ' : ''}${counts.error} failed`
                  : null}
              </span>
            ) : null
          }
          primary={
            <Button type="button" onClick={() => onAdvance('done')} className="min-h-11">
              {counts.uploading > 0 ? 'Continue (uploads keep running)' : 'Continue'}
            </Button>
          }
        />
      </div>
    </StepShell>
  )
}

function QueueRow({
  item,
  onRemove,
  onRetry,
}: {
  item: QueueItem
  onRemove: () => void
  onRetry: () => void
}) {
  const sizeKb = (item.file.size / 1024).toFixed(0)
  return (
    <li className="flex items-center gap-2 rounded-sm bg-background px-2 py-1.5">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{item.file.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.status === 'error' && item.error
            ? item.error
            : item.status === 'done'
              ? 'Added — filing in background'
              : `${sizeKb} KB`}
        </p>
      </div>
      {item.status === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          className="relative cursor-pointer rounded-sm text-xs font-medium text-muted-foreground underline-offset-2 after:absolute after:-inset-x-2 after:-inset-y-3.5 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Retry
        </button>
      ) : null}
      {item.status !== 'uploading' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${item.file.name}`}
          onClick={onRemove}
          className="relative h-7 w-7 after:absolute after:-inset-2.5"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </li>
  )
}

function StatusIcon({ status }: { status: QueueStatus }) {
  if (status === 'uploading')
    return (
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
    )
  if (status === 'done')
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
  if (status === 'error')
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
  return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
}

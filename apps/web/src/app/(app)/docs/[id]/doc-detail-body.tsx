'use client'

import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckSquare,
  ClipboardList,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Pencil,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ClassifyDocModal } from '@/components/docs/classify-doc-modal'
import { DocTypeProposalModal } from '@/components/docs/doc-type-proposal-modal'
import { EditDocModal } from '@/components/docs/edit-doc-modal'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { DocDetailDto } from '@/generated/api'
import { ApiError } from '@/lib/api-client'
import { useDeleteDoc, useDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

type Checklist = NonNullable<DocDetailDto['checklist']>
type Schedule = Checklist['schedule']
type ChecklistStep = Checklist['steps'][number]
type AudienceRole = NonNullable<Checklist['audience']['roles']>[number]

const STEP_DISPLAY_CAP = 200

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  const diffMs = Date.now() - ts
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatScheduleLine(s: Schedule): string {
  const cadence = s.cadence ?? 'unknown'
  if (cadence === 'unknown') return s.rawText || 'Whenever needed'
  const parts: string[] = [cadence.charAt(0).toUpperCase() + cadence.slice(1)]
  if (s.dayOfWeek != null)
    parts.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.dayOfWeek])
  if (s.dayOfMonth != null) parts.push(`day ${s.dayOfMonth}`)
  if (s.timeOfDay) parts.push(`@ ${s.timeOfDay}`)
  return parts.join(' • ')
}

function RolePill({ role }: { role: AudienceRole }) {
  return (
    <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
      {role}
    </span>
  )
}

function StepKindIcon({ kind }: { kind: ChecklistStep['kind'] }) {
  const common = 'h-3.5 w-3.5 shrink-0'
  switch (kind) {
    case 'tick':
      return <CheckSquare className={common} aria-hidden />
    case 'numeric':
      return <Hash className={common} aria-hidden />
    case 'photo':
      return <Camera className={common} aria-hidden />
    default:
      return <FileText className={common} aria-hidden />
  }
}

function CategoryChip({ doc }: { doc: DocDetailDto }) {
  if (doc.processingStatus === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Reading…
      </span>
    )
  }
  if (doc.processingStatus === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Couldn’t read
      </span>
    )
  }
  if (doc.documentType) {
    const Icon = doc.documentType.kind === 'procedural' ? ClipboardList : BookOpen
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {doc.documentType.name}
      </span>
    )
  }
  if (doc.pendingTypeProposal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Awaiting your review
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
      <Tag className="h-3.5 w-3.5" aria-hidden />
      Not categorized
    </span>
  )
}

function StatusBanner({
  doc,
  onOpenProposal,
  onOpenClassify,
}: {
  doc: DocDetailDto
  onOpenProposal: () => void
  onOpenClassify: () => void
}) {
  if (doc.processingStatus === 'failed') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold">We couldn’t read this file</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {doc.processingError
                ? `${doc.processingError}. Try uploading a Word doc, or paste the text directly.`
                : 'It might be a scanned image or password-protected PDF. Try uploading a Word doc, or paste the text directly.'}
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (doc.pendingTypeProposal) {
    const proposal = doc.pendingTypeProposal
    return (
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold">Is this a {proposal.name.toLowerCase()}?</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Our AI thinks so. Confirm and we’ll file similar docs the same way next time.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={onOpenProposal} className="cursor-pointer">
                Review &amp; confirm
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (!doc.documentType) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Tag className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold">Pick a category</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Categorising this document helps the AI and your team know how to use it. Takes about
              ten seconds.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={onOpenClassify} className="cursor-pointer">
                Pick a category
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function DeleteDocDialog({
  docId,
  open,
  onOpenChange,
}: {
  docId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const deleteDoc = useDeleteDoc()

  async function handleConfirm() {
    try {
      await deleteDoc.mutateAsync(docId)
      toast.success('Deleted')
      onOpenChange(false)
      router.push('/docs')
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this document?</DialogTitle>
          <DialogDescription>
            This can’t be undone. The document will be removed from your knowledge base and stop
            showing up in chat answers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteDoc.isPending}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteDoc.isPending}
            className="cursor-pointer"
          >
            {deleteDoc.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocActions({
  doc,
  onOpenClassify,
  onOpenProposal,
  onOpenEdit,
}: {
  doc: DocDetailDto
  onOpenClassify: () => void
  onOpenProposal: () => void
  onOpenEdit: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canPickCategory = doc.processingStatus === 'ready'
  const reclassifyLabel = doc.documentType
    ? 'Change category'
    : doc.pendingTypeProposal
      ? 'Review category'
      : 'Pick category'

  return (
    <div className="flex items-center gap-1.5">
      {canPickCategory ? (
        <Button
          size="sm"
          variant="outline"
          onClick={doc.pendingTypeProposal ? onOpenProposal : onOpenClassify}
          className="cursor-pointer"
        >
          {reclassifyLabel}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        onClick={onOpenEdit}
        aria-label="Edit document"
        title="Edit document"
        className="cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete document"
        title="Delete document"
        className="cursor-pointer text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
      <DeleteDocDialog docId={doc.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}

function MetaLine({ doc }: { doc: DocDetailDto }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
      <span className="inline-flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        {doc.venueName ?? 'All venues'}
      </span>
      <span className="text-muted-foreground/40" aria-hidden>
        ·
      </span>
      <span>Updated {formatRelative(doc.updatedAt)}</span>
    </div>
  )
}

function ContentBlock({ content }: { content: string }) {
  const text = content.trim()
  if (!text) {
    return (
      <p className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm italic text-muted-foreground">
        No readable content was extracted from this file.
      </p>
    )
  }
  return (
    <section
      aria-label="Document content"
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <header className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        Document content
      </header>
      <pre className="whitespace-pre-wrap break-words px-4 py-4 font-sans text-sm leading-relaxed text-foreground sm:px-6 sm:py-5">
        {text}
      </pre>
    </section>
  )
}

function ChecklistBlock({ checklist }: { checklist: Checklist }) {
  const roles = checklist.audience.roles ?? []
  const stepCount = checklist.steps.length
  const visibleSteps = checklist.steps.slice(0, STEP_DISPLAY_CAP)

  return (
    <section
      aria-labelledby="checklist-heading"
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <header className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" aria-hidden />
        <span id="checklist-heading">Steps to follow ({stepCount})</span>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              When
            </dt>
            <dd className="text-sm">{formatScheduleLine(checklist.schedule)}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Who
            </dt>
            <dd className="flex flex-wrap items-center gap-1.5">
              {roles.length > 0 ? (
                roles.map((r) => <RolePill key={r} role={r} />)
              ) : (
                <span className="text-sm text-muted-foreground">
                  {checklist.audience.rawText || 'Unspecified'}
                </span>
              )}
            </dd>
          </div>
        </dl>

        <ol className="space-y-2.5">
          {visibleSteps.map((s, idx) => (
            <li
              key={s.index}
              className="flex items-start gap-3 rounded-lg border bg-background/40 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2 text-sm">
                  <StepKindIcon kind={s.kind} />
                  <span className="break-words">
                    {s.text}
                    {s.required === false ? (
                      <span className="ml-2 text-xs text-muted-foreground">(optional)</span>
                    ) : null}
                  </span>
                </div>
                {s.hint ? (
                  <p className="mt-1 break-words text-xs text-muted-foreground">{s.hint}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {stepCount > STEP_DISPLAY_CAP ? (
          <p className="text-xs text-muted-foreground">
            Showing first {STEP_DISPLAY_CAP} of {stepCount} steps.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function NotFound() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Document not found</AlertTitle>
      <AlertDescription>
        It may have been deleted, or you don’t have access. Head back to the knowledge library.
        <Button asChild variant="outline" size="sm" className="mt-3 cursor-pointer">
          <Link href="/docs">Back to Knowledge</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function GenericError() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn’t load this document</AlertTitle>
      <AlertDescription>Try refreshing the page in a moment.</AlertDescription>
    </Alert>
  )
}

function DocSkeleton() {
  return (
    <div role="status" className="space-y-4" aria-busy="true" aria-label="Loading document">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export function DocDetailBody({ id }: { id: string }) {
  const doc = useDoc(id)
  const [classifyOpen, setClassifyOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const data = doc.data
  const title = data?.title?.trim() || 'Untitled document'

  return (
    <AppShell>
      <PageHeader
        title={data ? title : 'Document'}
        actions={
          data ? (
            <DocActions
              doc={data}
              onOpenClassify={() => setClassifyOpen(true)}
              onOpenProposal={() => setProposalOpen(true)}
              onOpenEdit={() => setEditOpen(true)}
            />
          ) : null
        }
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          {/* No href so router.back() preserves any ?q=/?status= filters set
              via nuqs in the library tab. Falls back to /docs when there's no
              history (cold-loaded detail). */}
          <BackButton fallbackHref="/docs">Back to Knowledge</BackButton>

          {doc.isLoading ? (
            <DocSkeleton />
          ) : doc.error ? (
            doc.error instanceof ApiError && doc.error.code === 'not-found' ? (
              <NotFound />
            ) : (
              <GenericError />
            )
          ) : data ? (
            <article className="space-y-6">
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryChip doc={data} />
                </div>
                <h1
                  className={cn(
                    'text-2xl font-semibold leading-tight tracking-tight sm:text-3xl',
                    !data.title && 'italic text-muted-foreground',
                  )}
                >
                  {title}
                </h1>
                {data.summary ? (
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {data.summary}
                  </p>
                ) : null}
                <MetaLine doc={data} />
                {data.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {data.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              <StatusBanner
                doc={data}
                onOpenClassify={() => setClassifyOpen(true)}
                onOpenProposal={() => setProposalOpen(true)}
              />

              <ContentBlock content={data.content} />

              {data.checklist ? <ChecklistBlock checklist={data.checklist} /> : null}
            </article>
          ) : null}
        </div>
      </div>

      {data ? (
        <>
          {classifyOpen ? (
            <ClassifyDocModal docId={data.id} open={classifyOpen} onOpenChange={setClassifyOpen} />
          ) : null}
          {proposalOpen && data.pendingTypeProposal ? (
            <DocTypeProposalModal
              docId={data.id}
              proposal={data.pendingTypeProposal}
              open={proposalOpen}
              onOpenChange={setProposalOpen}
            />
          ) : null}
          {editOpen ? <EditDocModal doc={data} open={editOpen} onOpenChange={setEditOpen} /> : null}
        </>
      ) : null}
    </AppShell>
  )
}

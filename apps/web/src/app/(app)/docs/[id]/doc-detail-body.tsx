'use client'

import {
  AlertTriangle,
  Archive,
  BookOpen,
  Camera,
  CheckSquare,
  ClipboardList,
  FileText,
  Hash,
  History,
  Loader2,
  MapPin,
  Pencil,
  Replace,
  RotateCcw,
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
import { SupersedePickerModal } from '@/components/docs/supersede-picker-modal'
import { SetPageHeader } from '@/components/shell/page-header-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BackButton } from '@/components/ui/back-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageContainer } from '@/components/ui/page-container'
import { Skeleton } from '@/components/ui/skeleton'
import { type TabItem, TabPanel, Tabs } from '@/components/ui/tabs'
import type { DocDetailDto } from '@/generated/api'
import { ApiError } from '@/lib/api-client'
import { formatRelative } from '@/lib/format-relative'
import { useDeleteDoc, useDoc, useUnsupersedeDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

type Checklist = NonNullable<DocDetailDto['checklist']>
type Schedule = Checklist['schedule']
type ChecklistStep = Checklist['steps'][number]
type AudienceRole = NonNullable<Checklist['audience']['roles']>[number]

const STEP_DISPLAY_CAP = 200

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
    <Badge variant="neutral" size="sm">
      {role}
    </Badge>
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
      <Badge variant="neutral">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Reading…
      </Badge>
    )
  }
  if (doc.processingStatus === 'failed') {
    return (
      <Badge variant="urgent">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Couldn’t read
      </Badge>
    )
  }
  if (doc.documentType) {
    const Icon = doc.documentType.kind === 'procedural' ? ClipboardList : BookOpen
    return (
      <Badge variant="success">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {doc.documentType.name}
      </Badge>
    )
  }
  if (doc.pendingTypeProposal) {
    return (
      <Badge variant="brand">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Awaiting your review
      </Badge>
    )
  }
  return (
    <Badge variant="warning">
      <Tag className="h-3.5 w-3.5" aria-hidden />
      Not categorized
    </Badge>
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
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
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
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
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

// The sidebar home for everything version-related: the full lineage (newest
// first) plus — when you're on an archived version — the "why" and the Restore
// action, so lifecycle controls live in one place instead of a banner competing
// with the document body. The viewed row is inert and highlighted; every other
// version links to its own detail page (archived ones included).
function VersionPanel({ doc }: { doc: DocDetailDto }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const unsupersede = useUnsupersedeDoc()
  const isArchived = Boolean(doc.supersededAt)

  async function handleRestore() {
    try {
      await unsupersede.mutateAsync(doc.id)
      toast.success('Restoring — re-reading the document')
      setConfirmOpen(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <section
      aria-labelledby="version-history-heading"
      className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 id="version-history-heading" className="text-sm font-semibold">
          Version history
        </h2>
      </div>
      <ol className="space-y-1">
        {doc.versionHistory.map((v) => (
          <li key={v.id}>
            <VersionRow version={v} />
          </li>
        ))}
      </ol>

      {isArchived ? (
        <div className="space-y-2.5 border-t border-border/60 pt-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Archive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              You’re viewing an archived version
              {doc.supersededBy ? (
                <>
                  , replaced by{' '}
                  <Link
                    href={`/docs/${doc.supersededBy.id}`}
                    className="font-medium underline underline-offset-2 hover:text-foreground"
                  >
                    {doc.supersededBy.title?.trim() || 'a newer version'}
                  </Link>
                </>
              ) : null}
              . It no longer shows up in chat answers.
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="w-full cursor-pointer gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Restore this version
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Restore this version?</DialogTitle>
                <DialogDescription>
                  We’ll re-read this document and bring it back into your live knowledge base. The
                  newer version stays put — you’ll have both until you archive one again.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  disabled={unsupersede.isPending}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={unsupersede.isPending}
                  className="cursor-pointer"
                >
                  {unsupersede.isPending ? 'Restoring…' : 'Restore'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </section>
  )
}

function VersionRow({ version }: { version: DocDetailDto['versionHistory'][number] }) {
  const body = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        version.isCurrent ? 'bg-background ring-1 ring-border' : 'hover:bg-background/60',
      )}
    >
      <span className="inline-flex h-6 min-w-[2.25rem] shrink-0 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
        v{version.version}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            version.title?.trim() ? 'font-medium' : 'italic text-muted-foreground',
          )}
        >
          {version.title?.trim() || 'Untitled'}
        </p>
        <p className="text-xs text-muted-foreground">
          {version.supersededAt
            ? `Archived ${formatRelative(version.supersededAt)}`
            : `Updated ${formatRelative(version.updatedAt)}`}
        </p>
      </div>
      {version.isCurrent ? (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Viewing</span>
      ) : version.supersededAt ? null : (
        <Badge variant="success" className="shrink-0">
          Live
        </Badge>
      )}
    </div>
  )
  if (version.isCurrent) return body
  return (
    <Link href={`/docs/${version.id}`} className="block">
      {body}
    </Link>
  )
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
  onOpenSupersede,
}: {
  doc: DocDetailDto
  onOpenClassify: () => void
  onOpenProposal: () => void
  onOpenEdit: () => void
  onOpenSupersede: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Archived docs are read-only history — reclassify/edit/replace don't apply
  // (restore lives in the banner). Delete stays available everywhere.
  const isArchived = Boolean(doc.supersededAt)
  const canPickCategory = doc.processingStatus === 'ready' && !isArchived
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
      {!isArchived && doc.processingStatus === 'ready' ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenSupersede}
          aria-label="Replace an older version"
          title="Replace an older version"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Replace className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
      {!isArchived ? (
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
      ) : null}
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

function ContentBody({ content }: { content: string }) {
  const text = content.trim()
  if (!text) {
    return (
      <p className="rounded-lg border border-dashed bg-card/40 p-6 text-center text-sm italic text-muted-foreground">
        No readable content was extracted from this file.
      </p>
    )
  }
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
      {text}
    </pre>
  )
}

// Standalone content card used when a doc has no checklist — no tabs, so the
// section keeps its own header for context.
function ContentCard({ content }: { content: string }) {
  return (
    <section
      aria-label="Document content"
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <header className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        Document content
      </header>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ContentBody content={content} />
      </div>
    </section>
  )
}

function ChecklistBody({ checklist }: { checklist: Checklist }) {
  const roles = checklist.audience.roles ?? []
  const stepCount = checklist.steps.length
  const visibleSteps = checklist.steps.slice(0, STEP_DISPLAY_CAP)

  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            When
          </dt>
          <dd className="text-sm">{formatScheduleLine(checklist.schedule)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Who</dt>
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
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
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
  )
}

// Content + checklist behind a tab switcher so neither buries the other in a
// long scroll. Only used when a checklist exists; otherwise ContentCard stands
// alone (a single tab would be pointless).
function DocSections({ content, checklist }: { content: string; checklist: Checklist }) {
  const [tab, setTab] = useState<'content' | 'checklist'>('content')
  const items: TabItem<'content' | 'checklist'>[] = [
    { id: 'content', label: 'Document', icon: FileText },
    { id: 'checklist', label: 'Checklist', icon: ClipboardList, count: checklist.steps.length },
  ]
  return (
    <section aria-label="Document sections">
      <Tabs
        items={items}
        value={tab}
        onValueChange={setTab}
        ariaLabel="Document sections"
        hasPanels
        className="mb-4"
      />
      <TabPanel
        id="content"
        active={tab === 'content'}
        className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
      >
        <ContentBody content={content} />
      </TabPanel>
      <TabPanel
        id="checklist"
        active={tab === 'checklist'}
        className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
      >
        <ChecklistBody checklist={checklist} />
      </TabPanel>
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
  const [supersedeOpen, setSupersedeOpen] = useState(false)

  const data = doc.data
  const title = data?.title?.trim() || 'Untitled document'
  // A version chain (or any archived doc, which always has a successor) earns a
  // two-column layout with a sticky Versions sidebar; otherwise the doc stays a
  // single readable column.
  const hasSidebar = Boolean(data && (data.versionHistory.length > 1 || data.supersededAt))

  const mainContent = data ? (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip doc={data} />
          {data.supersededAt ? (
            <Badge variant="warning">
              <Archive className="h-3.5 w-3.5" aria-hidden />
              Archived
            </Badge>
          ) : null}
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

      {data.supersededAt ? null : (
        <StatusBanner
          doc={data}
          onOpenClassify={() => setClassifyOpen(true)}
          onOpenProposal={() => setProposalOpen(true)}
        />
      )}

      {data.checklist ? (
        <DocSections key={data.id} content={data.content} checklist={data.checklist} />
      ) : (
        <ContentCard content={data.content} />
      )}
    </>
  ) : null

  return (
    <>
      <SetPageHeader
        title={data ? title : 'Document'}
        actions={
          data ? (
            <DocActions
              doc={data}
              onOpenClassify={() => setClassifyOpen(true)}
              onOpenProposal={() => setProposalOpen(true)}
              onOpenEdit={() => setEditOpen(true)}
              onOpenSupersede={() => setSupersedeOpen(true)}
            />
          ) : null
        }
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <PageContainer
          width="prose"
          className={cn('flex flex-col gap-6', hasSidebar && 'max-w-6xl')}
        >
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
            hasSidebar ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
                <article className="min-w-0 space-y-6">{mainContent}</article>
                <aside className="self-start lg:sticky lg:top-6">
                  <VersionPanel doc={data} />
                </aside>
              </div>
            ) : (
              <article className="space-y-6">{mainContent}</article>
            )
          ) : null}
        </PageContainer>
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
          {supersedeOpen ? (
            <SupersedePickerModal
              docId={data.id}
              open={supersedeOpen}
              onOpenChange={setSupersedeOpen}
            />
          ) : null}
        </>
      ) : null}
    </>
  )
}

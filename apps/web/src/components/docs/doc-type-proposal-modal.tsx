'use client'

// Shown to an owner/manager when a document's classifier proposal is
// pending. Two decisions for the user:
//   1. What do you call this kind of document? (editable name)
//   2. Is it a routine with steps, or just reference information?
// Schema / confidence numbers / internal proposal fields stay out of sight —
// they're server signals, not end-user decisions.

import { BookOpen, ClipboardList, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type {
  DocListItemDtoPendingTypeProposal,
  DocumentTypeDtoKind as DocumentTypeKind,
} from '@/generated/api'

type ProposedDocType = NonNullable<DocListItemDtoPendingTypeProposal>

import { DocPreview } from '@/components/docs/doc-preview'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAcceptDocType, useRejectDocType } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

export function DocTypeProposalModal({
  docId,
  proposal,
  open,
  onOpenChange,
}: {
  docId: string
  proposal: ProposedDocType
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const acceptMut = useAcceptDocType()
  const rejectMut = useRejectDocType()
  const busy = acceptMut.isPending || rejectMut.isPending

  const proposedKind: DocumentTypeKind = proposal.kind ?? 'reference'
  const [selectedKind, setSelectedKind] = useState<DocumentTypeKind>(proposedKind)
  const [name, setName] = useState(proposal.name)

  const trimmedName = name.trim()
  const canAccept = trimmedName.length > 0

  function handleAccept() {
    if (!canAccept) return
    acceptMut.mutate(
      {
        docId,
        kind: selectedKind !== proposedKind ? selectedKind : undefined,
        name: trimmedName !== proposal.name ? trimmedName : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Added "${trimmedName}" to your types`, {
            description:
              selectedKind === 'procedural'
                ? 'Reading the steps in the background — you’ll see them in a moment.'
                : undefined,
          })
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    )
    onOpenChange(false)
  }

  function handleReject() {
    rejectMut.mutate(docId, {
      onSuccess: () => toast.success('Left as unclassified'),
      onError: (err) => toast.error(mapApiError(err)),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[92vh] sm:max-h-[920px] sm:w-[92vw] sm:max-w-6xl sm:rounded-lg">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Review a new category
          </div>
          <DialogTitle>Save this as a category?</DialogTitle>
          <DialogDescription>
            Check the preview on the left, give it a short name, and pick how staff will use it.
            Similar docs will be filed automatically next time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto border-b px-6 py-5 md:border-b-0 md:border-r">
            <DocPreview docId={docId} />
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="type-name" className="text-sm">
                What do you call this kind of document?
              </Label>
              <Input
                id="type-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="e.g. Cellar log, Supplier contacts, Closing checklist"
                disabled={busy}
                autoFocus
              />
              {proposal.description ? (
                <p className="text-xs text-muted-foreground">
                  Hint from the AI: {proposal.description}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">How will staff use it?</Label>
              <div role="radiogroup" aria-label="Document type" className="flex flex-col gap-2">
                <KindOption
                  selected={selectedKind === 'reference'}
                  disabled={busy}
                  onSelect={() => setSelectedKind('reference')}
                  icon={<BookOpen className="h-4 w-4" />}
                  title="Look it up"
                  blurb="Menus, policies, contacts — staff find it when they need it."
                />
                <KindOption
                  selected={selectedKind === 'procedural'}
                  disabled={busy}
                  onSelect={() => setSelectedKind('procedural')}
                  icon={<ClipboardList className="h-4 w-4" />}
                  title="Follow on a schedule"
                  blurb="Steps to tick off daily, weekly, or at shift change."
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-3 sm:gap-2">
          <Button variant="ghost" onClick={handleReject} disabled={busy} className="cursor-pointer">
            {rejectMut.isPending ? 'Skipping…' : 'Skip'}
          </Button>
          <Button onClick={handleAccept} disabled={busy || !canAccept} className="cursor-pointer">
            {acceptMut.isPending ? 'Saving…' : 'Save category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KindOption({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  blurb,
}: {
  selected: boolean
  disabled: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  blurb: string
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: radio-styled button is intentional UI pattern
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full rounded-md px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-2 border-primary bg-primary/5'
          : 'border border-input bg-background hover:bg-accent',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{blurb}</div>
    </button>
  )
}

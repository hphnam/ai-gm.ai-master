'use client'

// Shown to an owner/manager when a document's classifier proposal is
// pending. Two decisions for the user:
//   1. What do you call this kind of document? (editable name)
//   2. Is it a routine with steps, or just reference information?
// Schema / confidence numbers / internal proposal fields stay out of sight —
// they're server signals, not end-user decisions.

import { useState } from 'react'
import { toast } from 'sonner'
import { BookOpen, ClipboardList, Sparkles } from 'lucide-react'
import type {
  DocumentTypeDtoKind as DocumentTypeKind,
  DocListItemDtoPendingTypeProposal,
} from '@/generated/api'

type ProposedDocType = NonNullable<DocListItemDtoPendingTypeProposal>
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAcceptDocType, useRejectDocType } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'
import { DocPreview } from '@/components/docs/doc-preview'

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

  async function handleAccept() {
    if (!canAccept) return
    try {
      await acceptMut.mutateAsync({
        docId,
        kind: selectedKind !== proposedKind ? selectedKind : undefined,
        name: trimmedName !== proposal.name ? trimmedName : undefined,
      })
      toast.success(`Added "${trimmedName}" to your types`)
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  async function handleReject() {
    try {
      await rejectMut.mutateAsync(docId)
      toast.success('Left as unclassified')
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Review a new category
          </div>
          <DialogTitle className="pt-1">Save this as a category?</DialogTitle>
          <DialogDescription>
            We haven’t seen a document like this before. Check the preview, give
            it a short name, and pick how staff will use it — next time a
            similar doc comes in, we’ll file it here automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-6 py-2 md:grid-cols-[minmax(0,1fr),minmax(0,1.05fr)] md:gap-8">
          <div className="min-w-0 md:border-r md:pr-6">
            <DocPreview docId={docId} />
          </div>

          <div className="min-w-0 space-y-5">
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
              <div
                role="radiogroup"
                aria-label="Document type"
                className="flex flex-col gap-2"
              >
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleReject}
            disabled={busy}
            className="cursor-pointer"
          >
            {rejectMut.isPending ? 'Skipping…' : 'Skip'}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={busy || !canAccept}
            className="cursor-pointer"
          >
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

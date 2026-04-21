'use client'

// Plan 04-02 Task 3 — inline owner-confirmation modal for classifier proposals.
// Plan 04-03 Task 3 — kind toggle (reference | procedural) + extractor context hint.
// Surfaces after a successful upload (CreateDocResponse.pendingTypeProposal non-null)
// OR from a /docs list row Accept action. Owner: Accept → promote to DocumentType +
// link KnowledgeItem; Reject → clear the proposal, row becomes Unclassified.

import { useState } from 'react'
import { toast } from 'sonner'
import type { DocumentTypeKind, ProposedDocType } from '@gm-ai/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAcceptDocType, useRejectDocType } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'

function confidenceLabel(c: number): { text: string; tone: 'high' | 'mid' | 'low' } {
  const pct = Math.round(c * 100)
  if (c >= 0.7) return { text: `${pct}% · high`, tone: 'high' }
  if (c >= 0.5) return { text: `${pct}% · medium`, tone: 'mid' }
  return { text: `${pct}% · low`, tone: 'low' }
}

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
  const conf = confidenceLabel(proposal.confidence)

  // Plan 04-03 Task 3 — owner can flip classifier's proposed kind before accepting.
  // Default to the classifier's suggestion (proposal.kind), fall back to 'reference' if missing.
  const proposedKind: DocumentTypeKind = proposal.kind ?? 'reference'
  const [selectedKind, setSelectedKind] = useState<DocumentTypeKind>(proposedKind)

  async function handleAccept() {
    try {
      // Only send kind if owner actually overrode — keeps accept body minimal.
      const kindArg = selectedKind !== proposedKind ? selectedKind : undefined
      await acceptMut.mutateAsync({ docId, kind: kindArg })
      toast.success(`Type accepted: ${proposal.name}`)
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  async function handleReject() {
    try {
      await rejectMut.mutateAsync(docId)
      toast.success('Proposal rejected')
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New document type detected</DialogTitle>
          <DialogDescription>
            The classifier thinks this is a new kind of document your organization hasn&apos;t
            uploaded before. Accept to add it to your taxonomy, or reject to leave this
            upload unclassified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Proposed name</p>
            <p className="text-base font-semibold">{proposal.name}</p>
          </div>
          {proposal.description ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
              <p className="text-sm">{proposal.description}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Classifier confidence
            </p>
            <p
              className={
                conf.tone === 'high'
                  ? 'text-sm text-emerald-700 dark:text-emerald-400'
                  : conf.tone === 'mid'
                    ? 'text-sm text-amber-700 dark:text-amber-400'
                    : 'text-sm text-muted-foreground'
              }
            >
              {conf.text}
            </p>
          </div>
          {Object.keys(proposal.schema ?? {}).length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Proposed schema
              </p>
              <pre className="text-xs rounded-md bg-muted p-3 overflow-x-auto max-h-40">
                {JSON.stringify(proposal.schema, null, 2)}
              </pre>
            </div>
          ) : null}

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Document type
            </p>
            <div role="radiogroup" aria-label="Document type" className="flex gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={selectedKind === 'reference'}
                onClick={() => setSelectedKind('reference')}
                disabled={busy}
                className={
                  selectedKind === 'reference'
                    ? 'flex-1 rounded-md border-2 border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-left'
                    : 'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent'
                }
              >
                <div className="font-medium">Reference</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Prose, policies, menus, contact lists — retrieval only.
                </div>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={selectedKind === 'procedural'}
                onClick={() => setSelectedKind('procedural')}
                disabled={busy}
                className={
                  selectedKind === 'procedural'
                    ? 'flex-1 rounded-md border-2 border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-left'
                    : 'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent'
                }
              >
                <div className="font-medium">Procedural</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Checklists and routines with steps + cadence.
                </div>
              </button>
            </div>
            {selectedKind === 'procedural' ? (
              <p className="text-xs text-muted-foreground mt-2">
                We&apos;ll try to extract steps + schedule after you accept.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Stored as reference material for retrieval. No procedural extraction.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReject} disabled={busy}>
            {rejectMut.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button onClick={handleAccept} disabled={busy}>
            {acceptMut.isPending ? 'Accepting…' : 'Accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

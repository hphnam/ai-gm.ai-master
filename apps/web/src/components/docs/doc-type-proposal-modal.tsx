'use client'

// Plan 04-02 Task 3 — inline owner-confirmation modal for classifier proposals.
// Surfaces after a successful upload (CreateDocResponse.pendingTypeProposal non-null)
// OR from a /docs list row Accept action. Owner: Accept → promote to DocumentType +
// link KnowledgeItem; Reject → clear the proposal, row becomes Unclassified.

import { toast } from 'sonner'
import type { ProposedDocType } from '@gm-ai/types'
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

  async function handleAccept() {
    try {
      await acceptMut.mutateAsync(docId)
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

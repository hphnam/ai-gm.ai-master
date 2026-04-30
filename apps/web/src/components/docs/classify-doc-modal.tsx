'use client'

// Opened by clicking the "Unclassified" chip on a doc row. Two paths:
//   1. Pick an existing DocumentType (if the org already has some) — single click.
//   2. Create a new DocumentType by entering a name + kind.
// Kept simple: no schema, no description, no confidence — a duty manager can
// get through this without thinking.

import { useState } from 'react'
import { toast } from 'sonner'
import { BookOpen, ClipboardList, Plus } from 'lucide-react'
import type { DocumentTypeDto, DocumentTypeDtoKind as DocumentTypeKind } from '@/generated/api'
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
import { useClassifyDoc, useDocTypes } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'
import { DocPreview } from '@/components/docs/doc-preview'

type Mode = 'pick' | 'create'

export function ClassifyDocModal({
  docId,
  open,
  onOpenChange,
}: {
  docId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: types, isLoading } = useDocTypes()
  const classifyMut = useClassifyDoc()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<DocumentTypeKind>('reference')
  // Default to 'pick' if any types exist, 'create' otherwise.
  const [mode, setMode] = useState<Mode>('pick')
  const [picking, setPicking] = useState<string | null>(null)

  const busy = classifyMut.isPending
  const hasExisting = (types?.length ?? 0) > 0
  const effectiveMode: Mode = hasExisting ? mode : 'create'

  async function assignExisting(type: DocumentTypeDto) {
    if (busy) return
    setPicking(type.id)
    try {
      await classifyMut.mutateAsync({ docId, body: { typeId: type.id } })
      toast.success(`Filed as "${type.name}"`)
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    } finally {
      setPicking(null)
    }
  }

  async function createNew() {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    try {
      const created = await classifyMut.mutateAsync({
        docId,
        body: { name: trimmed, kind },
      })
      toast.success(`Filed as "${created.name}"`)
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Classify this document</DialogTitle>
          <DialogDescription>
            Check the preview on the left, then pick a category it belongs to
            — or create a new one. Staff will find it by that category from
            now on.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-6 py-2 md:grid-cols-[minmax(0,1fr),minmax(0,1.05fr)] md:gap-8">
          <div className="min-w-0 md:border-r md:pr-6">
            <DocPreview docId={docId} />
          </div>

          <div className="min-w-0">
        {hasExisting ? (
          <div className="flex gap-1 border-b pb-2">
            <TabButton
              active={effectiveMode === 'pick'}
              onClick={() => setMode('pick')}
              label="Pick existing"
            />
            <TabButton
              active={effectiveMode === 'create'}
              onClick={() => setMode('create')}
              label="Create new"
            />
          </div>
        ) : null}

        {effectiveMode === 'pick' ? (
          <div className="min-w-0 space-y-2 py-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading categories…</p>
            ) : !types || types.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet — create one below.
              </p>
            ) : (
              <ul className="min-w-0 space-y-1.5 max-h-[40vh] overflow-y-auto overflow-x-hidden">
                {types.map((t) => (
                  <li key={t.id} className="min-w-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => assignExisting(t)}
                      className={cn(
                        'flex w-full min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                        picking === t.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent',
                        busy ? 'cursor-not-allowed opacity-60' : '',
                      )}
                    >
                      {t.kind === 'procedural' ? (
                        <ClipboardList className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      ) : (
                        <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium break-words">{t.name}</div>
                        {t.description ? (
                          <div className="text-xs text-muted-foreground break-words">
                            {t.description}
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 mt-0.5 text-[11px] text-muted-foreground">
                        {t.kind === 'procedural' ? 'Routine' : 'Reference'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="classify-name" className="text-sm">
                Category name
              </Label>
              <Input
                id="classify-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="e.g. Cellar log, Supplier contacts, Closing checklist"
                disabled={busy}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">How will staff use it?</Label>
              <div
                role="radiogroup"
                aria-label="Document type"
                className="flex flex-col gap-2"
              >
                <KindOption
                  selected={kind === 'reference'}
                  onSelect={() => setKind('reference')}
                  disabled={busy}
                  icon={<BookOpen className="h-4 w-4" />}
                  title="Look it up"
                  blurb="Menus, policies, contacts — staff find it when they need it."
                />
                <KindOption
                  selected={kind === 'procedural'}
                  onSelect={() => setKind('procedural')}
                  disabled={busy}
                  icon={<ClipboardList className="h-4 w-4" />}
                  title="Follow on a schedule"
                  blurb="Steps to tick off daily, weekly, or at shift change."
                />
              </div>
            </div>
          </div>
        )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {effectiveMode === 'create' ? (
            <Button
              onClick={createNew}
              disabled={busy || !name.trim()}
              className="cursor-pointer"
            >
              {busy ? (
                'Saving…'
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Create &amp; file
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm transition-colors',
        active
          ? 'bg-muted font-medium text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
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

'use client'

// Opened by clicking the "Unclassified" chip on a doc row. Two paths:
//   1. Pick an existing DocumentType (if the org already has some) — single click.
//   2. Create a new DocumentType by entering a name + kind.
// Kept simple: no schema, no description, no confidence — a duty manager can
// get through this without thinking.

import { BookOpen, ClipboardList, Loader2, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import type { DocumentTypeDto, DocumentTypeDtoKind as DocumentTypeKind } from '@/generated/api'
import { ApiError } from '@/lib/api-client'
import { useClassifyDoc, useDocTypes, useSuggestCategory } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

type Mode = 'pick' | 'create'

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1] ? prev[j - 1] : Math.min(prev[j - 1], prev[j], curr[j - 1]) + 1
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

// Returns the candidate that fuzzy-matches the input, or null. Skips exact
// (case-insensitive) matches because the save path already dedupes silently.
// Order: token-prefix (handles "Sta Note" → "Staff Note"), then Levenshtein
// (handles "Stff Note" → "Staff Note"). Only fires once the user has typed
// at least 3 characters.
function fuzzyFindCategory<T extends { name: string }>(input: string, candidates: T[]): T | null {
  const q = input.trim().toLowerCase()
  if (q.length < 3 || candidates.length === 0) return null
  if (candidates.some((c) => c.name.toLowerCase() === q)) return null

  const qTokens = q.split(/\s+/).filter(Boolean)
  for (const c of candidates) {
    const cTokens = c.name.toLowerCase().split(/\s+/).filter(Boolean)
    if (qTokens.length > cTokens.length) continue
    const used = new Array(cTokens.length).fill(false)
    const allMatch = qTokens.every((qt) => {
      const idx = cTokens.findIndex((ct, i) => !used[i] && ct.startsWith(qt))
      if (idx === -1) return false
      used[idx] = true
      return true
    })
    if (allMatch) return c
  }

  let best: { item: T; dist: number } | null = null
  for (const c of candidates) {
    const lc = c.name.toLowerCase()
    const tolerance = Math.max(2, Math.floor(lc.length / 4))
    const d = levenshtein(q, lc)
    if (d <= tolerance && (!best || d < best.dist)) {
      best = { item: c, dist: d }
    }
  }
  return best ? best.item : null
}

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
  const suggestMut = useSuggestCategory()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<DocumentTypeKind>('reference')
  // Default to 'pick' if any types exist, 'create' otherwise.
  const [mode, setMode] = useState<Mode>('pick')
  const [picking, setPicking] = useState<string | null>(null)
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null)
  const [suggestionMatchesExisting, setSuggestionMatchesExisting] = useState(false)

  const busy = classifyMut.isPending
  const suggesting = suggestMut.isPending

  // Fuzzy match the typed name against existing categories so a typo or partial
  // ("Sta Note", "Stff Note") surfaces "Staff Note" before they save a duplicate.
  // Suppressed while the AI suggestion hint is showing — the AI hint already
  // covers the existing-match case explicitly.
  const fuzzyMatch = useMemo(() => {
    if (suggestionHint) return null
    return fuzzyFindCategory(name, types ?? [])
  }, [name, types, suggestionHint])

  async function suggestName() {
    if (busy || suggesting) return
    setSuggestionHint(null)
    try {
      const suggestion = await suggestMut.mutateAsync(docId)
      setName(suggestion.name.slice(0, 80))
      setKind(suggestion.kind)
      if (suggestion.existing) {
        setSuggestionHint(
          `You already have a category called "${suggestion.name}" — saving will add this document to it.`,
        )
        setSuggestionMatchesExisting(true)
      } else {
        setSuggestionHint(null)
        setSuggestionMatchesExisting(false)
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'category-suggestion-unavailable') {
        toast.error("AI couldn't read enough of this doc to suggest a name.")
      } else {
        toast.error(mapApiError(err))
      }
    }
  }
  const hasExisting = (types?.length ?? 0) > 0
  const effectiveMode: Mode = hasExisting ? mode : 'create'

  function assignExisting(type: DocumentTypeDto) {
    if (busy) return
    setPicking(type.id)
    classifyMut.mutate(
      { docId, body: { typeId: type.id } },
      {
        onSuccess: () => {
          toast.success(`Filed as "${type.name}"`, {
            description:
              type.kind === 'procedural'
                ? 'Reading the steps in the background — you’ll see them in a moment.'
                : undefined,
          })
        },
        onError: (err) => toast.error(mapApiError(err)),
        onSettled: () => setPicking(null),
      },
    )
    onOpenChange(false)
  }

  function createNew() {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    const matchedExisting = suggestionMatchesExisting && trimmed === name.trim()
    classifyMut.mutate(
      { docId, body: { name: trimmed, kind } },
      {
        onSuccess: (created) => {
          toast.success(
            matchedExisting ? `Added to "${created.name}"` : `Filed as "${created.name}"`,
            {
              description:
                kind === 'procedural'
                  ? 'Reading the steps in the background — you’ll see them in a moment.'
                  : undefined,
            },
          )
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[92vh] sm:max-h-[920px] sm:w-[92vw] sm:max-w-6xl sm:rounded-lg">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Classify this document</DialogTitle>
          <DialogDescription>
            Check the preview on the left, then pick a category it belongs to — or create a new one.
            Staff will find it by that category from now on.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto border-b px-6 py-5 md:border-b-0 md:border-r">
            <DocPreview docId={docId} />
          </div>

          <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
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
                  <ul className="min-w-0 space-y-1.5">
                    {types.map((t) => (
                      <li key={t.id} className="min-w-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => assignExisting(t)}
                          className={cn(
                            'flex w-full min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                            picking === t.id ? 'border-primary bg-primary/5' : 'hover:bg-accent',
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
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="classify-name" className="text-sm">
                      Category name
                    </Label>
                    <button
                      type="button"
                      onClick={suggestName}
                      disabled={busy || suggesting}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                        suggesting
                          ? 'cursor-wait text-muted-foreground'
                          : 'cursor-pointer text-sky-700 hover:bg-sky-500/10 dark:text-sky-300',
                        busy ? 'cursor-not-allowed opacity-60' : '',
                      )}
                    >
                      {suggesting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          Thinking…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                          Suggest with AI
                        </>
                      )}
                    </button>
                  </div>
                  <Input
                    id="classify-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value.slice(0, 80))
                      if (suggestionHint) setSuggestionHint(null)
                      if (suggestionMatchesExisting) setSuggestionMatchesExisting(false)
                    }}
                    placeholder="e.g. Cellar log, Supplier contacts, Closing checklist"
                    disabled={busy}
                    autoFocus
                  />
                  {suggestionHint ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">{suggestionHint}</p>
                  ) : fuzzyMatch ? (
                    <p className="text-xs text-muted-foreground">
                      Did you mean{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setName(fuzzyMatch.name)
                          setKind(fuzzyMatch.kind)
                          setSuggestionMatchesExisting(true)
                        }}
                        className="cursor-pointer font-medium text-foreground underline underline-offset-2 hover:text-primary"
                      >
                        “{fuzzyMatch.name}”
                      </button>
                      ? Saving will add this document to it.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">How will staff use it?</Label>
                  <div role="radiogroup" aria-label="Document type" className="flex flex-col gap-2">
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

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-3 sm:gap-2">
          {effectiveMode === 'create' ? (
            <Button onClick={createNew} disabled={busy || !name.trim()} className="cursor-pointer">
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

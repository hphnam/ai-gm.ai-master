'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CATEGORY_LABELS,
  COMPLIANCE_CATEGORIES,
  type ComplianceCategory,
  useCreateExpiryRecord,
} from '@/lib/hooks/use-compliance'
import { useVenues } from '@/lib/hooks/use-venues'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddExpiryDialog({ open, onOpenChange }: Props) {
  const venues = useVenues()
  const create = useCreateExpiryRecord()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ComplianceCategory>('food_hygiene')
  // Native date input gives "YYYY-MM-DD" — we widen to ISO before submit.
  const [expiresAt, setExpiresAt] = useState('')
  const [venueId, setVenueId] = useState<string>('')
  const [personName, setPersonName] = useState('')
  const [assetName, setAssetName] = useState('')
  const [renewalCost, setRenewalCost] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = title.trim().length >= 2 && !!expiresAt && !create.isPending

  const reset = () => {
    setTitle('')
    setCategory('food_hygiene')
    setExpiresAt('')
    setVenueId('')
    setPersonName('')
    setAssetName('')
    setRenewalCost('')
    setError(null)
  }

  const onSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    try {
      // Date input is timezone-naive; treat it as end-of-day in the user's
      // local zone so a Friday cert doesn't trigger reminders one day early
      // in UTC-+1 zones. ISO string keeps the server contract simple.
      const iso = new Date(`${expiresAt}T23:59:00`).toISOString()
      await create.mutateAsync({
        title: title.trim(),
        category,
        expiresAt: iso,
        venueId: venueId || null,
        personName: personName.trim() || null,
        assetName: assetName.trim() || null,
        renewalCostGbp: renewalCost ? Number(renewalCost) : null,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to add expiry record')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add expiry</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-title">What expires?</Label>
            <Input
              id="exp-title"
              placeholder="e.g. Food Hygiene Certificate — Sarah Brown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ComplianceCategory)}>
                <SelectTrigger id="exp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-date">Expires on</Label>
              <Input
                id="exp-date"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-venue">Venue (optional)</Label>
              <Select value={venueId} onValueChange={setVenueId}>
                <SelectTrigger id="exp-venue">
                  <SelectValue placeholder="All venues" />
                </SelectTrigger>
                <SelectContent>
                  {(venues.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-cost">Renewal cost (£, optional)</Label>
              <Input
                id="exp-cost"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={renewalCost}
                onChange={(e) => setRenewalCost(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-person">Person (optional)</Label>
              <Input
                id="exp-person"
                placeholder="e.g. Sarah Brown"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-asset">Asset (optional)</Label>
              <Input
                id="exp-asset"
                placeholder="e.g. Beer line"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          {error ? (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {create.isPending ? 'Saving…' : 'Add expiry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

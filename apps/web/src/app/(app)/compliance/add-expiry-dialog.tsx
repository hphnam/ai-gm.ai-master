'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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

const FormSchema = z.object({
  title: z.string().trim().min(2),
  category: z.enum(COMPLIANCE_CATEGORIES),
  expiresAt: z.string().min(1),
  venueId: z.string(),
  personName: z.string(),
  assetName: z.string(),
  renewalCost: z.string(),
})

type FormValues = z.infer<typeof FormSchema>

const DEFAULT_VALUES: FormValues = {
  title: '',
  category: 'food_hygiene',
  expiresAt: '',
  venueId: '',
  personName: '',
  assetName: '',
  renewalCost: '',
}

export function AddExpiryDialog({ open, onOpenChange }: Props) {
  const venues = useVenues()
  const create = useCreateExpiryRecord()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const title = form.watch('title')
  const expiresAt = form.watch('expiresAt')
  const canSubmit = title.trim().length >= 2 && !!expiresAt && !create.isPending

  const reset = () => {
    form.reset(DEFAULT_VALUES)
    setError(null)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const iso = new Date(`${values.expiresAt}T23:59:00`).toISOString()
      await create.mutateAsync({
        title: values.title.trim(),
        category: values.category,
        expiresAt: iso,
        venueId: values.venueId || null,
        personName: values.personName.trim() || null,
        assetName: values.assetName.trim() || null,
        renewalCostGbp: values.renewalCost ? Number(values.renewalCost) : null,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to add expiry record')
    }
  })

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
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 pt-2" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1.5 space-y-0">
                  <FormLabel>What expires?</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Food Hygiene Certificate — Sarah Brown"
                      maxLength={200}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 space-y-0">
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as ComplianceCategory)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPLIANCE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 space-y-0">
                    <FormLabel>Expires on</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="venueId"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 space-y-0">
                    <FormLabel>Venue (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All venues" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(venues.data ?? []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renewalCost"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 space-y-0">
                    <FormLabel>Renewal cost (£, optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step={1} placeholder="0" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="personName"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 space-y-0">
                    <FormLabel>Person (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Sarah Brown" maxLength={120} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assetName"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 space-y-0">
                    <FormLabel>Asset (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Beer line" maxLength={120} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {create.isPending ? 'Saving…' : 'Add expiry'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

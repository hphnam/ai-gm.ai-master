'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { DocDetailDto } from '@/generated/api'
import { useUpdateDoc } from '@/lib/hooks/use-docs'
import { useVenues } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'

const GLOBAL_VENUE = '__global__'
const NO_PURPOSE = '__none__'

const Schema = z.object({
  title: z.string().trim().min(1, 'Title required').max(200),
  venueId: z.union([z.string().uuid(), z.null()]),
  description: z.string().trim().max(1_000),
  docPurpose: z.union([z.literal('org_chart'), z.null()]),
})
type Values = z.infer<typeof Schema>

// `Context from uploader: …\n\n---\n\n<body>` — mirrors composeContent on the
// backend so the user can see (and edit) the brief that was prepended at upload.
const PREFIX_RE = /^Context from uploader: ([\s\S]*?)\n\n---\n\n/

function extractDescription(content: string): string {
  const m = PREFIX_RE.exec(content)
  return m?.[1]?.trim() ?? ''
}

export function EditDocModal({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocDetailDto
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: venues } = useVenues()
  const updateDoc = useUpdateDoc()

  const initialDescription = extractDescription(doc.content)

  const initialPurpose = doc.docPurpose ?? null

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      title: doc.title ?? '',
      venueId: doc.venueId,
      description: initialDescription,
      docPurpose: initialPurpose,
    },
  })

  // When the modal re-opens for a different doc, reset the form to its values.
  useEffect(() => {
    if (open) {
      form.reset({
        title: doc.title ?? '',
        venueId: doc.venueId,
        description: initialDescription,
        docPurpose: initialPurpose,
      })
    }
  }, [open, doc.id, doc.title, doc.venueId, initialDescription, initialPurpose, form])

  async function onSubmit(values: Values) {
    const body: {
      title?: string
      venueId?: string | null
      description?: string
      docPurpose?: 'org_chart' | null
    } = {}
    if (values.title !== (doc.title ?? '')) body.title = values.title
    if (values.venueId !== doc.venueId) body.venueId = values.venueId
    if (values.description !== initialDescription) body.description = values.description
    if (values.docPurpose !== initialPurpose) body.docPurpose = values.docPurpose
    if (Object.keys(body).length === 0) {
      onOpenChange(false)
      return
    }
    try {
      await updateDoc.mutateAsync({ id: doc.id, body })
      toast.success('Saved — re-processing in background')
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = updateDoc.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Save your changes and the AI will re-process this doc with the new details. Your
            category stays the same.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={submitting} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venueId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select
                    value={field.value ?? GLOBAL_VENUE}
                    onValueChange={(v) => field.onChange(v === GLOBAL_VENUE ? null : v)}
                    disabled={submitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GLOBAL_VENUE}>Global (applies to all venues)</SelectItem>
                      {(venues ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="docPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Role{' '}
                    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <Select
                    value={field.value ?? NO_PURPOSE}
                    onValueChange={(v) => field.onChange(v === NO_PURPOSE ? null : 'org_chart')}
                    disabled={submitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PURPOSE}>None</SelectItem>
                      <SelectItem value="org_chart">Org chart</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Pin this doc as the org chart so chat answers about reporting and escalation
                    pull from it directly. Replaces any other org chart on the same venue.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    AI brief{' '}
                    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="One or two sentences telling the AI what this is and when it applies."
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Prepended to the document content so retrieval and classification see your
                    intent hint.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

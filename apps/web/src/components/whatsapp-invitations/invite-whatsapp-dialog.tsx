'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ApiError } from '@/lib/api-client'
import {
  type CreateWhatsappInviteResponse,
  useCreateWhatsappInvite,
} from '@/lib/hooks/use-whatsapp-invites'
import { mapApiError } from '@/lib/map-api-error'

// Mirror the API contract — z.regex enforces E.164.
const FormSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Use E.164 format (e.g. +447700900001)'),
  role: z.enum(['staff', 'manager']),
  note: z.string().max(120).optional(),
})
type FormValues = z.infer<typeof FormSchema>

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  return ok
}

type DialogStage =
  | { kind: 'form' }
  | { kind: 'cross-org-confirm'; values: FormValues }
  | { kind: 'code-display'; response: CreateWhatsappInviteResponse }

export function InviteWhatsappDialog() {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<DialogStage>({ kind: 'form' })
  const mutation = useCreateWhatsappInvite()

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { phoneNumber: '', role: 'staff', note: '' },
  })

  const reset = () => {
    setStage({ kind: 'form' })
    form.reset({ phoneNumber: '', role: 'staff', note: '' })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await mutation.mutateAsync({
        input: {
          phoneNumber: values.phoneNumber,
          role: values.role,
          note: values.note?.trim() ? values.note.trim() : undefined,
        },
      })
      setStage({ kind: 'code-display', response })
    } catch (err) {
      // The orval-generated ApiErrorCode union is stale (Task 1 added
      // phone_linked_other_org to the API after the last orval regen).
      // Widen via string compare so the dialog can branch into the
      // cross-org confirmation stage instead of toasting and bailing.
      if (err instanceof ApiError && (err.code as string) === 'phone_linked_other_org') {
        setStage({ kind: 'cross-org-confirm', values })
        return
      }
      toast.error(mapApiError(err))
    }
  })

  const onForceConfirm = async () => {
    if (stage.kind !== 'cross-org-confirm') return
    try {
      const response = await mutation.mutateAsync({
        input: {
          phoneNumber: stage.values.phoneNumber,
          role: stage.values.role,
          note: stage.values.note?.trim() ? stage.values.note.trim() : undefined,
        },
        force: true,
      })
      setStage({ kind: 'code-display', response })
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
          Invite via WhatsApp
        </Button>
      </DialogTrigger>

      <DialogContent>
        {stage.kind === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Invite via WhatsApp</DialogTitle>
              <DialogDescription>
                Generates an 8-character code valid for 24 hours. Share it with the staff member
                directly — they reply to the GM AI WhatsApp number with the code to verify.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          autoComplete="tel"
                          placeholder="+447700900001"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use the international E.164 format with the leading +.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          maxLength={120}
                          placeholder="Friday closing supervisor"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Internal note to remind you who this invite is for. Max 120 chars.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Generating…' : 'Generate code'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {stage.kind === 'cross-org-confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Number registered elsewhere</DialogTitle>
              <DialogDescription>
                {stage.values.phoneNumber} is already linked to another organisation. Confirm with
                the user before issuing this invite — they&rsquo;ll appear in both organisations
                after redemption.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStage({ kind: 'form' })}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={onForceConfirm}
              >
                {mutation.isPending ? 'Issuing…' : 'Issue anyway'}
              </Button>
            </DialogFooter>
          </>
        )}

        {stage.kind === 'code-display' && (
          <>
            <DialogHeader>
              <DialogTitle>Code ready — share it now</DialogTitle>
              <DialogDescription>
                Copy this code and send it to the staff member. We&rsquo;ll only show it once —
                closing this dialog clears it.
              </DialogDescription>
            </DialogHeader>
            <div aria-live="polite" className="rounded-md border bg-muted/40 p-4 text-center">
              <p className="font-mono text-3xl font-bold tracking-[0.4em]">
                {stage.response.invite.code}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Expires in 24 hours · phone {stage.response.invite.phoneNumberMasked}
              </p>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const ok = await copyToClipboard(stage.response.invite.code)
                  toast[ok ? 'success' : 'error'](
                    ok ? 'Code copied' : 'Copy failed — select and copy manually',
                  )
                }}
                aria-label="Copy invite code"
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden />
                Copy code
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

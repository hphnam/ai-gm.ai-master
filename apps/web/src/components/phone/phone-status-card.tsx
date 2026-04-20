'use client'

import { useState } from 'react'
import { Check, Phone } from 'lucide-react'
import { maskPhone } from '@gm-ai/types'
import { ApiError } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'
import { usePhoneStatus, useUnlinkPhone } from '@/lib/hooks/use-phone'
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
import { PhoneLinkForm } from './phone-link-form'

export function PhoneStatusCard() {
  const status = usePhoneStatus()
  const unlink = useUnlinkPhone()
  const [open, setOpen] = useState(false)

  if (status.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  if (status.isError) {
    const err = status.error
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {err instanceof ApiError ? mapApiError(err) : mapApiError(err)}
      </div>
    )
  }

  const data = status.data
  const linked = !!data?.phoneNumber

  if (linked) {
    async function handleConfirmUnlink() {
      try {
        await unlink.mutateAsync()
      } finally {
        setOpen(false)
      }
    }

    return (
      <section className="rounded-md border p-4">
        <header className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div className="flex-1">
            <p className="text-base font-medium">
              {maskPhone(data!.phoneNumber!)}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Check
                className="h-4 w-4 text-emerald-600"
                aria-hidden
              />
              <span>Verified</span>
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Unlink
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unlink phone number?</DialogTitle>
                <DialogDescription>
                  {`You'll need to re-verify a number before WhatsApp messages can reach this account.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleConfirmUnlink}
                  disabled={unlink.isPending}
                >
                  {unlink.isPending ? 'Unlinking…' : 'Unlink'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>
      </section>
    )
  }

  return (
    <section className="rounded-md border p-4">
      <PhoneLinkForm />
    </section>
  )
}

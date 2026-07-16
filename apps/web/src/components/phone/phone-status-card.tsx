'use client'

import { Check, Info, Phone } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
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
import { SettingCard } from '@/components/ui/setting-card'
import { Skeleton } from '@/components/ui/skeleton'
import { maskPhone } from '@/lib/format'
import { usePhoneStatus, useUnlinkPhone } from '@/lib/hooks/use-phone'
import { mapApiError } from '@/lib/map-api-error'
import { PhoneLinkForm } from './phone-link-form'

export function PhoneStatusCard() {
  const status = usePhoneStatus()
  const unlink = useUnlinkPhone()
  const [open, setOpen] = useState(false)

  if (status.isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />
  }

  if (status.isError) {
    const err = status.error
    return <Alert variant="destructive">{mapApiError(err)}</Alert>
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
      <div className="space-y-4">
        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <header className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
              aria-hidden
            >
              <Phone className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-mono-ledger text-base font-medium text-foreground">
                {maskPhone(data!.phoneNumber!)}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-success">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                <Check className="h-3 w-3" aria-hidden />
                <span>Verified · messaging active</span>
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
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Message GM from this number to ask about sales, log incidents, or set reminders — the
            same assistant you use here, on the go.
          </p>
        </div>
      </div>
    )
  }

  return (
    <SettingCard
      title="Link your number"
      description="We'll text a code to verify it, then GM can reach you here too."
    >
      <PhoneLinkForm />
    </SettingCard>
  )
}

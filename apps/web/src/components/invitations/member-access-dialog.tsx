'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type OrgMember, useUpdateMemberVenues } from '@/lib/hooks/use-org-members'
import { VenueAccessPicker } from './venue-access-picker'

export function MemberAccessDialog({
  member,
  onOpenChange,
}: {
  member: OrgMember | null
  onOpenChange: (open: boolean) => void
}) {
  const update = useUpdateMemberVenues()
  const [venueIds, setVenueIds] = useState<string[]>([])

  // Re-seed the picker whenever a different member opens the dialog.
  useEffect(() => {
    if (member) setVenueIds(member.venueIds)
  }, [member])

  const label = member?.name?.trim() || member?.phoneNumber || member?.email || 'this member'

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Venue access</DialogTitle>
          <DialogDescription>
            Choose which venues <span className="font-medium">{label}</span> can see.
          </DialogDescription>
        </DialogHeader>
        <VenueAccessPicker value={venueIds} onChange={setVenueIds} disabled={update.isPending} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending}
            onClick={async () => {
              if (!member) return
              try {
                await update.mutateAsync({ userId: member.userId, venueIds })
                toast.success(`Updated venue access for ${label}.`)
                onOpenChange(false)
              } catch {
                toast.error(`Couldn't update access for ${label}. Please try again.`)
              }
            }}
          >
            {update.isPending ? 'Saving…' : 'Save access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type InviteStatus = 'pending' | 'accepted' | 'redeemed' | 'revoked' | 'expired' | 'exhausted'

export const INVITE_STATUS: Record<
  InviteStatus,
  { label: string; variant: 'neutral' | 'success' | 'warning' | 'urgent' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  redeemed: { label: 'Redeemed', variant: 'success' },
  revoked: { label: 'Revoked', variant: 'neutral' },
  expired: { label: 'Expired', variant: 'neutral' },
  exhausted: { label: 'Code exhausted', variant: 'urgent' },
}

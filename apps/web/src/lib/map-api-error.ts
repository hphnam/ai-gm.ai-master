import { ApiError } from './api-client'

export function mapApiError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invalid-input':
        return 'Message was not accepted — please shorten or rephrase.'
      case 'venue-not-found':
        return 'Venue not found — pick another from the list.'
      case 'conversation-not-found':
        return 'This conversation no longer exists.'
      case 'message-not-found':
        return 'Assistant message no longer exists.'
      case 'not-assistant-message':
        return "Can't give feedback on your own message."
      case 'not-found':
        return 'Not found.'
      case 'unauthorized':
        return 'Please sign in to continue.'
      case 'forbidden':
        return "You don't have permission to do that."
      case 'email-already-registered':
        return 'An account with that email already exists.'
      case 'invalid-credentials':
        return 'Email or password is incorrect.'
      case 'organization-not-found':
        return 'No organization found for your account.'
      case 'member-not-found':
        return 'Member not found.'
      case 'invalid-redirect':
        return 'That redirect link looks invalid.'
      case 'payload-too-large':
        return 'That request was too large.'
      case 'organization-slug-conflict':
        return "Couldn't create a unique workspace URL — please retry."
      // v0.2 Phase 1 — Invitations (01-02)
      case 'invitation-not-found':
        return "This invitation doesn't exist or has been revoked."
      case 'invitation-expired':
        return 'This invitation has expired. Ask for a new one.'
      case 'invitation-already-accepted':
        return 'This invitation has already been accepted.'
      case 'invitation-email-mismatch':
        return 'This invitation is for a different email. Sign in with the right account to accept.'
      case 'mail-send-failed':
        return "We saved the invitation but couldn't send the email. Copy the link manually."
      case 'invalid-invitation-role':
        return "That role can't be invited. Choose manager or staff."
      case 'invitation-limit-reached':
        return "You've hit the pending-invite limit. Revoke old invites or wait for them to expire."
      case 'already-a-member':
        return 'That email is already a member of this organisation.'
      case 'email-not-verified':
        return 'Verify your email first before accepting this invitation.'
      default:
        return 'Something went wrong — please retry.'
    }
  }
  return 'Network error — please retry.'
}

// 01-02 audit-added S6: terminal vs transient classification for auto-accept flow.
// Terminal codes render once without retry; transient codes show a retry button.
const TERMINAL_INVITATION_CODES = new Set<string>([
  'invitation-not-found',
  'invitation-expired',
  'invitation-already-accepted',
  'invitation-email-mismatch',
  'email-not-verified',
  'already-a-member',
])

export function isTerminalInvitationError(err: unknown): boolean {
  if (err instanceof ApiError) return TERMINAL_INVITATION_CODES.has(err.code)
  return false
}

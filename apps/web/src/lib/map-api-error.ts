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
      // v0.2 Phase 1 — Phone linking (01-03)
      case 'phone-invalid-format':
        return 'Enter a number in international format (e.g. +447700900123).'
      case 'phone-invalid-code':
        return 'Enter the 6-digit code you received by SMS.'
      case 'phone-already-linked':
        return 'That number is already linked to another account.'
      case 'phone-change-requires-unlink':
        return 'You already have a phone linked. Unlink it first to link a different number.'
      case 'phone-verification-failed':
        return 'That code is incorrect or has expired. Request a new code.'
      case 'phone-rate-limited': {
        const retryRaw = (err.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds
        if (typeof retryRaw === 'number' && retryRaw > 0) {
          const minutes = Math.max(1, Math.ceil(retryRaw / 60))
          return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
        }
        return 'Too many attempts. Try again in a few minutes.'
      }
      case 'phone-service-unavailable': {
        const reason = (err.details as { reason?: string } | undefined)?.reason
        if (reason === 'disabled') {
          return 'SMS verification is currently disabled. Contact support if this persists.'
        }
        return 'Phone verification is temporarily unavailable. Try again shortly.'
      }
      // Plan 04-01 audit-S6: per-reason strings for doc extraction failures.
      // Upstream in apps/api/src/modules/docs/docs.controller.ts — 422 with details: { reason }.
      case 'extraction-failed': {
        const reason = (err.details as { reason?: string } | undefined)?.reason
        switch (reason) {
          case 'unsupported-mime':
            return 'That file format is not supported — try .pdf, .docx, .xlsx, .csv, .pptx, or an image.'
          case 'corrupt-bytes':
            return 'That file appears corrupted or the extension does not match its contents.'
          case 'timeout':
            return 'Extraction took too long — try a smaller file.'
          case 'empty-result':
            return 'No text could be extracted from that file.'
          default:
            return "We couldn't read that file — please retry."
        }
      }
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

import { WhatsappInvitationsBody } from '@/components/whatsapp-invitations/whatsapp-invitations-body'

// Plan 03-01 — manager surface for WhatsApp identity binding. The underlying
// API uses @RequireRole('owner', 'manager') on InviteController; showing the
// page to other roles is harmless — the API returns 403 forbidden which the
// body component renders as a notice.
export default function TeamSettingsPage() {
  return (
    <section aria-labelledby="team-settings-title">
      <header className="mb-4">
        <h2 id="team-settings-title" className="text-base font-semibold tracking-tight">
          Team
        </h2>
        <p className="text-xs text-muted-foreground">
          Invite staff to GM AI on WhatsApp. They use the code you generate to verify their phone.
        </p>
      </header>
      <WhatsappInvitationsBody />
    </section>
  )
}

import { PageHeader } from '@/components/shell/page-header'
import { WhatsappInvitationsBody } from '@/components/whatsapp-invitations/whatsapp-invitations-body'

// Plan 03-01 — manager surface for WhatsApp identity binding.
// Server-side role enforcement: the underlying API uses @RequireRole('owner',
// 'manager') on InviteController. Showing the page to other roles is harmless —
// the API returns 403 forbidden which the body component renders as a notice.
export default function TeamSettingsPage() {
  return (
    <>
      <PageHeader
        title="Team"
        description="Invite staff to GM AI on WhatsApp. They use the code you generate to verify their phone."
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <WhatsappInvitationsBody />
        </div>
      </div>
    </>
  )
}

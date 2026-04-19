import { OrganizationSettingsBody } from '@/components/invitations/organization-settings-body'

export default function OrganizationSettingsPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Organisation settings</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates to your organisation. Only owners and managers can create invitations.
        </p>
      </header>
      <OrganizationSettingsBody />
    </section>
  )
}

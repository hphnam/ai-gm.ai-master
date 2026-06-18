import { OrganizationSettingsBody } from '@/components/invitations/organization-settings-body'

export default function OrganizationSettingsPage() {
  return (
    <section aria-labelledby="org-settings-title">
      <header className="mb-4">
        <h2 id="org-settings-title" className="text-base font-semibold tracking-tight">
          Organisation
        </h2>
        <p className="text-xs text-muted-foreground">
          Invite teammates. Only owners and managers can create invitations.
        </p>
      </header>
      <OrganizationSettingsBody />
    </section>
  )
}

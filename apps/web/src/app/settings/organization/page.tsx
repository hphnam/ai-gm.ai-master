import { OrganizationSettingsBody } from '@/components/invitations/organization-settings-body'
import { PageHeader } from '@/components/shell/page-header'

export default function OrganizationSettingsPage() {
  return (
    <>
      <PageHeader
        title="Organisation"
        description="Invite teammates. Only owners and managers can create invitations."
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <OrganizationSettingsBody />
        </div>
      </div>
    </>
  )
}

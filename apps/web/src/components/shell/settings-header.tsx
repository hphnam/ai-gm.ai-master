import { PageHeaderView } from './page-header'

// Shared @header slot for every /settings/* route — the header stays "Settings"
// while the SettingsShell tabs switch the content beneath it.
export default function SettingsHeader() {
  return (
    <PageHeaderView
      title="Settings"
      description="Manage your organisation, team, venues and connections."
    />
  )
}

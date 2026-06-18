import { IntegrationsBody } from '@/components/integrations/integrations-body'

export default function IntegrationsSettingsPage() {
  return (
    <section aria-labelledby="integrations-settings-title">
      <header className="mb-4">
        <h2 id="integrations-settings-title" className="text-base font-semibold tracking-tight">
          Integrations
        </h2>
        <p className="text-xs text-muted-foreground">
          Connect third-party services so the chat agent can read live data — prices, stock, sales,
          recent orders. Managers only.
        </p>
      </header>
      <IntegrationsBody />
    </section>
  )
}

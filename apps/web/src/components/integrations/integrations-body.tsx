'use client'

import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Plug, Unplug } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderMeta,
  type IntegrationSummary,
  useConnectIntegrationPat,
  useDisconnectIntegration,
  useIntegrations,
  useSquareLocations,
  useUpdateVenueSquareLocation,
} from '@/lib/hooks/use-integrations'
import { useVenue, useVenues } from '@/lib/hooks/use-venues'

export function IntegrationsBody() {
  const integrations = useIntegrations()

  if (integrations.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading integrations…
      </div>
    )
  }

  const byProvider = new Map<string, IntegrationSummary>()
  for (const i of integrations.data?.integrations ?? []) {
    byProvider.set(i.provider, i)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {INTEGRATION_PROVIDERS.map((meta) => (
          <ProviderCard key={meta.id} meta={meta} integration={byProvider.get(meta.id) ?? null} />
        ))}
      </div>

      {byProvider.get('square')?.status === 'active' ? <SquareVenueMapping /> : null}
    </div>
  )
}

function ProviderCard({
  meta,
  integration,
}: {
  meta: IntegrationProviderMeta
  integration: IntegrationSummary | null
}) {
  const [connectOpen, setConnectOpen] = useState(false)
  const disconnect = useDisconnectIntegration()

  const status = integration?.status ?? null
  const isActive = status === 'active'
  const isError = status === 'error'

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">{meta.label}</h3>
            <StatusPill status={status} />
            {integration?.environment && integration.environment !== 'production' ? (
              <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {integration.environment}
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">{meta.description}</p>

          {isActive && integration ? (
            <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {integration.externalAccountId ? (
                <p>
                  Connected as <span className="font-mono">{integration.externalAccountId}</span>
                </p>
              ) : null}
              <p>Connected {new Date(integration.connectedAt).toLocaleString()}</p>
              {integration.lastSyncedAt ? (
                <p>Last used {new Date(integration.lastSyncedAt).toLocaleString()}</p>
              ) : null}
            </div>
          ) : null}

          {isError && integration?.lastError ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{integration.lastError}</span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConnectOpen(true)}
                disabled={disconnect.isPending}
              >
                Rotate token
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (
                    confirm(
                      `Disconnect ${meta.label}? The chat agent will stop being able to read live data.`,
                    )
                  ) {
                    disconnect.mutate({ provider: meta.id })
                  }
                }}
                disabled={disconnect.isPending}
              >
                <Unplug className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setConnectOpen(true)}>
              <Plug className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Connect
            </Button>
          )}
        </div>
      </div>

      <ConnectPatDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        meta={meta}
        isRotation={isActive}
      />
    </article>
  )
}

function StatusPill({ status }: { status: string | null }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Connected
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
        <AlertCircle className="h-3 w-3" aria-hidden />
        Error
      </span>
    )
  }
  if (status === 'disconnected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Disconnected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      Not connected
    </span>
  )
}

function ConnectPatDialog({
  open,
  onOpenChange,
  meta,
  isRotation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: IntegrationProviderMeta
  isRotation: boolean
}) {
  const connect = useConnectIntegrationPat()
  const [accessToken, setAccessToken] = useState('')
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('production')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setAccessToken('')
    setEnvironment('production')
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await connect.mutateAsync({
        provider: meta.id,
        accessToken: accessToken.trim(),
        environment: meta.supportsEnvironment ? environment : undefined,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      // ApiError doesn't expose body details directly; surface a sane fallback.
      const apiErr = err as { details?: { message?: string }; status?: number }
      setError(
        apiErr.details?.message ??
          (apiErr.status === 429
            ? 'Too many connect attempts. Try again in a few minutes.'
            : `${meta.label} rejected the token. Check it was copied in full and matches the chosen environment.`),
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRotation ? `Rotate ${meta.label} token` : `Connect ${meta.label}`}
          </DialogTitle>
          <DialogDescription className="text-xs">{meta.tokenHelp}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {meta.supportsEnvironment ? (
            <div className="space-y-1.5">
              <Label htmlFor="env">Environment</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as 'production' | 'sandbox')}
              >
                <SelectTrigger id="env">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="pat">Personal access token</Label>
            <Input
              id="pat"
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAAl…"
              required
              minLength={8}
            />
            <p className="text-[11px] text-muted-foreground">
              <a
                href={meta.docsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline decoration-dotted hover:text-foreground"
              >
                Open {meta.label} developer console
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </p>
          </div>

          {error ? (
            <p className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={connect.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={connect.isPending || accessToken.trim().length < 8}>
              {connect.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                  Validating…
                </>
              ) : isRotation ? (
                'Save new token'
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/// Square location ↔ venue mapping. Only renders when Square is connected.
/// Each venue gets a Select with the Square locations the merchant exposes;
/// "—" clears the mapping. The chat agent reads `Venue.squareLocationId` to
/// scope all `pos_*` calls — without it, tools return a "no location mapped"
/// error.
function SquareVenueMapping() {
  const venues = useVenues()
  const locations = useSquareLocations()
  const update = useUpdateVenueSquareLocation()
  const [pendingVenueId, setPendingVenueId] = useState<string | null>(null)

  if (venues.isLoading || locations.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading venues and Square locations…
      </div>
    )
  }

  const locationOptions = locations.data?.locations ?? []
  const locationError = locations.data?.error ?? null

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">Venue mapping</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Map each venue to a Square location so the chat agent knows which till's data to read when
          staff ask about prices, stock, or sales.
        </p>
      </header>

      {locationError ? (
        <p className="mb-3 flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{locationError}</span>
        </p>
      ) : null}

      <div className="space-y-2">
        {(venues.data ?? []).map((v) => (
          <VenueMappingRow
            key={v.id}
            venueId={v.id}
            venueName={v.name}
            locationOptions={locationOptions}
            saving={pendingVenueId === v.id && update.isPending}
            onChange={async (loc) => {
              setPendingVenueId(v.id)
              try {
                await update.mutateAsync({
                  venueId: v.id,
                  squareLocationId: loc === '__clear__' ? null : loc,
                })
              } finally {
                setPendingVenueId(null)
              }
            }}
          />
        ))}
      </div>
    </section>
  )
}

function VenueMappingRow({
  venueId,
  venueName,
  locationOptions,
  saving,
  onChange,
}: {
  venueId: string
  venueName: string
  locationOptions: Array<{ id: string; name: string | null; address: string | null }>
  saving: boolean
  onChange: (value: string) => void
}) {
  // Pull venue detail for squareLocationId (the list endpoint omits it).
  // React Query dedupes across rows so cost is one /venues/:id per venue.
  const { data: detail } = useVenue(venueId)
  const current = detail?.squareLocationId ?? null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-3 text-sm">
      <div className="flex-1">
        <p className="font-medium">{venueName}</p>
        {current ? (
          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">{current}</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground">No Square location mapped</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={current ?? '__clear__'}
          onValueChange={onChange}
          disabled={saving || locationOptions.length === 0}
        >
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue placeholder="Pick a location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">— Not mapped</SelectItem>
            {locationOptions.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                <span className="block max-w-[20rem] truncate">
                  {loc.name ?? loc.id}
                  {loc.address ? ` · ${loc.address}` : ''}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>
    </div>
  )
}

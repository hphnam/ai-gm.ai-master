'use client'

import { AlertCircle, ChevronDown, ExternalLink, Loader2, Plug, Unplug } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'

export function IntegrationsBody({ isManager }: { isManager: boolean }) {
  const integrations = useIntegrations()

  if (integrations.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {INTEGRATION_PROVIDERS.map((meta) => (
          <div key={meta.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!isManager) {
    return <Alert>Only owners and managers can manage integrations.</Alert>
  }

  const byProvider = new Map<string, IntegrationSummary>()
  for (const i of integrations.data?.integrations ?? []) {
    byProvider.set(i.provider, i)
  }

  return (
    <div className="space-y-3">
      {INTEGRATION_PROVIDERS.map((meta) => (
        <ProviderCard key={meta.id} meta={meta} integration={byProvider.get(meta.id) ?? null} />
      ))}
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
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const disconnect = useDisconnectIntegration()

  const status = integration?.status ?? null
  const isActive = status === 'active'
  const isError = status === 'error'
  // Surface the detail by default when there's something worth seeing (live
  // connection meta + venue mapping, or an error to act on).
  const [expanded, setExpanded] = useState(isActive || isError)
  // Re-reveal on a transition into active/error (e.g. right after connecting)
  // so the Square venue mapping isn't left collapsed on this still-mounted card.
  const prevStatus = useRef(status)
  useEffect(() => {
    const was = prevStatus.current
    prevStatus.current = status
    if (status !== was && (status === 'active' || status === 'error')) setExpanded(true)
  }, [status])
  const bodyId = `integration-${meta.id}-detail`

  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={expanded ? bodyId : undefined}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <span
            className="font-mono-ledger flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-[17px] font-bold text-muted-foreground"
            aria-hidden
          >
            {meta.label.charAt(0)}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {meta.label}
            </span>
            <StatusPill status={status} />
            {integration?.environment && integration.environment !== 'production' ? (
              <Badge variant="outline" size="sm">
                {integration.environment}
              </Badge>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
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
                onClick={() => setDisconnectOpen(true)}
                disabled={disconnect.isPending}
              >
                <Unplug className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setConnectOpen(true)}
              className="shadow-[0_2px_0_var(--brass-shadow)]"
            >
              <Plug className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Connect
            </Button>
          )}
        </div>
      </div>

      {expanded ? (
        <div id={bodyId} className="border-t px-4 py-4">
          <p className="max-w-xl text-sm text-muted-foreground">{meta.description}</p>

          {isActive && integration ? (
            <p className="font-mono-ledger mt-2 text-[11px] text-muted-foreground">
              {integration.externalAccountId
                ? `Connected as ${integration.externalAccountId} · `
                : ''}
              since {new Date(integration.connectedAt).toLocaleDateString()}
              {integration.lastSyncedAt
                ? ` · last used ${new Date(integration.lastSyncedAt).toLocaleDateString()}`
                : ''}
            </p>
          ) : null}

          {isError && integration?.lastError ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{integration.lastError}</span>
            </p>
          ) : null}

          {isActive && meta.id === 'square' ? <SquareVenueMapping /> : null}
        </div>
      ) : null}

      <ConnectPatDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        meta={meta}
        isRotation={isActive}
      />

      <ConfirmDeleteDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title={`Disconnect ${meta.label}?`}
        description="The chat agent will stop being able to read live data."
        confirmLabel="Disconnect"
        isPending={disconnect.isPending}
        onConfirm={() => disconnect.mutateAsync({ provider: meta.id })}
      />
    </article>
  )
}

function StatusPill({ status }: { status: string | null }) {
  if (status === 'active') {
    return (
      <Badge variant="success" size="sm">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        Connected
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge variant="urgent" size="sm">
        <AlertCircle className="h-3 w-3" aria-hidden />
        Error
      </Badge>
    )
  }
  if (status === 'disconnected') {
    return (
      <Badge variant="neutral" size="sm">
        Disconnected
      </Badge>
    )
  }
  return (
    <Badge variant="neutral" size="sm">
      Not connected
    </Badge>
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
            <Button
              type="submit"
              disabled={connect.isPending || accessToken.trim().length < 8}
              className="shadow-[0_2px_0_var(--brass-shadow)]"
            >
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
      <div className="mt-4 border-t pt-4" aria-busy="true">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    )
  }

  const locationOptions = locations.data?.locations ?? []
  const locationError = locations.data?.error ?? null

  return (
    <div className="mt-4 border-t pt-4">
      <header className="mb-3">
        <h3 className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
          Venue mapping
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Map each venue to a Square location so the chat agent knows which till's data to read when
          staff ask about prices, stock, or sales.
        </p>
      </header>

      {locationError ? (
        <p className="mb-3 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
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
    </div>
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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
      <div className="flex-1">
        <p className="font-medium">{venueName}</p>
        {current ? (
          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">{current}</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground">No Square location mapped</p>
        )}
      </div>
      <div className="flex flex-1 items-center gap-2 sm:flex-none">
        <Select
          value={current ?? '__clear__'}
          onValueChange={onChange}
          disabled={saving || locationOptions.length === 0}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-56">
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

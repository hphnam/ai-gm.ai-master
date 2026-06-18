'use client'

import { ArrowRight, Check, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  usePricingRecommendationsControllerAdopt,
  usePricingRecommendationsControllerDismiss,
  usePricingRecommendationsControllerGetOne,
} from '@/generated/api'
import { ApiError } from '@/lib/api-client'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type RecStatus = 'pending' | 'adopted' | 'dismissed'

type RecommendationData = {
  id: string
  status: RecStatus
  venueId: string
  sourceItemLabel: string
  currentPriceCents: number
  recommendedPriceCents: number
  rationale: string
}

function describeMutationError(err: unknown, action: 'adopt' | 'dismiss'): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return action === 'adopt'
        ? 'Only managers and owners can adopt pricing suggestions.'
        : 'Only managers and owners can dismiss pricing suggestions.'
    }
    if (err.status === 404) return 'This suggestion no longer exists — refresh to update the view.'
    if (err.status >= 500) {
      return action === 'adopt'
        ? "Couldn't confirm if the adopt went through — refresh to check."
        : "Couldn't confirm if the dismiss went through — refresh to check."
    }
  }
  return action === 'adopt'
    ? "Couldn't adopt — check your connection and try again."
    : "Couldn't dismiss — check your connection and try again."
}

function formatPriceGBP(cents: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDeltaPct(current: number, recommended: number): string | null {
  if (current <= 0) return null
  const pct = ((recommended - current) / current) * 100
  if (Math.abs(pct) < 0.5) return null
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function PricingRecommendationCard({ part }: ToolCardRendererProps) {
  const output = part.output
  const okData = isToolOk<RecommendationData>(output) ? output.data : null

  // Local optimistic state — flips immediately on click so the UI feels
  // responsive. Reconciled to server truth on mutation success/error and on
  // initial mount via the hydration query below.
  const [localStatus, setLocalStatus] = useState<RecStatus | null>(null)
  const [adoptedAt, setAdoptedAt] = useState<number | null>(null)

  // Hydration: the tool output is a snapshot at creation time (always
  // 'pending'). On chat-history rehydrate, the real row may already be
  // adopted/dismissed. Fetch the live row once on mount so the card reflects
  // server truth instead of inviting a duplicate click.
  const hydrationQuery = usePricingRecommendationsControllerGetOne(okData?.id ?? '', {
    query: {
      enabled: Boolean(okData) && localStatus === null,
      staleTime: 30_000,
    },
  })
  const hydratedStatus =
    (hydrationQuery.data?.data.recommendation.status as RecStatus | undefined) ?? null

  const adoptMutation = usePricingRecommendationsControllerAdopt()
  const dismissMutation = usePricingRecommendationsControllerDismiss()

  if (isToolFail(output)) {
    return (
      <CardShell icon={TrendingUp} title="Pricing suggestion">
        <CardEmpty message={output.detail ?? "Couldn't log that pricing suggestion."} />
      </CardShell>
    )
  }
  if (!okData) return null
  const data = okData
  const status: RecStatus = localStatus ?? hydratedStatus ?? data.status
  const inFlight = adoptMutation.isPending || dismissMutation.isPending

  const handleAdopt = () => {
    if (inFlight || status !== 'pending') return
    setLocalStatus('adopted')
    setAdoptedAt(data.recommendedPriceCents)
    adoptMutation.mutate(
      { id: data.id, data: {} },
      {
        onError: (err) => {
          setLocalStatus(null)
          setAdoptedAt(null)
          toast.error(describeMutationError(err, 'adopt'))
        },
        onSuccess: (res) => {
          // Server returns the authoritative row; sync the local view to it
          // in case the server picked a different adoptedPriceCents.
          const server = res.data.recommendation
          setAdoptedAt(server.adoptedPriceCents ?? data.recommendedPriceCents)
          toast.success(
            `Adopted at ${formatPriceGBP(server.adoptedPriceCents ?? data.recommendedPriceCents)}.`,
          )
        },
      },
    )
  }

  const handleDismiss = () => {
    if (inFlight || status !== 'pending') return
    setLocalStatus('dismissed')
    dismissMutation.mutate(
      { id: data.id, data: {} },
      {
        onError: (err) => {
          setLocalStatus(null)
          toast.error(describeMutationError(err, 'dismiss'))
        },
      },
    )
  }

  const delta = formatDeltaPct(data.currentPriceCents, data.recommendedPriceCents)

  if (status === 'adopted') {
    const price = adoptedAt ?? data.recommendedPriceCents
    return (
      <CardShell icon={Check} title="Adopted" subtitle={data.sourceItemLabel} tone="success">
        <p className="text-[13px] leading-snug text-foreground" role="status" aria-live="polite">
          Recorded the new price at {formatPriceGBP(price)}. Update it in Square (or your POS) when
          you&apos;re ready — we&apos;ll measure uplift over the next 30 days.
        </p>
      </CardShell>
    )
  }

  if (status === 'dismissed') {
    return (
      <CardShell icon={X} title="Dismissed" subtitle={data.sourceItemLabel}>
        <p
          className="text-[13px] leading-snug text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Won&apos;t resurface this one. The suggestion stays in your history if you want to revisit
          it.
        </p>
      </CardShell>
    )
  }

  return (
    <CardShell icon={TrendingUp} title="Pricing suggestion" subtitle={data.sourceItemLabel}>
      <div className="flex items-baseline gap-2 text-[15px] font-semibold text-foreground">
        <span className="text-muted-foreground line-through decoration-muted-foreground/60">
          {formatPriceGBP(data.currentPriceCents)}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span>{formatPriceGBP(data.recommendedPriceCents)}</span>
        {delta ? (
          <span
            className={
              data.recommendedPriceCents >= data.currentPriceCents
                ? 'rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            }
          >
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-foreground/90">{data.rationale}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAdopt}
          disabled={inFlight}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Adopt
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={inFlight}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Dismiss
        </button>
      </div>
    </CardShell>
  )
}

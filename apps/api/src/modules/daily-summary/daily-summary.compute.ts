import type { ToolResult } from '../../types'
import type { CogsSummary } from '../integrations/square/square-cogs.service'

/// Pure composition + aggregation for the daily summary. Kept free of Nest /
/// Prisma / Redis so the money math (labour %, deltas, sales-weighted group
/// roll-up, null-safety) is unit-testable without a live Square or a DB.

export type VenueDailySummary = {
  venueId: string
  venueName: string
  date: string
  currency: string | null
  netSales: number | null
  grossSales: number | null
  cogs: number | null
  gpPct: number | null
  labourCost: number | null
  labourPct: number | null
  /// Completed tickets (split-paid counted once). NOT guest covers.
  tickets: number | null
  coverageRate: number
  gpDeltaPts: number | null
  labourDeltaPts: number | null
  netSalesPrev: number | null
  connected: boolean
  noData: string | null
}

export type GroupDailySummary = {
  date: string
  currency: string | null
  venues: VenueDailySummary[]
  group: {
    netSales: number | null
    gpPct: number | null
    labourPct: number | null
    gpDeltaPts: number | null
  }
}

/// One day's figures for a venue, before deltas are attached.
export type DayFigures = {
  currency: string | null
  netSales: number | null
  grossSales: number | null
  cogs: number | null
  gpPct: number | null
  labourCost: number | null
  labourPct: number | null
  tickets: number | null
  coverageRate: number
  connected: boolean
  noData: string | null
}

// Structural minimums of the Square return shapes we actually read (the full
// types are anonymous on the service methods).
type LaborLike = { estimatedCost: { value: number; currency: string } | null }
type PaymentLike = { paymentCount: number }

export const NOT_CONNECTED_FIGURES: DayFigures = {
  currency: null,
  netSales: null,
  grossSales: null,
  cogs: null,
  gpPct: null,
  labourCost: null,
  labourPct: null,
  tickets: null,
  coverageRate: 0,
  connected: false,
  noData: null,
}

/// Fold the three Square results into one day's figures. A non-ok COGS result is
/// the "not connected / no location / bad creds" signal → all-null,
/// connected:false. Labour/payment failures degrade individually to null.
export function composeDayFigures(
  cogs: ToolResult<CogsSummary>,
  labour: ToolResult<LaborLike>,
  payments: ToolResult<PaymentLike>,
): DayFigures {
  if (!cogs.ok) {
    return { ...NOT_CONNECTED_FIGURES, noData: cogs.reason }
  }
  const netSales = cogs.data.netSales?.value ?? null
  const labourCost = labour.ok ? (labour.data.estimatedCost?.value ?? null) : null
  const labourPct =
    labourCost !== null && netSales !== null && netSales > 0
      ? round1((labourCost / netSales) * 100)
      : null
  return {
    currency: cogs.data.netSales?.currency ?? cogs.data.grossSales?.currency ?? null,
    netSales,
    grossSales: cogs.data.grossSales?.value ?? null,
    cogs: cogs.data.cogsAmount?.value ?? null,
    gpPct: cogs.data.grossMarginPct,
    labourCost,
    labourPct,
    tickets: payments.ok ? payments.data.paymentCount : null,
    coverageRate: cogs.data.coverageRate,
    connected: true,
    noData: cogs.data.noData?.reason ?? null,
  }
}

/// Attach day-over-day deltas (points) to a venue's current figures.
export function buildVenueSummary(
  venue: { id: string; name: string },
  date: string,
  current: DayFigures,
  prev: DayFigures,
): VenueDailySummary {
  const gpDeltaPts =
    current.gpPct !== null && prev.gpPct !== null ? round1(current.gpPct - prev.gpPct) : null
  const labourDeltaPts =
    current.labourPct !== null && prev.labourPct !== null
      ? round1(current.labourPct - prev.labourPct)
      : null
  return {
    venueId: venue.id,
    venueName: venue.name,
    date,
    ...current,
    gpDeltaPts,
    labourDeltaPts,
    netSalesPrev: prev.netSales,
  }
}

/// Sales-weighted group roll-up. GP% is net-sales-weighted across venues that
/// have both; labour% is blended (Σ labourCost / Σ netSales); the group delta
/// reconstructs each venue's prior GP from its own delta.
export function aggregateVenueSummaries(
  venues: VenueDailySummary[],
  fallbackDate: string,
): GroupDailySummary {
  const date = venues[0]?.date ?? fallbackDate
  const currency = venues.find((v) => v.currency)?.currency ?? null

  let netSum = 0
  let netCount = 0
  let gpWeighted = 0
  let gpWeightNet = 0
  let gpPrevWeighted = 0
  let gpPrevWeightNet = 0
  let labourCostSum = 0
  let labourNetSum = 0

  for (const v of venues) {
    if (v.netSales !== null) {
      netSum += v.netSales
      netCount += 1
    }
    if (v.gpPct !== null && v.netSales !== null && v.netSales > 0) {
      gpWeighted += v.gpPct * v.netSales
      gpWeightNet += v.netSales
      const prevGp = v.gpDeltaPts !== null ? v.gpPct - v.gpDeltaPts : null
      if (prevGp !== null && v.netSalesPrev !== null && v.netSalesPrev > 0) {
        gpPrevWeighted += prevGp * v.netSalesPrev
        gpPrevWeightNet += v.netSalesPrev
      }
    }
    if (v.labourCost !== null && v.netSales !== null && v.netSales > 0) {
      labourCostSum += v.labourCost
      labourNetSum += v.netSales
    }
  }

  const groupGp = gpWeightNet > 0 ? round1(gpWeighted / gpWeightNet) : null
  const groupGpPrev = gpPrevWeightNet > 0 ? gpPrevWeighted / gpPrevWeightNet : null

  return {
    date,
    currency,
    venues,
    group: {
      netSales: netCount > 0 ? round2(netSum) : null,
      gpPct: groupGp,
      labourPct: labourNetSum > 0 ? round1((labourCostSum / labourNetSum) * 100) : null,
      gpDeltaPts: groupGp !== null && groupGpPrev !== null ? round1(groupGp - groupGpPrev) : null,
    },
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

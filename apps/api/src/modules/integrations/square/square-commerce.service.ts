import { Injectable } from '@nestjs/common'
import type { ToolResult } from '../../../types'
import { SquareService } from './square.service'
import { formatMoney, ZERO_DECIMAL_CURRENCIES } from './square-client'
import { resolveWindow, type WindowInput } from './square-window'

const COMMERCE_MAX_HOURS = 24 * 365

// ─── Row types ──────────────────────────────────────────────────────────────

export type DisputeRow = {
  id: string
  state: string | null
  reason: string | null
  amount: { value: number; currency: string } | null
  cardBrand: string | null
  reportedAt: string | null
  dueAt: string | null
}

export type CashDrawerRow = {
  id: string
  state: string | null
  openedAt: string | null
  endedAt: string | null
  closedAt: string | null
  openingCash: { value: number; currency: string } | null
  expectedCash: { value: number; currency: string } | null
  closingCash: { value: number; currency: string } | null
  /// expected − closing in major units. Positive = over (more cash in drawer
  /// than expected); negative = short (cash missing). Null when either side
  /// missing — common for OPEN shifts.
  discrepancy: { value: number; currency: string } | null
  description: string | null
}

export type GiftCardRow = {
  id: string
  state: string | null
  /// Last 4 of the GAN — surfaced so the operator can tie it back to a
  /// physical card without exposing the full number to the agent context.
  gan: string | null
  balance: { value: number; currency: string } | null
  createdAt: string | null
}

export type InvoiceRow = {
  id: string
  invoiceNumber: string | null
  title: string | null
  status: string | null
  amount: { value: number; currency: string } | null
  dueAt: string | null
  recipientName: string | null
  createdAt: string | null
}

export type PayoutRow = {
  id: string
  status: string | null
  amount: { value: number; currency: string } | null
  arrivalDate: string | null
  destinationType: string | null
  createdAt: string | null
}

@Injectable()
export class SquareCommerceService {
  constructor(private readonly square: SquareService) {}

  // ─── Disputes ─────────────────────────────────────────────────────────────

  async listDisputes(
    orgId: string,
    args: { venueId: string; limit?: number; states?: string[] },
  ): Promise<ToolResult<{ disputes: DisputeRow[]; truncated: boolean }>> {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const wantedStates = args.states ? new Set(args.states.map((s) => s.toUpperCase())) : null
    const cap = Math.min(args.limit ?? 50, 200)
    try {
      const rows: DisputeRow[] = []
      const page = await resolved.client.disputes.list({ locationId: resolved.locationId })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN) break
        const row = toDisputeRow(raw as Record<string, unknown>)
        if (wantedStates && row.state && !wantedStates.has(row.state.toUpperCase())) continue
        rows.push(row)
        if (rows.length >= cap) break
      }
      await this.square.touchSync(orgId)
      return { ok: true, data: { disputes: rows, truncated: processed >= MAX_SCAN } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listDisputes', err)
    }
  }

  async getDisputeSummary(
    orgId: string,
    args: { venueId: string },
  ): Promise<
    ToolResult<{
      openCount: number
      totalCount: number
      openAmount: { value: number; currency: string } | null
      byState: Array<{ state: string; count: number }>
      nextDueAt: string | null
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    try {
      let totalCount = 0
      let openCount = 0
      let openMinor = 0n
      let currency: string | null = null
      let nextDueAt: string | null = null
      const stateTally = new Map<string, number>()
      const page = await resolved.client.disputes.list({ locationId: resolved.locationId })
      let processed = 0
      const MAX_SCAN = 1000
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN) break
        const d = raw as Record<string, unknown>
        totalCount += 1
        const state = typeof d.state === 'string' ? d.state : 'UNKNOWN'
        stateTally.set(state, (stateTally.get(state) ?? 0) + 1)
        // "Open" = anything that's not WON / LOST / ACCEPTED — actionable for
        // the operator. Square's state names line up so we can blocklist
        // terminals instead of allow-listing the long open list.
        const isOpen = state !== 'WON' && state !== 'LOST' && state !== 'ACCEPTED'
        if (isOpen) {
          openCount += 1
          const amt = d.amountMoney as { amount?: bigint | number; currency?: string } | undefined
          if (amt?.amount != null) {
            openMinor +=
              typeof amt.amount === 'bigint' ? amt.amount : BigInt(Math.round(amt.amount))
            if (!currency && amt.currency) currency = amt.currency
          }
          const due = typeof d.dueAt === 'string' ? d.dueAt : null
          if (due && (!nextDueAt || due < nextDueAt)) nextDueAt = due
        }
      }
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          openCount,
          totalCount,
          openAmount: currency
            ? { value: Math.round((Number(openMinor) / divisor) * 100) / 100, currency }
            : null,
          byState: Array.from(stateTally.entries())
            .map(([state, count]) => ({ state, count }))
            .sort((a, b) => b.count - a.count),
          nextDueAt,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getDisputeSummary', err)
    }
  }

  // ─── Cash drawer ──────────────────────────────────────────────────────────

  async getCashDrawerSummary(
    orgId: string,
    args: { venueId: string; limit?: number } & WindowInput,
  ): Promise<
    ToolResult<{
      shifts: CashDrawerRow[]
      shiftCount: number
      totalDiscrepancy: { value: number; currency: string } | null
      windowHours: number
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: COMMERCE_MAX_HOURS })
    const cap = Math.min(args.limit ?? 50, 200)
    try {
      const rows: CashDrawerRow[] = []
      let discrepancyMinor = 0n
      let currency: string | null = null
      const page = await resolved.client.cashDrawers.shifts.list({
        locationId: resolved.locationId,
        beginTime: window.startAt,
        endTime: window.endAt,
      })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN || rows.length >= cap) break
        const row = toCashDrawerRow(raw as Record<string, unknown>)
        rows.push(row)
        if (row.discrepancy) {
          discrepancyMinor += BigInt(
            Math.round(
              row.discrepancy.value *
                (ZERO_DECIMAL_CURRENCIES.has(row.discrepancy.currency) ? 1 : 100),
            ),
          )
          if (!currency) currency = row.discrepancy.currency
        }
      }
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          shifts: rows,
          shiftCount: rows.length,
          totalDiscrepancy: currency
            ? { value: Math.round((Number(discrepancyMinor) / divisor) * 100) / 100, currency }
            : null,
          windowHours: window.hours,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getCashDrawerSummary', err)
    }
  }

  // ─── Gift cards ───────────────────────────────────────────────────────────

  async listGiftCards(
    orgId: string,
    args: { limit?: number; state?: string },
  ): Promise<ToolResult<{ giftCards: GiftCardRow[]; truncated: boolean }>> {
    const resolved = await this.square.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    const cap = Math.min(args.limit ?? 50, 200)
    try {
      const rows: GiftCardRow[] = []
      const page = await resolved.client.giftCards.list({
        ...(args.state ? { state: args.state } : {}),
      })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN || rows.length >= cap) break
        rows.push(toGiftCardRow(raw as unknown as Record<string, unknown>))
      }
      await this.square.touchSync(orgId)
      return { ok: true, data: { giftCards: rows, truncated: processed >= MAX_SCAN } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listGiftCards', err)
    }
  }

  async getGiftCardLiability(orgId: string): Promise<
    ToolResult<{
      activeCount: number
      totalLiability: { value: number; currency: string } | null
      truncated: boolean
    }>
  > {
    const resolved = await this.square.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    try {
      let activeCount = 0
      let liabilityMinor = 0n
      let currency: string | null = null
      const page = await resolved.client.giftCards.list({ state: 'ACTIVE' })
      let processed = 0
      const MAX_SCAN = 5000
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN) break
        const g = raw as unknown as Record<string, unknown>
        activeCount += 1
        const balance = g.balanceMoney as
          | { amount?: bigint | number; currency?: string }
          | undefined
        if (balance?.amount != null) {
          liabilityMinor +=
            typeof balance.amount === 'bigint' ? balance.amount : BigInt(Math.round(balance.amount))
          if (!currency && balance.currency) currency = balance.currency
        }
      }
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          activeCount,
          totalLiability: currency
            ? { value: Math.round((Number(liabilityMinor) / divisor) * 100) / 100, currency }
            : null,
          truncated: processed >= MAX_SCAN,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getGiftCardLiability', err)
    }
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async listInvoices(
    orgId: string,
    args: { venueId: string; limit?: number; status?: string[] },
  ): Promise<ToolResult<{ invoices: InvoiceRow[]; truncated: boolean }>> {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const wanted = args.status ? new Set(args.status.map((s) => s.toUpperCase())) : null
    const cap = Math.min(args.limit ?? 50, 200)
    try {
      const rows: InvoiceRow[] = []
      const page = await resolved.client.invoices.list({ locationId: resolved.locationId })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN || rows.length >= cap) break
        const row = toInvoiceRow(raw as Record<string, unknown>)
        if (wanted && row.status && !wanted.has(row.status.toUpperCase())) continue
        rows.push(row)
      }
      await this.square.touchSync(orgId)
      return { ok: true, data: { invoices: rows, truncated: processed >= MAX_SCAN } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listInvoices', err)
    }
  }

  async getInvoiceSummary(
    orgId: string,
    args: { venueId: string },
  ): Promise<
    ToolResult<{
      totalCount: number
      openCount: number
      overdueCount: number
      outstandingAmount: { value: number; currency: string } | null
      nextDueAt: string | null
      truncated: boolean
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    try {
      let totalCount = 0
      let openCount = 0
      let overdueCount = 0
      let outstandingMinor = 0n
      let currency: string | null = null
      let nextDueAt: string | null = null
      const nowMs = Date.now()
      const page = await resolved.client.invoices.list({ locationId: resolved.locationId })
      let processed = 0
      const MAX_SCAN = 1000
      const OPEN_STATES = new Set(['DRAFT', 'UNPAID', 'SCHEDULED', 'PARTIALLY_PAID', 'FAILED'])
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN) break
        totalCount += 1
        const inv = raw as Record<string, unknown>
        const status = typeof inv.status === 'string' ? inv.status : ''
        if (!OPEN_STATES.has(status)) continue
        openCount += 1
        const next = inv.nextPaymentAmountMoney as
          | { amount?: bigint | number; currency?: string }
          | undefined
        if (next?.amount != null) {
          outstandingMinor +=
            typeof next.amount === 'bigint' ? next.amount : BigInt(Math.round(next.amount))
          if (!currency && next.currency) currency = next.currency
        }
        const requests = (inv.paymentRequests ?? []) as Array<Record<string, unknown>>
        const due = requests[0]?.dueDate
        const dueIso = typeof due === 'string' ? due : null
        if (dueIso) {
          if (Date.parse(dueIso) < nowMs) overdueCount += 1
          if (!nextDueAt || dueIso < nextDueAt) nextDueAt = dueIso
        }
      }
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          totalCount,
          openCount,
          overdueCount,
          outstandingAmount: currency
            ? { value: Math.round((Number(outstandingMinor) / divisor) * 100) / 100, currency }
            : null,
          nextDueAt,
          truncated: processed >= MAX_SCAN,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getInvoiceSummary', err)
    }
  }

  // ─── Payouts ──────────────────────────────────────────────────────────────

  async listPayouts(
    orgId: string,
    args: { venueId: string; limit?: number; status?: string } & WindowInput,
  ): Promise<ToolResult<{ payouts: PayoutRow[]; truncated: boolean; windowHours: number }>> {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 720, maxHours: COMMERCE_MAX_HOURS })
    const cap = Math.min(args.limit ?? 25, 100)
    try {
      const rows: PayoutRow[] = []
      const page = await resolved.client.payouts.list({
        locationId: resolved.locationId,
        beginTime: window.startAt,
        endTime: window.endAt,
        ...(args.status ? { status: args.status as 'SENT' | 'PAID' | 'FAILED' } : {}),
      })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN || rows.length >= cap) break
        rows.push(toPayoutRow(raw as unknown as Record<string, unknown>))
      }
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: { payouts: rows, truncated: processed >= MAX_SCAN, windowHours: window.hours },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listPayouts', err)
    }
  }
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function toDisputeRow(raw: Record<string, unknown>): DisputeRow {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    state: typeof raw.state === 'string' ? raw.state : null,
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    amount: formatMoney(raw.amountMoney as { amount?: bigint; currency?: string } | undefined),
    cardBrand: typeof raw.cardBrand === 'string' ? raw.cardBrand : null,
    reportedAt:
      (typeof raw.reportedAt === 'string' && raw.reportedAt) ||
      (typeof raw.reportedDate === 'string' && raw.reportedDate) ||
      null,
    dueAt: typeof raw.dueAt === 'string' ? raw.dueAt : null,
  }
}

function toCashDrawerRow(raw: Record<string, unknown>): CashDrawerRow {
  const expected = formatMoney(
    raw.expectedCashMoney as { amount?: bigint; currency?: string } | undefined,
  )
  const closed = formatMoney(
    raw.closedCashMoney as { amount?: bigint; currency?: string } | undefined,
  )
  // Discrepancy is the cashier's variance: closed − expected. Positive = over
  // (drawer had more than recorded transactions imply), negative = short.
  const discrepancy =
    expected && closed && expected.currency === closed.currency
      ? {
          value: Math.round((closed.value - expected.value) * 100) / 100,
          currency: closed.currency,
        }
      : null
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    state: typeof raw.state === 'string' ? raw.state : null,
    openedAt: typeof raw.openedAt === 'string' ? raw.openedAt : null,
    endedAt: typeof raw.endedAt === 'string' ? raw.endedAt : null,
    closedAt: typeof raw.closedAt === 'string' ? raw.closedAt : null,
    openingCash: formatMoney(
      raw.openedCashMoney as { amount?: bigint; currency?: string } | undefined,
    ),
    expectedCash: expected,
    closingCash: closed,
    discrepancy,
    description: typeof raw.description === 'string' ? raw.description : null,
  }
}

function toGiftCardRow(raw: Record<string, unknown>): GiftCardRow {
  const gan = typeof raw.gan === 'string' ? raw.gan : null
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    state: typeof raw.state === 'string' ? raw.state : null,
    gan: gan ? `••••${gan.slice(-4)}` : null,
    balance: formatMoney(raw.balanceMoney as { amount?: bigint; currency?: string } | undefined),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
  }
}

function toInvoiceRow(raw: Record<string, unknown>): InvoiceRow {
  const recipient = raw.primaryRecipient as Record<string, unknown> | undefined
  const requests = (raw.paymentRequests ?? []) as Array<Record<string, unknown>>
  const amount =
    formatMoney(raw.nextPaymentAmountMoney as { amount?: bigint; currency?: string } | undefined) ??
    formatMoney(
      requests[0]?.computedAmountMoney as { amount?: bigint; currency?: string } | undefined,
    )
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    invoiceNumber: typeof raw.invoiceNumber === 'string' ? raw.invoiceNumber : null,
    title: typeof raw.title === 'string' ? raw.title : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    amount,
    dueAt: typeof requests[0]?.dueDate === 'string' ? (requests[0].dueDate as string) : null,
    recipientName: recipient
      ? typeof recipient.givenName === 'string' || typeof recipient.familyName === 'string'
        ? `${recipient.givenName ?? ''} ${recipient.familyName ?? ''}`.trim() || null
        : typeof recipient.companyName === 'string'
          ? recipient.companyName
          : null
      : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
  }
}

function toPayoutRow(raw: Record<string, unknown>): PayoutRow {
  const dest = raw.destination as { type?: string } | undefined
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    status: typeof raw.status === 'string' ? raw.status : null,
    amount: formatMoney(raw.amountMoney as { amount?: bigint; currency?: string } | undefined),
    arrivalDate: typeof raw.arrivalDate === 'string' ? raw.arrivalDate : null,
    destinationType: typeof dest?.type === 'string' ? dest.type : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
  }
}

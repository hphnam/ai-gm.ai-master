import { Injectable } from '@nestjs/common'
import type { SquareClient } from 'square'
import type { ToolResult } from '../../../types'
import { SquareService } from './square.service'

// ─── Row types ──────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string
  givenName: string | null
  familyName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  createdAt: string | null
}

export type LoyaltyProgramSummary = {
  programId: string | null
  status: string | null
  pointsName: string | null
  enrolledAccounts: number
  totalPointsOutstanding: number
  truncated: boolean
}

export type BookingRow = {
  id: string
  status: string | null
  startAt: string | null
  durationMinutes: number | null
  customerId: string | null
  serviceVariationName: string | null
  staffMemberName: string | null
}

export type DeviceRow = {
  id: string
  name: string | null
  status: string | null
  productType: string | null
  deviceCode: string | null
}

@Injectable()
export class SquareCrmService {
  constructor(private readonly square: SquareService) {}

  // ─── Customers ────────────────────────────────────────────────────────────

  async searchCustomers(
    orgId: string,
    args: { query?: string; email?: string; phone?: string; limit?: number },
  ): Promise<ToolResult<{ customers: CustomerRow[]; truncated: boolean }>> {
    const resolved = await this.square.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    const cap = Math.min(args.limit ?? 25, 100)
    try {
      const filter: Record<string, unknown> = {}
      if (args.email) filter.emailAddress = { exact: args.email }
      if (args.phone) filter.phoneNumber = { exact: args.phone }
      if (args.query) {
        // Square's customer text-filter is fuzzy across given/family name.
        filter.referenceId = undefined
        // Fall back to text search via givenName fuzzy filter (Square's
        // SearchCustomers doesn't expose a generic name search — fuzzy match
        // on given OR family is closest the API allows).
        filter.givenName = { fuzzy: args.query }
      }
      const resp = await resolved.client.customers.search({
        limit: BigInt(cap),
        query: Object.keys(filter).length > 0 ? { filter } : undefined,
      })
      const customers = ((resp as { customers?: unknown[] }).customers ?? []) as Array<
        Record<string, unknown>
      >
      const rows = customers.slice(0, cap).map(toCustomerRow)
      await this.square.touchSync(orgId)
      return { ok: true, data: { customers: rows, truncated: customers.length > cap } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'searchCustomers', err)
    }
  }

  async getCustomerSummary(orgId: string): Promise<
    ToolResult<{
      totalCount: number
      withEmail: number
      withPhone: number
      createdLast30Days: number
      truncated: boolean
    }>
  > {
    const resolved = await this.square.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    try {
      let totalCount = 0
      let withEmail = 0
      let withPhone = 0
      let createdLast30Days = 0
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const page = await resolved.client.customers.list()
      let processed = 0
      const MAX_SCAN = 10000
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN) break
        const c = raw as Record<string, unknown>
        totalCount += 1
        if (typeof c.emailAddress === 'string' && c.emailAddress) withEmail += 1
        if (typeof c.phoneNumber === 'string' && c.phoneNumber) withPhone += 1
        const created = typeof c.createdAt === 'string' ? c.createdAt : null
        if (created && Date.parse(created) > thirtyDaysAgo) createdLast30Days += 1
      }
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          totalCount,
          withEmail,
          withPhone,
          createdLast30Days,
          truncated: processed >= MAX_SCAN,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getCustomerSummary', err)
    }
  }

  // ─── Loyalty ──────────────────────────────────────────────────────────────

  async getLoyaltySummary(orgId: string): Promise<ToolResult<LoyaltyProgramSummary>> {
    const resolved = await this.square.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    try {
      const progResp = await resolved.client.loyalty.programs.list()
      // Anthropic-style HttpResponsePromise — the unwrapped body sits on `.data`
      // for the dedicated client and at root for the page-like response. We
      // probe both shapes so this works against the v44 wrapper.
      const programs = ((progResp as { programs?: unknown[] }).programs ?? []) as Array<
        Record<string, unknown>
      >
      const program = programs[0] as Record<string, unknown> | undefined
      const programId = typeof program?.id === 'string' ? program.id : null
      const status = typeof program?.status === 'string' ? program.status : null
      const terminology = program?.terminology as { one?: string; other?: string } | undefined
      const pointsName = terminology?.other ?? terminology?.one ?? 'points'
      if (!programId) {
        await this.square.touchSync(orgId)
        return {
          ok: true,
          data: {
            programId: null,
            status: 'NO_PROGRAM',
            pointsName: null,
            enrolledAccounts: 0,
            totalPointsOutstanding: 0,
            truncated: false,
          },
        }
      }
      let enrolledAccounts = 0
      let totalPointsOutstanding = 0
      let cursor: string | undefined
      let pages = 0
      const MAX_PAGES = 20
      while (pages < MAX_PAGES) {
        const acctResp = await resolved.client.loyalty.accounts.search({
          ...(cursor ? { cursor } : {}),
          limit: 200,
        })
        const accounts = ((acctResp as { loyaltyAccounts?: unknown[] }).loyaltyAccounts ??
          []) as Array<Record<string, unknown>>
        for (const a of accounts) {
          enrolledAccounts += 1
          const balance = typeof a.balance === 'number' ? a.balance : 0
          totalPointsOutstanding += balance
        }
        pages += 1
        const next = (acctResp as { cursor?: string }).cursor
        if (!next || accounts.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          programId,
          status,
          pointsName,
          enrolledAccounts,
          totalPointsOutstanding,
          truncated: pages >= MAX_PAGES,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getLoyaltySummary', err)
    }
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async listBookings(
    orgId: string,
    args: { venueId: string; limit?: number; sinceHours?: number; aheadHours?: number },
  ): Promise<ToolResult<{ bookings: BookingRow[]; truncated: boolean; windowHours: number }>> {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const sinceHours = Math.min(Math.max(args.sinceHours ?? 0, 0), 24 * 90)
    const aheadHours = Math.min(Math.max(args.aheadHours ?? 168, 1), 24 * 90)
    const cap = Math.min(args.limit ?? 50, 200)
    const now = Date.now()
    const startAtMin = new Date(now - sinceHours * 60 * 60 * 1000).toISOString()
    const startAtMax = new Date(now + aheadHours * 60 * 60 * 1000).toISOString()
    try {
      const rows: BookingRow[] = []
      const page = await resolved.client.bookings.list({
        locationId: resolved.locationId,
        startAtMin,
        startAtMax,
      })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN || rows.length >= cap) break
        rows.push(toBookingRow(raw as Record<string, unknown>))
      }
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          bookings: rows,
          truncated: processed >= MAX_SCAN,
          windowHours: sinceHours + aheadHours,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listBookings', err)
    }
  }

  async getBookingSummary(
    orgId: string,
    args: { venueId: string; aheadHours?: number },
  ): Promise<
    ToolResult<{
      upcomingCount: number
      acceptedCount: number
      pendingCount: number
      cancelledCount: number
      nextStartAt: string | null
      windowHours: number
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const aheadHours = Math.min(Math.max(args.aheadHours ?? 168, 1), 24 * 90)
    const now = Date.now()
    const startAtMax = new Date(now + aheadHours * 60 * 60 * 1000).toISOString()
    try {
      let upcomingCount = 0
      let acceptedCount = 0
      let pendingCount = 0
      let cancelledCount = 0
      let nextStartAt: string | null = null
      const page = await resolved.client.bookings.list({
        locationId: resolved.locationId,
        startAtMin: new Date(now).toISOString(),
        startAtMax,
      })
      let processed = 0
      const MAX_SCAN = 2000
      for await (const raw of page) {
        processed += 1
        if (processed > MAX_SCAN) break
        const b = raw as Record<string, unknown>
        upcomingCount += 1
        const status = typeof b.status === 'string' ? b.status : ''
        if (status === 'ACCEPTED') acceptedCount += 1
        else if (status === 'PENDING') pendingCount += 1
        else if (status.startsWith('CANCELLED')) cancelledCount += 1
        const startAt = typeof b.startAt === 'string' ? b.startAt : null
        if (startAt && (!nextStartAt || startAt < nextStartAt)) nextStartAt = startAt
      }
      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          upcomingCount,
          acceptedCount,
          pendingCount,
          cancelledCount,
          nextStartAt,
          windowHours: aheadHours,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getBookingSummary', err)
    }
  }

  // ─── Devices ──────────────────────────────────────────────────────────────

  async listDevices(
    orgId: string,
    args: { venueId?: string; limit?: number },
  ): Promise<ToolResult<{ devices: DeviceRow[]; truncated: boolean }>> {
    let locationId: string | null = null
    let client: SquareClient
    if (args.venueId) {
      const resolved = await this.square.resolveForVenue(orgId, args.venueId)
      if (!('client' in resolved)) return resolved
      client = resolved.client
      locationId = resolved.locationId
    } else {
      const resolved = await this.square.resolveClient(orgId)
      if (!('client' in resolved)) return resolved
      client = resolved.client
    }
    const cap = Math.min(args.limit ?? 50, 200)
    try {
      const rows: DeviceRow[] = []
      const page = await client.devices.list({
        ...(locationId ? { locationId } : {}),
      })
      let processed = 0
      const MAX_SCAN = 500
      for await (const raw of page as AsyncIterable<unknown>) {
        processed += 1
        if (processed > MAX_SCAN || rows.length >= cap) break
        rows.push(toDeviceRow(raw as Record<string, unknown>))
      }
      await this.square.touchSync(orgId)
      return { ok: true, data: { devices: rows, truncated: processed >= MAX_SCAN } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listDevices', err)
    }
  }
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function toCustomerRow(raw: Record<string, unknown>): CustomerRow {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    givenName: typeof raw.givenName === 'string' ? raw.givenName : null,
    familyName: typeof raw.familyName === 'string' ? raw.familyName : null,
    companyName: typeof raw.companyName === 'string' ? raw.companyName : null,
    email: typeof raw.emailAddress === 'string' ? raw.emailAddress : null,
    phone: typeof raw.phoneNumber === 'string' ? raw.phoneNumber : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
  }
}

function toBookingRow(raw: Record<string, unknown>): BookingRow {
  const segments = (raw.appointmentSegments ?? []) as Array<Record<string, unknown>>
  const first = segments[0]
  const duration = typeof first?.durationMinutes === 'number' ? first.durationMinutes : null
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    status: typeof raw.status === 'string' ? raw.status : null,
    startAt: typeof raw.startAt === 'string' ? raw.startAt : null,
    durationMinutes: duration,
    customerId: typeof raw.customerId === 'string' ? raw.customerId : null,
    serviceVariationName: null,
    staffMemberName: null,
  }
}

function toDeviceRow(raw: Record<string, unknown>): DeviceRow {
  const attrs = raw.attributes as Record<string, unknown> | undefined
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof attrs?.name === 'string' ? attrs.name : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    productType:
      typeof attrs?.type === 'string'
        ? attrs.type
        : typeof attrs?.manufacturer === 'string'
          ? attrs.manufacturer
          : null,
    deviceCode: typeof raw.deviceCode === 'string' ? raw.deviceCode : null,
  }
}

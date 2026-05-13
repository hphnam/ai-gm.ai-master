/**
 * TEMPORARY — replaced by Xero/Square integration in a later milestone.
 * These methods back the `mock_*` Prisma models. The public shape (ToolResult<...>)
 * is stable across the migration; only the data source changes.
 */
import { Injectable } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { fail, ok, type ToolResult } from '../../types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertVenueId(venueId: string): ToolResult<never> | null {
  if (!UUID_RE.test(venueId)) return fail('error', 'invalid venueId')
  return null
}

async function guarded<T>(fn: () => Promise<ToolResult<T>>): Promise<ToolResult<T>> {
  try {
    return await fn()
  } catch (err) {
    return fail('error', (err as Error).message ?? 'unknown error')
  }
}

export type MockStockBelowPar = {
  id: string
  name: string
  sku: string | null
  unit: string
  currentQty: number
  parLevel: number
  reorderQty: number
  supplierName: string | null
  categoryName: string
}

export type MockStockMatch = {
  id: string
  name: string
  sku: string | null
  unit: string
  currentQty: number
  parLevel: number
  categoryName: string
}

export type MockSupplierMatch = {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  leadTimeDays: number
}

export type MockUpcomingCutoff = {
  supplierId: string
  supplierName: string
  leadTimeDays: number
  estimatedDeliveryHours: number
  stockCount: number
  contactName: string | null
  phone: string | null
  supplierNotes: string | null
}

@Injectable()
export class MockOpsService {
  async getStockBelowPar(venueId: string): Promise<ToolResult<MockStockBelowPar[]>> {
    const bad = assertVenueId(venueId)
    if (bad) return bad
    return guarded(async () => {
      const all = await prisma.mockStock.findMany({
        where: { venueId },
        include: { supplier: true, category: true },
      })
      const below = all.filter((s) => Number(s.currentQty) < Number(s.parLevel))
      if (below.length === 0) {
        return fail('no-data', `no stock items below par for venueId=${venueId}`)
      }
      const mapped = below
        .map((s) => ({
          id: s.id,
          name: s.name,
          sku: s.sku,
          unit: s.unit,
          currentQty: Number(s.currentQty),
          parLevel: Number(s.parLevel),
          reorderQty: Number(s.reorderQty),
          supplierName: s.supplier?.name ?? null,
          categoryName: s.category.name,
          _depletionRatio: (Number(s.parLevel) - Number(s.currentQty)) / Number(s.parLevel),
        }))
        .sort((a, b) => b._depletionRatio - a._depletionRatio || a.name.localeCompare(b.name))
        .map(({ _depletionRatio, ...rest }) => rest)
      return ok(mapped)
    })
  }

  async getStockByName(venueId: string, name: string): Promise<ToolResult<MockStockMatch[]>> {
    const bad = assertVenueId(venueId)
    if (bad) return bad
    if (!name || name.trim().length === 0) return fail('error', 'empty name')
    return guarded(async () => {
      const rows = await prisma.mockStock.findMany({
        where: { venueId, name: { contains: name, mode: 'insensitive' } },
        include: { category: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 5,
      })
      if (rows.length === 0) {
        return fail('no-data', `no stock matching "${name}" for venueId=${venueId}`)
      }
      return ok(
        rows.map((s) => ({
          id: s.id,
          name: s.name,
          sku: s.sku,
          unit: s.unit,
          currentQty: Number(s.currentQty),
          parLevel: Number(s.parLevel),
          categoryName: s.category.name,
        })),
      )
    })
  }

  async getSupplierByName(name: string): Promise<ToolResult<MockSupplierMatch[]>> {
    if (!name || name.trim().length === 0) return fail('error', 'empty name')
    return guarded(async () => {
      const rows = await prisma.mockSupplier.findMany({
        where: { name: { contains: name, mode: 'insensitive' } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 5,
      })
      if (rows.length === 0) {
        return fail('no-data', `no supplier matching "${name}"`)
      }
      return ok(
        rows.map((s) => ({
          id: s.id,
          name: s.name,
          contactName: s.contactName,
          email: s.email,
          phone: s.phone,
          leadTimeDays: s.leadTimeDays,
        })),
      )
    })
  }

  async getUpcomingCutoffs(
    venueId: string,
    withinHours = 48,
  ): Promise<ToolResult<MockUpcomingCutoff[]>> {
    const bad = assertVenueId(venueId)
    if (bad) return bad
    return guarded(async () => {
      const rows = await prisma.mockSupplier.findMany({
        where: { mockStock: { some: { venueId } } },
        include: { _count: { select: { mockStock: { where: { venueId } } } } },
        orderBy: [{ leadTimeDays: 'asc' }, { id: 'asc' }],
      })
      const filtered: MockUpcomingCutoff[] = rows
        .map((s) => ({
          supplierId: s.id,
          supplierName: s.name,
          leadTimeDays: s.leadTimeDays,
          estimatedDeliveryHours: s.leadTimeDays * 24,
          stockCount: s._count.mockStock,
          contactName: s.contactName,
          phone: s.phone,
          supplierNotes: s.notes,
        }))
        .filter((r) => r.estimatedDeliveryHours <= withinHours)
      if (filtered.length === 0) {
        return fail('no-data', `no suppliers within ${withinHours}h for venueId=${venueId}`)
      }
      return ok(filtered)
    })
  }
}

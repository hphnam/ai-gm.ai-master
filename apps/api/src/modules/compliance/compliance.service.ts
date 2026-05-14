import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { ExpiryRecord as PrismaExpiryRecord } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { EXPIRY_STATUSES, type ExpiryStatus } from './dto/compliance.dto'

export type ExpiryRecordRow = {
  id: string
  organizationId: string
  venueId: string | null
  knowledgeItemId: string | null
  title: string
  category: string
  expiresAt: string
  personUserId: string | null
  personName: string | null
  assetName: string | null
  renewalCostGbp: number | null
  status: ExpiryStatus
  reminded30At: string | null
  reminded7At: string | null
  reminded1At: string | null
  remindedOverdueAt: string | null
  extractionConfidence: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const EXPIRY_STATUS_SET = new Set<ExpiryStatus>(EXPIRY_STATUSES)

const DAY_MS = 24 * 60 * 60 * 1000

export type ExtractedExpiry = {
  title: string
  category: string
  expiresAt: Date
  personUserId?: string | null
  personName?: string | null
  assetName?: string | null
  renewalCostGbp?: number | null
  confidence: number
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name)

  constructor(private readonly realtime: RealtimeGateway) {}

  async list(
    orgId: string,
    opts: {
      status: 'active' | 'renewed' | 'expired' | 'dismissed' | 'all'
      venueId?: string
      category?: string
      withinDays?: number
      limit: number
    },
  ): Promise<{
    records: ExpiryRecordRow[]
    activeCount: number
    overdueCount: number
    within30dCount: number
  }> {
    const now = new Date()
    const within = opts.withinDays ? new Date(now.getTime() + opts.withinDays * DAY_MS) : undefined
    const where: Prisma.ExpiryRecordWhereInput = {
      organizationId: orgId,
      ...(opts.status === 'all' ? {} : { status: opts.status }),
      ...(opts.venueId ? { venueId: opts.venueId } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(within ? { expiresAt: { lte: within } } : {}),
    }

    const [rows, activeCount, overdueCount, within30dCount] = await Promise.all([
      prisma.expiryRecord.findMany({
        where,
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
        take: opts.limit,
      }),
      prisma.expiryRecord.count({ where: { organizationId: orgId, status: 'active' } }),
      prisma.expiryRecord.count({
        where: { organizationId: orgId, status: 'active', expiresAt: { lt: now } },
      }),
      prisma.expiryRecord.count({
        where: {
          organizationId: orgId,
          status: 'active',
          expiresAt: { gte: now, lte: new Date(now.getTime() + 30 * DAY_MS) },
        },
      }),
    ])

    return {
      records: rows.map((r) => this.toRow(r)),
      activeCount,
      overdueCount,
      within30dCount,
    }
  }

  async getById(orgId: string, id: string): Promise<ExpiryRecordRow> {
    const row = await prisma.expiryRecord.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!row) throw new NotFoundException('expiry-record-not-found')
    return this.toRow(row)
  }

  async create(
    orgId: string,
    role: string,
    input: {
      title: string
      category: string
      expiresAt: string
      venueId?: string | null
      personUserId?: string | null
      personName?: string | null
      assetName?: string | null
      renewalCostGbp?: number | null
      notes?: string | null
    },
  ): Promise<ExpiryRecordRow> {
    this.requireManager(role)
    await this.assertVenueInOrg(orgId, input.venueId ?? null)
    if (input.personUserId) {
      await this.assertPersonInOrg(orgId, input.personUserId)
    }
    const created = await prisma.expiryRecord.create({
      data: {
        organizationId: orgId,
        venueId: input.venueId ?? null,
        title: input.title,
        category: input.category,
        expiresAt: new Date(input.expiresAt),
        personUserId: input.personUserId ?? null,
        personName: input.personName ?? null,
        assetName: input.assetName ?? null,
        renewalCostGbp:
          input.renewalCostGbp !== null && input.renewalCostGbp !== undefined
            ? new Prisma.Decimal(input.renewalCostGbp)
            : null,
        notes: input.notes ?? null,
      },
    })
    const row = this.toRow(created)
    this.logger.log(
      JSON.stringify({
        event: 'compliance.created',
        orgId,
        recordId: row.id,
        category: row.category,
        expiresAt: row.expiresAt,
        source: 'manual',
      }),
    )
    this.emit('created', row)
    return row
  }

  async update(
    orgId: string,
    role: string,
    id: string,
    patch: {
      title?: string
      category?: string
      expiresAt?: string
      venueId?: string | null
      personUserId?: string | null
      personName?: string | null
      assetName?: string | null
      renewalCostGbp?: number | null
      status?: ExpiryStatus
      notes?: string | null
    },
  ): Promise<ExpiryRecordRow> {
    this.requireManager(role)
    const existing = await prisma.expiryRecord.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, expiresAt: true, status: true },
    })
    if (!existing) throw new NotFoundException('expiry-record-not-found')
    if (patch.status && !EXPIRY_STATUS_SET.has(patch.status)) {
      throw new BadRequestException('invalid-status')
    }
    if (patch.venueId !== undefined) {
      await this.assertVenueInOrg(orgId, patch.venueId)
    }
    if (patch.personUserId) {
      await this.assertPersonInOrg(orgId, patch.personUserId)
    }

    // Unchecked update — we want to write FK columns by id, not via Prisma's
    // nested connect/disconnect API. Org-scoping is already enforced by the
    // existence check above (findFirst { id, organizationId }).
    const data: Prisma.ExpiryRecordUncheckedUpdateInput = {}
    if (patch.title !== undefined) data.title = patch.title
    if (patch.category !== undefined) data.category = patch.category
    if (patch.expiresAt !== undefined) {
      const next = new Date(patch.expiresAt)
      data.expiresAt = next
      // Renewal / date roll forward — reset reminder stamps so the scheduler
      // reopens the 30/7/1/overdue windows for the new dueAt. We ONLY reset
      // when (a) the record is still active, and (b) the date actually moved
      // forward (or the user is explicitly re-opening with status=active).
      // Dismissed / renewed / expired rows do NOT get their stamps cleared —
      // a stamped record that's later flipped back to active would otherwise
      // re-fire every reminder.
      const dateMoved = next.getTime() !== existing.expiresAt.getTime()
      const willBeActive =
        patch.status === 'active' || (existing.status === 'active' && patch.status === undefined)
      if (dateMoved && willBeActive) {
        data.reminded30At = null
        data.reminded7At = null
        data.reminded1At = null
        data.remindedOverdueAt = null
      }
    }
    if (patch.venueId !== undefined) data.venueId = patch.venueId
    if (patch.personUserId !== undefined) data.personUserId = patch.personUserId
    if (patch.personName !== undefined) data.personName = patch.personName
    if (patch.assetName !== undefined) data.assetName = patch.assetName
    if (patch.renewalCostGbp !== undefined) {
      data.renewalCostGbp =
        patch.renewalCostGbp === null ? null : new Prisma.Decimal(patch.renewalCostGbp)
    }
    if (patch.status !== undefined) {
      data.status = patch.status
    }
    if (patch.notes !== undefined) data.notes = patch.notes

    const updated = await prisma.expiryRecord.update({ where: { id }, data })
    const row = this.toRow(updated)
    this.logger.log(
      JSON.stringify({
        event: 'compliance.updated',
        orgId,
        recordId: id,
        patchedFields: Object.keys(patch),
        status: row.status,
      }),
    )
    this.emit('updated', row)
    return row
  }

  /// Extractor entry point — runs from the ingest pipeline after a doc is
  /// classified as compliance. Upserts a single record per KnowledgeItem so a
  /// reingest (re-upload of the same doc) refreshes the row instead of
  /// duplicating it. Always idempotent on knowledgeItemId.
  async upsertFromExtractor(
    orgId: string,
    knowledgeItemId: string,
    venueId: string | null,
    extracted: ExtractedExpiry,
  ): Promise<ExpiryRecordRow> {
    const existing = await prisma.expiryRecord.findFirst({
      where: { organizationId: orgId, knowledgeItemId },
      select: { id: true, expiresAt: true, status: true },
    })
    const confidence = clamp01(extracted.confidence)
    const baseData = {
      title: extracted.title,
      category: extracted.category,
      personUserId: extracted.personUserId ?? null,
      personName: extracted.personName ?? null,
      assetName: extracted.assetName ?? null,
      renewalCostGbp:
        extracted.renewalCostGbp !== null && extracted.renewalCostGbp !== undefined
          ? new Prisma.Decimal(extracted.renewalCostGbp)
          : null,
      extractionConfidence: new Prisma.Decimal(confidence),
    }
    let saved: PrismaExpiryRecord
    if (existing) {
      // Re-ingesting the same KnowledgeItem with a drifted date (Haiku
      // non-determinism on "issued + 1yr" math, OCR variance) shouldn't
      // re-fire reminders. Only reset stamps if the new date moved by MORE
      // than 24 hours from the existing one — and only when the record is
      // still active. A user who manually dismissed a record stays dismissed
      // through a re-ingest.
      const dateDriftMs = Math.abs(existing.expiresAt.getTime() - extracted.expiresAt.getTime())
      const significantDrift = dateDriftMs > 24 * 60 * 60 * 1000
      // Closed records (dismissed / renewed / expired) stay closed through a
      // re-ingest. The user explicitly took action — re-uploading the same
      // doc shouldn't quietly resurrect them.
      const resetStamps = significantDrift && existing.status === 'active'
      saved = await prisma.expiryRecord.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          expiresAt: extracted.expiresAt,
          ...(resetStamps
            ? {
                reminded30At: null,
                reminded7At: null,
                reminded1At: null,
                remindedOverdueAt: null,
              }
            : {}),
        },
      })
    } else {
      saved = await prisma.expiryRecord.create({
        data: {
          organizationId: orgId,
          venueId,
          knowledgeItemId,
          expiresAt: extracted.expiresAt,
          ...baseData,
        },
      })
    }
    const row = this.toRow(saved)
    this.logger.log(
      JSON.stringify({
        event: existing ? 'compliance.extracted_updated' : 'compliance.extracted_created',
        orgId,
        recordId: row.id,
        knowledgeItemId,
        category: row.category,
        expiresAt: row.expiresAt,
        confidence,
      }),
    )
    this.emit(existing ? 'updated' : 'created', row)
    return row
  }

  private requireManager(role: string): void {
    // Compliance writes are deliberately tight — staff don't add or edit
    // expiry records. The extractor path runs with no role (system) and skips
    // this guard by going through upsertFromExtractor directly.
    if (role !== 'manager' && role !== 'owner') {
      throw new ForbiddenException('compliance-requires-manager-role')
    }
  }

  private async assertVenueInOrg(orgId: string, venueId: string | null): Promise<void> {
    if (!venueId) return
    const v = await prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true },
    })
    if (!v) throw new BadRequestException('invalid-venue')
  }

  private async assertPersonInOrg(orgId: string, personUserId: string): Promise<void> {
    const m = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: personUserId },
      select: { userId: true },
    })
    if (!m) throw new BadRequestException('invalid-person')
  }

  private emit(kind: 'created' | 'updated', row: ExpiryRecordRow): void {
    this.realtime.emitExpiryRecordUpserted(row.organizationId, {
      kind,
      id: row.id,
      status: row.status,
      expiresAt: row.expiresAt,
      category: row.category,
    })
  }

  private toRow(r: PrismaExpiryRecord): ExpiryRecordRow {
    const status = EXPIRY_STATUS_SET.has(r.status as ExpiryStatus)
      ? (r.status as ExpiryStatus)
      : 'active'
    return {
      id: r.id,
      organizationId: r.organizationId,
      venueId: r.venueId,
      knowledgeItemId: r.knowledgeItemId,
      title: r.title,
      category: r.category,
      expiresAt: r.expiresAt.toISOString(),
      personUserId: r.personUserId,
      personName: r.personName,
      assetName: r.assetName,
      renewalCostGbp: r.renewalCostGbp ? Number(r.renewalCostGbp) : null,
      status,
      reminded30At: r.reminded30At?.toISOString() ?? null,
      reminded7At: r.reminded7At?.toISOString() ?? null,
      reminded1At: r.reminded1At?.toISOString() ?? null,
      remindedOverdueAt: r.remindedOverdueAt?.toISOString() ?? null,
      extractionConfidence: r.extractionConfidence ? Number(r.extractionConfidence) : null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

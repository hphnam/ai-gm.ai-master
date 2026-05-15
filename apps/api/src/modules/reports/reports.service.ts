import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ZodError } from 'zod'
import { prisma } from '../../database/prisma'
import { type ReportSpec, ReportSpecSchema } from '../../types'

export type ReportRow = {
  id: string
  organizationId: string
  venueId: string | null
  /// Nullable: SetNull on user delete keeps the report row alive after a
  /// leaver's account is removed.
  createdByUserId: string | null
  createdByName: string | null
  title: string
  summary: string | null
  spec: ReportSpec
  createdAt: string
}

export type ReportListItem = {
  id: string
  title: string
  summary: string | null
  venueId: string | null
  createdAt: string
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  async create(input: {
    orgId: string
    userId: string
    venueId: string | null
    title: string
    summary: string | null
    spec: ReportSpec
  }): Promise<ReportRow> {
    // Re-validate the spec at the service boundary even though the controller
    // already did. The agent path bypasses the controller (calls the service
    // directly via tool dispatch), so this is the actual safety net.
    const parsed = ReportSpecSchema.parse(input.spec)
    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: input.orgId },
        select: { id: true },
      })
      if (!venue) {
        throw new Error('venue-not-in-org')
      }
    }
    // Single-query insert + creator name via the FK relation. Saves the
    // separate user.findUnique round-trip the previous version did.
    const row = await prisma.report.create({
      data: {
        organizationId: input.orgId,
        venueId: input.venueId,
        createdByUserId: input.userId,
        title: input.title,
        summary: input.summary,
        spec: parsed as object,
      },
      select: {
        id: true,
        organizationId: true,
        venueId: true,
        createdByUserId: true,
        title: true,
        summary: true,
        spec: true,
        createdAt: true,
        creator: { select: { name: true } },
      },
    })
    return this.toRow({
      ...row,
      createdByName: row.creator?.name ?? null,
    })
  }

  async get(orgId: string, id: string): Promise<ReportRow | null> {
    const row = await prisma.report.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        organizationId: true,
        venueId: true,
        createdByUserId: true,
        title: true,
        summary: true,
        spec: true,
        createdAt: true,
        creator: { select: { name: true } },
      },
    })
    if (!row) return null
    return this.toRow({
      ...row,
      createdByName: row.creator?.name ?? null,
    })
  }

  /// Hard delete. Org-scoped so a wrong-tenant id cannot remove another org's
  /// row. Returns the count actually deleted (0 = not found / wrong org).
  async delete(orgId: string, id: string): Promise<number> {
    const result = await prisma.report.deleteMany({
      where: { id, organizationId: orgId },
    })
    return result.count
  }

  async list(
    orgId: string,
    opts: { venueId?: string; limit?: number; offset?: number },
  ): Promise<{ items: ReportListItem[]; total: number }> {
    const limit = Math.min(opts.limit ?? 20, 100)
    const offset = Math.max(opts.offset ?? 0, 0)
    const where = {
      organizationId: orgId,
      ...(opts.venueId ? { venueId: opts.venueId } : {}),
    }
    // Run count + page in a single round-trip so the response includes a
    // stable total for the pager without an extra request.
    const [rows, total] = await Promise.all([
      prisma.report.findMany({
        where,
        select: { id: true, title: true, summary: true, venueId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ])
    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        venueId: r.venueId,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    }
  }

  private toRow(raw: {
    id: string
    organizationId: string
    venueId: string | null
    createdByUserId: string | null
    createdByName: string | null
    title: string
    summary: string | null
    spec: unknown
    createdAt: Date
  }): ReportRow {
    // Defensive parse — a legacy row with a deprecated section type would
    // otherwise crash the renderer. Map ZodError → typed HttpException so the
    // controller emits a clean 422 with no stack trace, instead of a generic
    // 500 with the raw error text.
    let parsedSpec: ReportSpec
    try {
      parsedSpec = ReportSpecSchema.parse(raw.spec)
    } catch (err) {
      if (err instanceof ZodError) {
        this.logger.warn(
          JSON.stringify({
            event: 'reports.spec_corrupt',
            reportId: raw.id,
            issueCount: err.issues.length,
          }),
        )
        throw new HttpException(
          {
            error: {
              code: 'report-spec-corrupt',
              message: 'Stored report data is no longer renderable.',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        )
      }
      throw err
    }
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      venueId: raw.venueId,
      createdByUserId: raw.createdByUserId,
      createdByName: raw.createdByName,
      title: raw.title,
      summary: raw.summary,
      spec: parsedSpec,
      createdAt: raw.createdAt.toISOString(),
    }
  }
}

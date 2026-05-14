import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { Task as PrismaTask } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { TASK_STATUSES, type TaskStatus } from './dto/tasks.dto'

type UserStub = { id: string; name: string | null; email: string }
type TaskWithRelations = PrismaTask & {
  assignee: UserStub
  creator: UserStub | null
}

export type TaskRow = {
  id: string
  organizationId: string
  venueId: string | null
  assignee: { userId: string; name: string | null; email: string }
  creator: { userId: string; name: string | null; email: string } | null
  body: string
  dueAt: string | null
  status: TaskStatus
  category: string | null
  sourceConversationId: string | null
  sourceMessageId: string | null
  remindedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

const TASK_STATUS_SET = new Set<TaskStatus>(TASK_STATUSES)

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(private readonly realtime: RealtimeGateway) {}

  async create(
    orgId: string,
    /// Pass null for system-created tasks (compliance scheduler, briefings).
    /// Self-assigned tasks pass the same userId for both creator and assignee.
    creatorUserId: string | null,
    input: {
      body: string
      assigneeUserId?: string | null
      dueAt?: string | null
      venueId?: string | null
      category?: string | null
      sourceConversationId?: string | null
      sourceMessageId?: string | null
      /// Caller's role in this org. Required when creatorUserId is set —
      /// this is what enforces "only manager + owner can assign tasks to
      /// other people". System callers (creatorUserId: null) pass null and
      /// skip the role gate; staff self-assignment passes role 'staff' and
      /// the gate lets it through because assignee === creator.
      creatorRole?: 'owner' | 'manager' | 'staff' | null
    },
  ): Promise<TaskRow> {
    const assigneeUserId = input.assigneeUserId ?? creatorUserId
    if (!assigneeUserId) {
      // System-created task must specify an assignee — there's no caller to
      // default to. Reject loudly rather than silently dropping the row.
      throw new BadRequestException('assignee-required-for-system-task')
    }

    // Role gate on cross-user assignment. Staff can only self-assign;
    // manager + owner can assign to anyone. System callers (creatorUserId
    // null) bypass — the compliance scheduler legitimately writes tasks for
    // any org member. We require a creatorRole when we have a creatorUserId
    // so a future caller that forgets to pass it doesn't silently bypass.
    if (creatorUserId && assigneeUserId !== creatorUserId) {
      if (!input.creatorRole) {
        throw new BadRequestException('creator-role-required-for-cross-assign')
      }
      if (input.creatorRole === 'staff') {
        throw new ForbiddenException('staff-cannot-assign-to-others')
      }
    }

    // Assignee must be a member of the org. Cross-org assignment would let a
    // creator surface tasks in a directory they're not in. Self-assignment
    // implicitly passes via the membership check on the creator side.
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: assigneeUserId },
      select: { userId: true },
    })
    if (!member) {
      throw new BadRequestException('invalid-assignee')
    }

    // Reject venueId belonging to another org — the FK enforces existence but
    // not org scoping, so a malicious or buggy caller could otherwise tie a
    // task to a cross-org venue.
    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: orgId },
        select: { id: true },
      })
      if (!venue) {
        throw new BadRequestException('invalid-venue')
      }
    }

    const created = (await prisma.task.create({
      data: {
        organizationId: orgId,
        venueId: input.venueId ?? null,
        assigneeUserId,
        creatorUserId,
        body: input.body,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        category: input.category ?? null,
        sourceConversationId: input.sourceConversationId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })) as TaskWithRelations
    const row = this.toRow(created)

    this.logger.log(
      JSON.stringify({
        event: 'tasks.created',
        orgId,
        creatorUserId,
        assigneeUserId,
        taskId: row.id,
        hasDueAt: !!row.dueAt,
        category: row.category,
      }),
    )

    this.emitUpserted('created', row, creatorUserId ?? assigneeUserId)
    return row
  }

  async list(
    orgId: string,
    userId: string,
    opts: {
      status: 'open' | 'done' | 'cancelled' | 'all'
      scope: 'mine' | 'authored' | 'all'
      venueId?: string
      limit: number
    },
  ): Promise<{ tasks: TaskRow[]; openCount: number; overdueCount: number }> {
    const scopeWhere =
      opts.scope === 'mine'
        ? { assigneeUserId: userId }
        : opts.scope === 'authored'
          ? { creatorUserId: userId }
          : {}
    const where = {
      organizationId: orgId,
      ...(opts.status === 'all' ? {} : { status: opts.status }),
      ...(opts.venueId ? { venueId: opts.venueId } : {}),
      ...scopeWhere,
    }

    const now = new Date()
    const [rows, openCount, overdueCount] = await Promise.all([
      prisma.task.findMany({
        where,
        // Order by dueAt then createdAt at the DB. JS sort below handles
        // status bucketing (open-before-done) and nulls-last for dueAt without
        // depending on the Prisma `nulls` modifier or alphabetic status sort.
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: opts.limit,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.count({
        where: {
          organizationId: orgId,
          status: 'open',
          ...(opts.scope === 'mine' ? { assigneeUserId: userId } : {}),
        },
      }),
      prisma.task.count({
        where: {
          organizationId: orgId,
          status: 'open',
          dueAt: { lt: now },
          ...(opts.scope === 'mine' ? { assigneeUserId: userId } : {}),
        },
      }),
    ])

    const sorted = [...rows].sort((a, b) => {
      // Open before done/cancelled.
      if (a.status !== b.status) {
        if (a.status === 'open') return -1
        if (b.status === 'open') return 1
      }
      // Then by dueAt asc, nulls last.
      if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime()
      if (a.dueAt && !b.dueAt) return -1
      if (!a.dueAt && b.dueAt) return 1
      // Finally createdAt desc.
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return {
      tasks: sorted.map((r) => this.toRow(r as TaskWithRelations)),
      openCount,
      overdueCount,
    }
  }

  async getById(orgId: string, userId: string, taskId: string): Promise<TaskRow> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })
    if (!task) throw new NotFoundException('task-not-found')
    if (task.assigneeUserId !== userId && task.creatorUserId !== userId) {
      // Hide cross-user tasks from anyone who isn't assignee or creator. Org
      // managers can still scope reads via the list API (scope: 'all') — single
      // fetch is intentionally tighter.
      throw new ForbiddenException('task-not-visible')
    }
    return this.toRow(task as TaskWithRelations)
  }

  async update(
    orgId: string,
    userId: string,
    taskId: string,
    patch: {
      body?: string
      dueAt?: string | null
      status?: TaskStatus
      category?: string | null
    },
  ): Promise<TaskRow> {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
      select: {
        assigneeUserId: true,
        creatorUserId: true,
        status: true,
      },
    })
    if (!existing) throw new NotFoundException('task-not-found')
    const isAssignee = existing.assigneeUserId === userId
    const isCreator = existing.creatorUserId === userId
    if (!isAssignee && !isCreator) {
      throw new ForbiddenException('task-not-editable')
    }
    if (patch.status && !TASK_STATUS_SET.has(patch.status)) {
      throw new BadRequestException('invalid-status')
    }
    // Only the assignee may mark a task done — the creator can cancel (dismiss)
    // but must not be able to forge a completion against another user. This
    // closes a harassment / fake-audit vector where a creator assigns a task
    // to a victim and immediately ticks it off in the victim's name.
    if (patch.status === 'done' && !isAssignee) {
      throw new ForbiddenException('task-not-completable-by-creator')
    }

    const data: Record<string, unknown> = {}
    if (patch.body !== undefined) data.body = patch.body
    if (patch.dueAt !== undefined) {
      data.dueAt = patch.dueAt === null ? null : new Date(patch.dueAt)
      // Clearing or moving the due date reopens the reminder window — the
      // scheduler can ping again at the new dueAt.
      data.remindedAt = null
    }
    if (patch.category !== undefined) data.category = patch.category
    if (patch.status !== undefined) {
      data.status = patch.status
      if (patch.status === 'done') data.completedAt = new Date()
      else if (patch.status === 'open') {
        data.completedAt = null
        // Reopening a task must reset remindedAt — otherwise the scheduler
        // skips it forever even though it's open and due again.
        data.remindedAt = null
      }
    }

    const updated = (await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })) as TaskWithRelations
    const row = this.toRow(updated)

    this.logger.log(
      JSON.stringify({
        event: 'tasks.updated',
        orgId,
        actorUserId: userId,
        taskId,
        status: row.status,
        patchedFields: Object.keys(patch),
      }),
    )
    this.emitUpserted('updated', row, userId)
    return row
  }

  private emitUpserted(kind: 'created' | 'updated', row: TaskRow, actorUserId: string): void {
    const recipients = [row.assignee.userId, row.creator?.userId, actorUserId].filter(
      (x): x is string => !!x,
    )
    this.realtime.emitTaskUpserted(recipients, {
      kind,
      id: row.id,
      assigneeUserId: row.assignee.userId,
      status: row.status,
      dueAt: row.dueAt,
      remindedAt: row.remindedAt,
    })
  }

  private toRow(t: TaskWithRelations): TaskRow {
    // Defensive narrowing — DB column is TEXT.
    const status = TASK_STATUS_SET.has(t.status as TaskStatus) ? (t.status as TaskStatus) : 'open'
    return {
      id: t.id,
      organizationId: t.organizationId,
      venueId: t.venueId,
      assignee: {
        userId: t.assignee.id,
        name: t.assignee.name,
        email: t.assignee.email,
      },
      creator: t.creator
        ? { userId: t.creator.id, name: t.creator.name, email: t.creator.email }
        : null,
      body: t.body,
      dueAt: t.dueAt?.toISOString() ?? null,
      status,
      category: t.category,
      sourceConversationId: t.sourceConversationId,
      sourceMessageId: t.sourceMessageId,
      remindedAt: t.remindedAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }
  }
}

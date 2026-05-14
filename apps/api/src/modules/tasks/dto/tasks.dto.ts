import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Loose IDs — better-auth User.ids are not strict UUIDs. Server-side FKs are
// the real referential guard; the schema just clamps the length.
const ID = z.string().min(1).max(64)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const TASK_STATUSES = ['open', 'done', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TaskSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string().nullable(),
  assignee: z.object({
    userId: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  creator: z
    .object({
      userId: z.string(),
      name: z.string().nullable(),
      email: z.string(),
    })
    .nullable(),
  body: z.string(),
  dueAt: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
  category: z.string().nullable(),
  sourceConversationId: z.string().nullable(),
  sourceMessageId: z.string().nullable(),
  remindedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export class TaskDto extends createZodDto(TaskSchema) {}

// List query — filter by status (open default for the inbox surface), scope
// (mine = assigned to me / authored = I created / all = visible org tasks).
export const ListTasksQuerySchema = z.object({
  status: z.enum(['open', 'done', 'cancelled', 'all']).optional().default('open'),
  scope: z.enum(['mine', 'authored', 'all']).optional().default('mine'),
  venueId: UUID.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})
export class ListTasksQueryDto extends createZodDto(ListTasksQuerySchema) {}

export const ListTasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  openCount: z.number(),
  overdueCount: z.number(),
})
export class ListTasksResponseDto extends createZodDto(ListTasksResponseSchema) {}

export const CreateTaskBodySchema = z.object({
  body: z.string().trim().min(3).max(2000),
  /// Omit / null → self-assigned. Otherwise must be a member of the same org.
  assigneeUserId: ID.optional().nullable(),
  /// ISO 8601. Future-only — agent and UI both filter past dates upstream, but
  /// the server accepts any DateTime for compliance backfills (Wave 2).
  dueAt: z.string().datetime().optional().nullable(),
  venueId: UUID.optional().nullable(),
  category: z.string().trim().min(1).max(64).optional().nullable(),
})
export class CreateTaskBodyDto extends createZodDto(CreateTaskBodySchema) {}

export const UpdateTaskBodySchema = z
  .object({
    body: z.string().trim().min(3).max(2000).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    category: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field must be provided' })
export class UpdateTaskBodyDto extends createZodDto(UpdateTaskBodySchema) {}

export const TaskIdParamSchema = z.object({ id: UUID })
export class TaskIdParamDto extends createZodDto(TaskIdParamSchema) {}

export const SingleTaskResponseSchema = z.object({ task: TaskSchema })
export class SingleTaskResponseDto extends createZodDto(SingleTaskResponseSchema) {}

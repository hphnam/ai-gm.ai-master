import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// User and notification IDs are issued by better-auth (User) and Prisma (Notification);
// better-auth uses its own scheme (not strict UUID v4), so we constrain to a safe
// length range only — the FK / not-found check on the server is the real guard.
const ID = z.string().min(1).max(64)

export const NotificationCategorySchema = z.enum(['chat', 'report', 'compliance', 'task', 'system'])
export type NotificationCategoryDto = z.infer<typeof NotificationCategorySchema>

const PartySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
})

const ReferenceSchema = z
  .object({
    kind: z.string(),
    id: z.string(),
  })
  .nullable()

export const NotificationSchema = z.object({
  id: z.string(),
  body: z.string(),
  source: z.enum(['chat', 'whatsapp', 'manual']),
  category: NotificationCategorySchema,
  // True for background-job-composed rows (task reminders, scheduled reports,
  // compliance). UI renders these with the gm assistant treatment rather
  // than attributing the message to `author` (which, for reminders, is the
  // task creator — kept for context, not as the speaker).
  automated: z.boolean(),
  // Loose entity reference for the alerts row to surface action buttons
  // ("Open task" / "Mark complete" / "Open report"). kind is an open enum
  // — the renderer only special-cases values it knows.
  reference: ReferenceSchema,
  status: z.enum(['unread', 'read']),
  createdAt: z.string(),
  readAt: z.string().nullable(),
  // Author is null for system-authored notifications (compliance, scheduled
  // reports). Recipient is always present — it's a not-null FK.
  author: PartySchema.nullable(),
  recipient: PartySchema,
})
export class NotificationDto extends createZodDto(NotificationSchema) {}

// Optional CSV of category values, deduped + length-capped. Capped at 16 chars
// per item so a malicious client can't push a huge IN-list through Prisma.
const CategoryCsv = z
  .string()
  .max(128)
  .optional()
  .transform((raw) => {
    if (!raw) return undefined
    const seen = new Set<NotificationCategoryDto>()
    for (const part of raw.split(',')) {
      const trimmed = part.trim()
      if (!trimmed || trimmed.length > 16) continue
      const parsed = NotificationCategorySchema.safeParse(trimmed)
      if (parsed.success) seen.add(parsed.data)
    }
    return seen.size > 0 ? Array.from(seen) : undefined
  })

export const ListNotificationsQuerySchema = z.object({
  status: z.enum(['unread', 'read', 'all']).optional().default('all'),
  // direction:
  //   inbox  — notifications you received (recipientUserId = me)
  //   sent   — notifications you authored (authorUserId = me, system-authored
  //            rows never match because they have null authorUserId)
  direction: z.enum(['inbox', 'sent']).optional().default('inbox'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
  // Opaque base64-encoded `<createdAtIso>|<id>` cursor. Server rejects malformed
  // input with 400 invalid-cursor; the client clears its cache and restarts.
  cursor: z.string().max(256).optional(),
  q: z.string().trim().max(200).optional(),
  category: CategoryCsv,
})
export class ListNotificationsQueryDto extends createZodDto(ListNotificationsQuerySchema) {}

export const ListNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  unreadCount: z.number(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})
export class ListNotificationsResponseDto extends createZodDto(ListNotificationsResponseSchema) {}

export const UnreadCountResponseSchema = z.object({
  count: z.number(),
})
export class UnreadCountResponseDto extends createZodDto(UnreadCountResponseSchema) {}

export const NotificationIdParamSchema = z.object({ id: ID })
export class NotificationIdParamDto extends createZodDto(NotificationIdParamSchema) {}

export const ComposeNotificationBodySchema = z.object({
  recipientUserId: ID,
  body: z.string().trim().min(3).max(2000),
})
export class ComposeNotificationBodyDto extends createZodDto(ComposeNotificationBodySchema) {}

export const RecipientSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  role: z.string(),
})
export const ListRecipientsResponseSchema = z.object({
  members: z.array(RecipientSchema),
})
export class ListRecipientsResponseDto extends createZodDto(ListRecipientsResponseSchema) {}

export const SimpleNotificationResponseSchema = z.object({
  notification: NotificationSchema,
})
export class SimpleNotificationResponseDto extends createZodDto(SimpleNotificationResponseSchema) {}

export const MarkAllReadResponseSchema = z.object({ updated: z.number() })
export class MarkAllReadResponseDto extends createZodDto(MarkAllReadResponseSchema) {}

/// Wave 4 — flat reply thread on a Notification. Authored by either the
/// recipient or the original author of the parent note.
export const NotificationReplySchema = z.object({
  id: z.string(),
  notificationId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
})
export class NotificationReplyDto extends createZodDto(NotificationReplySchema) {}

export const ListNotificationRepliesResponseSchema = z.object({
  replies: z.array(NotificationReplySchema),
})
export class ListNotificationRepliesResponseDto extends createZodDto(
  ListNotificationRepliesResponseSchema,
) {}

export const ComposeReplyBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
})
export class ComposeReplyBodyDto extends createZodDto(ComposeReplyBodySchema) {}

export const SingleReplyResponseSchema = z.object({ reply: NotificationReplySchema })
export class SingleReplyResponseDto extends createZodDto(SingleReplyResponseSchema) {}

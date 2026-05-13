import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// User and notification IDs are issued by better-auth (User) and Prisma (Notification);
// better-auth uses its own scheme (not strict UUID v4), so we constrain to a safe
// length range only — the FK / not-found check on the server is the real guard.
const ID = z.string().min(1).max(64)

export const NotificationSchema = z.object({
  id: z.string(),
  body: z.string(),
  source: z.enum(['chat', 'whatsapp', 'manual']),
  status: z.enum(['unread', 'read']),
  createdAt: z.string(),
  readAt: z.string().nullable(),
  author: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
    })
    .nullable(),
})
export class NotificationDto extends createZodDto(NotificationSchema) {}

export const ListNotificationsQuerySchema = z.object({
  status: z.enum(['unread', 'read', 'all']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
})
export class ListNotificationsQueryDto extends createZodDto(ListNotificationsQuerySchema) {}

export const ListNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  unreadCount: z.number(),
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

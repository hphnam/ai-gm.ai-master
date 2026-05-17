import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const INCIDENT_STATUSES = ['open', 'acknowledged', 'closed'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const INCIDENT_SEVERITIES = ['minor', 'major', 'critical'] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const ListIncidentsQuerySchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(INCIDENT_SEVERITIES).optional(),
  venueId: UUID.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
export class ListIncidentsQueryDto extends createZodDto(ListIncidentsQuerySchema) {}

const PartySchema = z
  .object({
    userId: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  })
  .nullable()

export const IncidentRowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string(),
  venueName: z.string(),
  severity: z.enum(INCIDENT_SEVERITIES),
  status: z.enum(INCIDENT_STATUSES),
  summary: z.string(),
  loggedBy: PartySchema,
  sourceMessageId: z.string().nullable(),
  sourceConversationId: z.string().nullable(),
  details: z.record(z.string(), z.unknown()),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const ListIncidentsResponseSchema = z.object({
  incidents: z.array(IncidentRowSchema),
  openCount: z.number().int().nonnegative(),
  criticalOpenCount: z.number().int().nonnegative(),
})
export class ListIncidentsResponseDto extends createZodDto(ListIncidentsResponseSchema) {}

export const IncidentIdParamSchema = z.object({ id: UUID })
export class IncidentIdParamDto extends createZodDto(IncidentIdParamSchema) {}

export const IncidentCommentParamSchema = z.object({ id: UUID, commentId: UUID })
export class IncidentCommentParamDto extends createZodDto(IncidentCommentParamSchema) {}

export const SingleIncidentResponseSchema = z.object({ incident: IncidentRowSchema })
export class SingleIncidentResponseDto extends createZodDto(SingleIncidentResponseSchema) {}

/// Closing an incident requires a non-empty resolution so there's a real
/// audit trail behind every close. Other transitions don't need a body.
/// Service-level guard re-checks this; the schema gate just rejects the
/// obvious case before it hits the DB.
export const UpdateIncidentStatusBodySchema = z
  .object({
    status: z.enum(INCIDENT_STATUSES),
    resolution: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => v.status !== 'closed' || (v.resolution && v.resolution.length > 0), {
    message: 'resolution is required when closing an incident',
    path: ['resolution'],
  })
export class UpdateIncidentStatusBodyDto extends createZodDto(UpdateIncidentStatusBodySchema) {}

export const INCIDENT_COMMENT_KINDS = ['comment', 'status_change'] as const
export type IncidentCommentKind = (typeof INCIDENT_COMMENT_KINDS)[number]

export const IncidentCommentRowSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  kind: z.enum(INCIDENT_COMMENT_KINDS),
  body: z.string(),
  meta: z.record(z.string(), z.unknown()),
  author: PartySchema,
  createdAt: z.string(),
})
export const ListIncidentCommentsResponseSchema = z.object({
  comments: z.array(IncidentCommentRowSchema),
})
export class ListIncidentCommentsResponseDto extends createZodDto(
  ListIncidentCommentsResponseSchema,
) {}

export const SingleIncidentCommentResponseSchema = z.object({
  comment: IncidentCommentRowSchema,
})
export class SingleIncidentCommentResponseDto extends createZodDto(
  SingleIncidentCommentResponseSchema,
) {}

export const ComposeIncidentCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
})
export class ComposeIncidentCommentBodyDto extends createZodDto(ComposeIncidentCommentBodySchema) {}

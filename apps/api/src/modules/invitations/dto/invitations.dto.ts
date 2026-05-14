import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  InvitationIdParamSchema,
  InvitationStatusSchema,
  InviteBodySchema,
  InviteRole,
  ListInvitationsQuerySchema,
} from '../../../types'

export class InviteBodyDto extends createZodDto(InviteBodySchema) {}
export class InvitationIdParamDto extends createZodDto(InvitationIdParamSchema) {}
export class ListInvitationsQueryDto extends createZodDto(ListInvitationsQuerySchema) {}

const InvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  role: InviteRole,
  status: InvitationStatusSchema,
  inviterId: z.string(),
  inviterName: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
})
export class InvitationDto extends createZodDto(InvitationSchema) {}

export const CreateInvitationResponseSchema = z.object({
  invitation: InvitationSchema,
  inviteUrl: z.string(),
  warning: z.literal('mail-send-failed').optional(),
  reissued: z.boolean().optional(),
})
export class CreateInvitationResponseDto extends createZodDto(CreateInvitationResponseSchema) {}

export const ListInvitationsResponseSchema = z.object({
  invitations: z.array(InvitationSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
})
export class ListInvitationsResponseDto extends createZodDto(ListInvitationsResponseSchema) {}

export const InvitationPreviewSchema = z.object({
  id: z.string(),
  email: z.string(),
  organizationName: z.string(),
  role: InviteRole,
  status: InvitationStatusSchema,
  expiresAt: z.string(),
})
export class InvitationPreviewDto extends createZodDto(InvitationPreviewSchema) {}

export const AcceptInvitationResponseSchema = z.object({
  activeOrganization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
})
export class AcceptInvitationResponseDto extends createZodDto(AcceptInvitationResponseSchema) {}

export const RevokeInvitationResponseSchema = z.object({ ok: z.literal(true) })
export class RevokeInvitationResponseDto extends createZodDto(RevokeInvitationResponseSchema) {}

// Member directory — surfaces every accepted member of the active org. Used by
// the Organisation settings page so managers can see who's actually in their
// team, not just pending invitations.
export const OrgMemberSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  isSelf: z.boolean(),
  joinedAt: z.string(),
})
export class OrgMemberDto extends createZodDto(OrgMemberSchema) {}

export const ListOrgMembersResponseSchema = z.object({
  members: z.array(OrgMemberSchema),
})
export class ListOrgMembersResponseDto extends createZodDto(ListOrgMembersResponseSchema) {}

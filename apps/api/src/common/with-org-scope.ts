// Plan 04-02 Task 1 APPLY deviation: import via @gm-ai/database (which re-exports Prisma types)
// per PROJECT.md convention ("Prisma client from packages/database"). @prisma/client is not a
// direct dep of apps/api, so workspace hoisting changes can break indirect resolution.
// Routing through @gm-ai/database is the CLAUDE.md-aligned fix.
import type { Prisma } from '../database/prisma'

// Org-direct tables: carry organizationId as a top-level column.
// KnowledgeItem is venue-scoped via Venue.organizationId, NOT org-direct —
// callers use `withOrgScopeVia` for it.
type OrgDirectWhere =
  | Prisma.VenueWhereInput
  | Prisma.OrganizationWhereInput
  | Prisma.InvitationWhereInput // 01-02 audit-added: Invitation has organizationId FK

export function withOrgScope<A extends { where?: OrgDirectWhere }>(
  args: A,
  orgId: string,
): A & { where: A['where'] & { organizationId: string } } {
  return {
    ...args,
    where: { ...(args.where ?? {}), organizationId: orgId },
  } as A & { where: A['where'] & { organizationId: string } }
}

// Join-scoped tables: resolve organizationId via a join path.
//   KnowledgeItem       → venue.organizationId
//   ChatConversation    → venue.organizationId
//   ChatMessage         → conversation.venue.organizationId
//   MessageFeedback     → message.conversation.venue.organizationId
//   ReTagQueueItem      → sourceMessage.conversation.venue.organizationId
//                         OR knowledgeItem.venue.organizationId
type JoinScopedWhere =
  | Prisma.KnowledgeItemWhereInput
  | Prisma.ChatConversationWhereInput
  | Prisma.ChatMessageWhereInput
  | Prisma.MessageFeedbackWhereInput
  | Prisma.ReTagQueueItemWhereInput

export function withOrgScopeVia<A extends { where?: JoinScopedWhere }>(
  args: A,
  joinWhere: JoinScopedWhere,
): A {
  return { ...args, where: { ...(args.where ?? {}), ...joinWhere } } as A
}

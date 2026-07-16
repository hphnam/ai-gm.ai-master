import type { PrismaClient } from '@prisma/client'
import { getPerson } from '../chat-core/tools/get-person.tool'
import { isPhoneTempEmail } from '../phone/consume-phone-invite'

export type PersonMember = {
  userId: string
  name: string | null
  email: string | null
  role: string
}

export type PersonContact = {
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
}

export type PersonDocMention = {
  knowledgeItemId: string
  title: string | null
}

export type FindPersonResult = {
  query: string
  members: PersonMember[]
  contacts: PersonContact[]
  mentions: PersonDocMention[]
}

const MEMBER_MATCH_LIMIT = 6
const MENTION_LIMIT = 5

// Org-wide person resolution across three stores: OrganizationMember + User
// (roles), VenueContact (address book), and KnowledgeItem mentions (docs that
// name the person). Every read is scoped to ctx.orgId — cross-org rows can't
// surface. venueId is intentionally ignored so contacts from ALL venues in the
// org match, not just the caller's home venue.
export async function findPerson(
  name: string,
  ctx: { orgId: string },
  prisma: PrismaClient,
): Promise<FindPersonResult> {
  const query = name.trim()

  const memberRows = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.orgId,
      user: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
    },
    select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    take: MEMBER_MATCH_LIMIT,
  })

  // Reuse the shared venue-contact resolver (org-scoped internally). Pass a null
  // venue so it searches every venue in the org. no-data just means no contact
  // matched — not an error for this union.
  const contactResult = await getPerson({ name: query }, ctx.orgId, null, prisma)
  const contacts = contactResult.ok ? dedupeContacts(contactResult.data) : []

  // KB mentions with titles. getPerson only surfaces its mention scan when a
  // VenueContact also matches, so scan directly here — this is how a person who
  // appears ONLY inside documents (e.g. an owner named in an SOP) still resolves.
  const mentionRows = await prisma.knowledgeItem.findMany({
    where: {
      organizationId: ctx.orgId,
      supersededAt: null,
      OR: [
        { metadata: { path: ['contactNames'], array_contains: query } },
        { metadata: { path: ['mentions'], string_contains: query } },
      ],
    },
    select: { id: true, metadata: true },
    take: MENTION_LIMIT,
  })

  return {
    query,
    members: memberRows.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      // Phone-only members have a synthetic ph+<e164>@phone.gm-ai.local
      // placeholder — never a routable address, so don't surface it as an email.
      email: isPhoneTempEmail(m.user.email) ? null : m.user.email,
      role: m.role,
    })),
    contacts,
    mentions: mentionRows.map((r) => ({
      knowledgeItemId: r.id,
      title: titleFromMetadata(r.metadata),
    })),
  }
}

// Staff-visible contact policy (owner/manager always see everything). Fail-
// closed: any role that isn't literally 'owner' or 'manager' is treated as staff.
//   • Team MEMBERS — work email + role are internal directory info a colleague
//     can look up, so staff keep them. (Members carry no phone in this shape.)
//   • EMERGENCY contacts — staff keep the phone; reaching someone fast is
//     safety-critical. Their email stays gated.
//   • Other CONTACTS (suppliers/contractors/etc.) — manager/owner only; fully
//     stripped for staff.
export function redactPersonForRole(result: FindPersonResult, role: string): FindPersonResult {
  if (role === 'owner' || role === 'manager') return result
  return {
    ...result,
    contacts: result.contacts.map((c) =>
      c.isEmergencyContact ? { ...c, email: null } : { ...c, phone: null, email: null },
    ),
  }
}

function dedupeContacts(
  matches: Array<{
    name: string
    role: string
    phone: string | null
    email: string | null
    isEmergencyContact: boolean
  }>,
): PersonContact[] {
  const seen = new Map<string, PersonContact>()
  for (const c of matches) {
    const key = `${c.name.toLowerCase()}|${c.role.toLowerCase()}|${c.phone ?? ''}`
    if (!seen.has(key)) {
      seen.set(key, {
        name: c.name,
        role: c.role,
        phone: c.phone,
        email: c.email,
        isEmergencyContact: c.isEmergencyContact,
      })
    }
  }
  return [...seen.values()]
}

function titleFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  if (typeof m.title === 'string' && m.title.trim()) return m.title.trim()
  if (typeof m.docType === 'string' && m.docType.trim()) return m.docType.trim()
  return null
}

// Run via:
//   node --import tsx --test apps/api/src/modules/chat/find-person.spec.ts
//
// Covers findPerson (org-wide union of members / contacts / doc mentions,
// org isolation) and redactPersonForRole (cross-person PII is manager/owner
// only). Prisma is stubbed as a small in-memory store that filters by
// organizationId + name the way the real queries do.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { type FindPersonResult, findPerson, redactPersonForRole } from './find-person'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'

type MemberFixture = {
  organizationId: string
  userId: string
  role: string
  name: string | null
  email: string | null
}
type ContactFixture = {
  organizationId: string
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
}
type DocFixture = {
  organizationId: string
  id: string
  contactNames: string[]
  mentions: string
  metadata: Record<string, unknown>
}

function makePrisma(data: {
  members?: MemberFixture[]
  contacts?: ContactFixture[]
  docs?: DocFixture[]
}) {
  const members = data.members ?? []
  const contacts = data.contacts ?? []
  const docs = data.docs ?? []
  type FindManyArgs = { where: Record<string, unknown>; take: number }
  const contains = (obj: unknown): string =>
    ((obj as { contains?: string } | undefined)?.contains ?? '').toLowerCase()

  return {
    organizationMember: {
      findMany: async ({ where, take }: FindManyArgs) => {
        const user = where.user as { OR: Array<Record<string, unknown>> }
        const term = contains(user.OR[0].name)
        return members
          .filter((m) => m.organizationId === where.organizationId)
          .filter(
            (m) =>
              (m.name ?? '').toLowerCase().includes(term) ||
              (m.email ?? '').toLowerCase().includes(term),
          )
          .slice(0, take)
          .map((m) => ({ userId: m.userId, role: m.role, user: { name: m.name, email: m.email } }))
      },
    },
    venueContact: {
      findMany: async ({ where, take }: FindManyArgs) => {
        const orgId = (where.venue as { organizationId: string }).organizationId
        const term = contains(where.name)
        return contacts
          .filter((c) => c.organizationId === orgId)
          .filter((c) => c.name.toLowerCase().includes(term))
          .slice(0, take)
          .map((c) => ({
            name: c.name,
            role: c.role,
            phone: c.phone,
            email: c.email,
            isEmergencyContact: c.isEmergencyContact,
          }))
      },
    },
    knowledgeItem: {
      findMany: async ({ where, take }: FindManyArgs) => {
        const orClauses = (where.OR ?? []) as Array<{
          metadata: { array_contains?: string; string_contains?: string }
        }>
        const term =
          orClauses
            .map((c) => c.metadata.array_contains ?? c.metadata.string_contains)
            .find(Boolean) ?? ''
        return docs
          .filter((d) => d.organizationId === where.organizationId)
          .filter((d) => d.contactNames.includes(term) || d.mentions.includes(term))
          .slice(0, take)
          .map((d) => ({ id: d.id, content: '', metadata: d.metadata }))
      },
    },
  } as unknown as PrismaClient
}

describe('findPerson', () => {
  it('resolves an org owner by name with their role', async () => {
    const prisma = makePrisma({
      members: [
        {
          organizationId: ORG,
          userId: 'usr-1',
          role: 'owner',
          name: 'Elliot Horner',
          email: 'elliot@lune.test',
        },
      ],
    })
    const result = await findPerson('Elliot', { orgId: ORG }, prisma)
    assert.deepEqual(result.members, [
      { userId: 'usr-1', name: 'Elliot Horner', email: 'elliot@lune.test', role: 'owner' },
    ])
  })

  it('resolves a person who appears only in a KB document', async () => {
    const prisma = makePrisma({
      docs: [
        {
          organizationId: ORG,
          id: 'ki-42',
          contactNames: ['Elliot Horner'],
          mentions: '',
          metadata: { title: 'Founder bio' },
        },
      ],
    })
    const result = await findPerson('Elliot Horner', { orgId: ORG }, prisma)
    assert.deepEqual(result.mentions, [{ knowledgeItemId: 'ki-42', title: 'Founder bio' }])
  })

  it('never returns a person who only exists in another org', async () => {
    const prisma = makePrisma({
      members: [
        {
          organizationId: OTHER_ORG,
          userId: 'usr-9',
          role: 'owner',
          name: 'Elliot Horner',
          email: 'elliot@other.test',
        },
      ],
    })
    const result = await findPerson('Elliot', { orgId: ORG }, prisma)
    assert.deepEqual(result, { query: 'Elliot', members: [], contacts: [], mentions: [] })
  })
})

describe('redactPersonForRole', () => {
  const full: FindPersonResult = {
    query: 'Sam',
    members: [{ userId: 'usr-2', name: 'Sam Field', email: 'sam@lune.test', role: 'manager' }],
    contacts: [
      {
        name: 'Sam Field',
        role: 'Cellar engineer',
        phone: '07700 900000',
        email: 'sam@cellar.test',
        isEmergencyContact: true,
      },
    ],
    mentions: [{ knowledgeItemId: 'ki-1', title: 'Cellar SOP' }],
  }

  it('strips other-person phone and email for a staff caller', () => {
    const out = redactPersonForRole(full, 'staff')
    assert.deepEqual(out.contacts[0], {
      name: 'Sam Field',
      role: 'Cellar engineer',
      phone: null,
      email: null,
      isEmergencyContact: true,
    })
  })

  it('preserves contact phone and email for a manager caller', () => {
    const out = redactPersonForRole(full, 'manager')
    assert.equal(out.contacts[0].phone, '07700 900000')
  })
})

// Plan 06-03 Task 1 — get_person shaped tool.
//
// Pure function (NOT an AI SDK tool). The People researcher calls this directly.
// Searches VenueContact rows by name (case-insensitive contains) or role, scoped
// to ctx.orgId via venue.organizationId. For each match, scans KnowledgeItem.metadata
// JSON for occurrences of the same name (audit-M1: parameterized Prisma query,
// hard LIMIT MAX_PERSON_MENTIONS_PER_QUERY=3, NO raw SQL interpolation).
//
// audit-M1 — orgId positional, sourced from session/auth context only.
// Cross-tenant boundary: scoping happens via venue.organizationId === orgId on
// the Prisma where clause; KnowledgeItem mention scan also restricted to
// organizationId === orgId. Foreign-tenant venues / KIs cannot leak.

import type { PrismaClient } from '@prisma/client'
import { fail, MAX_PERSON_MENTIONS_PER_QUERY, ok, type ToolResult } from '../../../types'
import { chatCoreLogger, hashId, hashQuery } from '../log-helpers'

export type PersonMention = {
  knowledgeItemId: string
  snippet: string
}

export type PersonMatch = {
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
  mentions: PersonMention[]
}

const SNIPPET_MAX_LEN = 160

export async function getPerson(
  query: { name?: string; role?: string },
  orgId: string,
  venueId: string | null,
  prisma: PrismaClient,
): Promise<ToolResult<PersonMatch[]>> {
  const t0 = Date.now()
  const name = query.name?.trim()
  const role = query.role?.trim()
  if (!name && !role) {
    return fail('invalid-input', 'name or role required')
  }

  // Cross-tenant guard via venue.organizationId === orgId. venueId optional —
  // null means "any venue in this org."
  //
  // Plan 06-04 hot-fix 2026-05-02 — tokenize role queries. A role like "cellar
  // engineer" must match a stored "Gas Engineer" / "Cellar Services" — Prisma
  // `contains` is substring-only, so the unsplit phrase silently misses. Split
  // on whitespace, drop tokens ≤2 chars (stop-words), OR-match each remaining
  // token. Single-token roles fall through to the legacy contains path so we
  // don't widen the cardinality unnecessarily.
  const roleTokens = role ? role.split(/\s+/).filter((t) => t.length > 2) : []
  const roleClause =
    role && roleTokens.length > 1
      ? {
          OR: roleTokens.map((t) => ({
            role: { contains: t, mode: 'insensitive' as const },
          })),
        }
      : role
        ? { role: { contains: role, mode: 'insensitive' as const } }
        : {}

  const contacts = await prisma.venueContact.findMany({
    where: {
      venue: {
        organizationId: orgId,
        ...(venueId ? { id: venueId } : {}),
      },
      ...(name ? { name: { contains: name, mode: 'insensitive' as const } } : {}),
      ...roleClause,
    },
    select: {
      name: true,
      role: true,
      phone: true,
      email: true,
      isEmergencyContact: true,
    },
    take: 10,
  })

  // Mention scan — only when name is provided (role-only queries don't need it).
  // audit-M1: parameterized via Prisma's metadata path filters. Hard LIMIT 3.
  let mentions: { knowledgeItemId: string; content: string }[] = []
  if (name) {
    mentions = await prisma.knowledgeItem
      .findMany({
        where: {
          organizationId: orgId,
          OR: [
            // contactNames metadata path holding an array of names; array_contains
            // matches when array contains the given string verbatim.
            { metadata: { path: ['contactNames'], array_contains: name } },
            // mentions metadata path holding a single string with a contains match.
            { metadata: { path: ['mentions'], string_contains: name } },
          ],
        },
        select: { id: true, content: true },
        take: MAX_PERSON_MENTIONS_PER_QUERY,
      })
      .then((rows) => rows.map((r) => ({ knowledgeItemId: r.id, content: r.content })))
  }

  const mentionsByItemId = new Map<string, PersonMention>()
  for (const m of mentions) {
    const snippet = pickSnippet(m.content, name ?? '', SNIPPET_MAX_LEN)
    mentionsByItemId.set(m.knowledgeItemId, {
      knowledgeItemId: m.knowledgeItemId,
      snippet,
    })
  }

  // Distribute mentions across contacts whose name matches; matchless mentions
  // attach to all returned contacts (best-effort) — Analyser deduplicates.
  const matches: PersonMatch[] = contacts.map((c) => {
    const perContact: PersonMention[] = []
    for (const m of mentionsByItemId.values()) {
      perContact.push(m)
    }
    return {
      name: c.name,
      role: c.role,
      phone: c.phone,
      email: c.email,
      isEmergencyContact: c.isEmergencyContact,
      mentions: perContact.slice(0, MAX_PERSON_MENTIONS_PER_QUERY),
    }
  })

  if (matches.length === 0 && mentionsByItemId.size === 0) {
    chatCoreLogger.info('tool.get_person', {
      orgId: hashId(orgId),
      queryHash: hashQuery(`${name ?? ''}|${role ?? ''}`),
      hitCount: 0,
      latencyMs: Date.now() - t0,
    })
    return fail('no-data', 'no contacts or mentions matched')
  }

  // venueId passed through for log payload only.
  void venueId

  chatCoreLogger.info('tool.get_person', {
    orgId: hashId(orgId),
    queryHash: hashQuery(`${name ?? ''}|${role ?? ''}`),
    hitCount: matches.length,
    mentionCount: mentionsByItemId.size,
    latencyMs: Date.now() - t0,
  })

  return ok(matches)
}

function pickSnippet(content: string, name: string, maxLen: number): string {
  if (!name) return content.slice(0, maxLen)
  const idx = content.toLowerCase().indexOf(name.toLowerCase())
  if (idx < 0) return content.slice(0, maxLen)
  const start = Math.max(0, idx - 60)
  const end = Math.min(content.length, idx + name.length + 60)
  return content.slice(start, end).trim().slice(0, maxLen)
}

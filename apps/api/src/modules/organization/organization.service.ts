import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText } from 'ai'
import { prisma } from '../../database/prisma'
import { type OrganizationProfile, OrganizationProfileReadSchema } from '../../types'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const DESCRIPTION_MAX = 2000

/// Reads/writes the per-org business profile stored on `Organization.metadata`
/// under the `profile` key. Kept in metadata (vs a dedicated column) so the
/// shape can evolve without a migration. The chat path reads the profile
/// directly via Prisma + `readOrganizationProfile`; this service backs the
/// Settings endpoints.
@Injectable()
export class OrganizationService {
  async getProfile(orgId: string): Promise<OrganizationProfile> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { metadata: true },
    })
    return readOrganizationProfile(org?.metadata)
  }

  async updateProfile(orgId: string, profile: OrganizationProfile): Promise<OrganizationProfile> {
    // Atomic single-statement write of the `{profile}` subkey only — preserves
    // any sibling metadata (notably `memory`, written concurrently by the chat
    // agent) without a lost-update-prone read-modify-write. Mirrors the memory
    // store's jsonb_set approach. `organizations` is the @@map'd table name.
    await prisma.$executeRaw`
      UPDATE "organizations"
      SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{profile}', ${JSON.stringify(profile)}::jsonb)
      WHERE id = ${orgId}
    `
    return profile
  }

  /// Drafts a business description for the profile from what we already know —
  /// org name, business type, and the org's venues. User-triggered ("Generate
  /// with AI"); the caller edits before saving. Throws on model failure.
  async generateDescription(orgId: string): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, metadata: true },
    })
    const profile = readOrganizationProfile(org?.metadata)
    const venues = await prisma.venue.findMany({
      where: { organizationId: orgId },
      select: { name: true, type: true, address: true },
      take: 10,
    })

    const context = [
      org?.name ? `Business name: ${org.name}` : null,
      profile.businessType ? `Business type: ${profile.businessType}` : null,
      venues.length > 0
        ? `Venues:\n${venues
            .map(
              (v) =>
                `- ${v.name}${v.type ? ` (${v.type})` : ''}${v.address ? `, ${v.address}` : ''}`,
            )
            .join('\n')}`
        : null,
      profile.description ? `Current description to refine:\n${profile.description}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const prompt = `Write a short, factual profile of this hospitality business for an AI assistant's background context — 2 to 4 plain sentences covering what it is, what it serves, and who it's for. No marketing language, no headings, no bullet points. Only use the details given; don't invent specifics like awards, dates, or numbers.

${context || 'No details provided — write a neutral one-sentence placeholder inviting the owner to add specifics.'}`

    const { text } = await generateText({
      model: anthropicProvider(HAIKU_MODEL),
      messages: [{ role: 'user', content: prompt }],
      maxRetries: 1,
    })
    const description = text.trim().slice(0, DESCRIPTION_MAX)
    // An empty completion (refusal / truncation) must not surface as a "success"
    // the caller then writes over the existing description with — fail instead.
    if (!description) throw new Error('empty-description-generation')
    return description
  }
}

/// Loads + parses an org's business profile directly via Prisma. Used by the
/// chat + scheduled-report paths (which read profile inline rather than through
/// the DI service). Returns an empty profile when the org or its profile is
/// absent.
export async function loadOrganizationProfile(orgId: string): Promise<OrganizationProfile> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { metadata: true },
  })
  return readOrganizationProfile(org?.metadata)
}

/// Parses the `profile` blob out of an Organization.metadata value. Tolerant:
/// unknown / malformed metadata yields an empty profile rather than throwing,
/// so a hand-edited row can never break the chat path.
export function readOrganizationProfile(metadata: unknown): OrganizationProfile {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const raw = (metadata as Record<string, unknown>).profile
  const parsed = OrganizationProfileReadSchema.safeParse(raw)
  return parsed.success ? parsed.data : {}
}

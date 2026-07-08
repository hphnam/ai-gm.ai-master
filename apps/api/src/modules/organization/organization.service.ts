import { Injectable } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { type OrganizationProfile, OrganizationProfileReadSchema } from '../../types'

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

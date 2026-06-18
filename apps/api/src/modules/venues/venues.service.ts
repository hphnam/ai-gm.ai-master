import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  type CreateVenueBody,
  type UpdateVenueProfile,
  type VenueDetail,
  type VenueListItem,
  type VenueProfile,
  VenueProfileSchema,
} from '../../types'
import { IndexerService } from '../indexer/indexer.service'

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name)

  constructor(private readonly indexer: IndexerService) {}

  async listByOrg(orgId: string): Promise<VenueListItem[]> {
    return prisma.venue.findMany({
      where: { organizationId: orgId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, address: true, type: true, timezone: true },
    })
  }

  async getById(id: string, orgId: string): Promise<VenueDetail | null> {
    const row = await prisma.venue.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        timezone: true,
        profile: true,
        squareLocationId: true,
      },
    })
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      type: row.type,
      timezone: row.timezone,
      profile: VenueProfileSchema.parse(row.profile ?? {}),
      squareLocationId: row.squareLocationId,
    }
  }

  /// Manager-only — assign or clear the Square location mapping for a venue.
  /// Returns the updated detail so the caller can refresh local state.
  async updateSquareLocation(
    id: string,
    orgId: string,
    squareLocationId: string | null,
  ): Promise<VenueDetail> {
    const existing = await prisma.venue.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException({ error: 'venue-not-found' })
    await prisma.venue.update({
      where: { id },
      data: { squareLocationId },
    })
    this.logger.log(
      JSON.stringify({
        event: 'venue.update_square_location',
        venueId: id,
        orgId,
        mapped: squareLocationId !== null,
      }),
    )
    const updated = await this.getById(id, orgId)
    if (!updated) throw new NotFoundException({ error: 'venue-not-found' })
    return updated
  }

  async create(orgId: string, input: CreateVenueBody): Promise<VenueListItem> {
    return prisma.venue.create({
      data: {
        organizationId: orgId,
        name: input.name,
        type: input.type,
        address: input.address && input.address.length > 0 ? input.address : null,
        timezone: input.timezone,
      },
      select: { id: true, name: true, address: true, type: true, timezone: true },
    })
  }

  /// Phase D — patch the venue profile. Merges over the existing profile JSON,
  /// re-validates the full shape, and re-indexes into SearchableEntity so the
  /// agent can find profile contents semantically (fire escapes, hours, etc.).
  async updateProfile(id: string, orgId: string, patch: UpdateVenueProfile): Promise<VenueDetail> {
    const existing = await prisma.venue.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        timezone: true,
        profile: true,
        squareLocationId: true,
      },
    })
    if (!existing) throw new NotFoundException({ error: 'venue-not-found' })

    const currentProfile = VenueProfileSchema.parse(existing.profile ?? {})
    const merged = VenueProfileSchema.parse({ ...currentProfile, ...patch })

    const updated = await prisma.venue.update({
      where: { id },
      data: { profile: merged as object },
      select: {
        id: true,
        name: true,
        address: true,
        type: true,
        timezone: true,
        profile: true,
        squareLocationId: true,
      },
    })

    await this.reindexProfile(orgId, updated, merged).catch((err) => {
      this.logger.warn(
        JSON.stringify({
          event: 'venue.profile_index_failed',
          venueId: id,
          message: (err as Error).message,
        }),
      )
    })

    return {
      id: updated.id,
      name: updated.name,
      address: updated.address,
      type: updated.type,
      timezone: updated.timezone,
      profile: merged,
      squareLocationId: updated.squareLocationId,
    }
  }

  private async reindexProfile(
    orgId: string,
    venue: { id: string; name: string; address: string | null; type: string },
    profile: VenueProfile,
  ): Promise<void> {
    const lines: string[] = [`${venue.name} — ${venue.type}`]
    if (venue.address) lines.push(`address: ${venue.address}`)
    if (profile.openingHours) lines.push(`hours: ${profile.openingHours}`)
    if (profile.layoutNotes) lines.push(`layout: ${profile.layoutNotes}`)
    if (profile.fireEscapes && profile.fireEscapes.length > 0) {
      lines.push(`fire escapes: ${profile.fireEscapes.join('; ')}`)
    }
    if (profile.firstAidPoints && profile.firstAidPoints.length > 0) {
      lines.push(`first aid: ${profile.firstAidPoints.join('; ')}`)
    }
    if (profile.alarmPolicy) lines.push(`alarm policy: ${profile.alarmPolicy}`)
    if (profile.keySafePolicy) lines.push(`key safe policy: ${profile.keySafePolicy}`)
    if (profile.what3words) lines.push(`what3words: ${profile.what3words}`)
    if (profile.accessibilityNotes) lines.push(`accessibility: ${profile.accessibilityNotes}`)
    if (profile.deliveryNotes) lines.push(`deliveries: ${profile.deliveryNotes}`)

    const embeddingText = lines.join('. ')
    if (embeddingText.trim().length === 0) {
      // Nothing to index — drop any prior row.
      await this.indexer.deleteEntity('venue_profile', venue.id)
      return
    }

    const tags = ['venue-profile']
    if (profile.fireEscapes?.length) tags.push('fire-safety')
    if (profile.firstAidPoints?.length) tags.push('first-aid')
    if (profile.openingHours) tags.push('hours')

    await this.indexer.upsert({
      organizationId: orgId,
      venueId: venue.id,
      entityType: 'venue_profile',
      entityId: venue.id,
      embeddingText,
      tags,
      kind: 'venue_profile',
      title: `${venue.name} — venue profile`,
      summary: lines.slice(1).join('; ').slice(0, 300) || null,
      metadata: {
        venueName: venue.name,
        venueType: venue.type,
        floorPlanKnowledgeItemId: profile.floorPlanKnowledgeItemId ?? null,
      },
    })
  }
}

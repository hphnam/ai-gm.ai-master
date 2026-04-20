import { Injectable } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import type { CreateVenueBody, VenueListItem } from '@gm-ai/types'

@Injectable()
export class VenuesService {
  async listByOrg(orgId: string): Promise<VenueListItem[]> {
    return prisma.venue.findMany({
      where: { organizationId: orgId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, address: true, type: true, timezone: true },
    })
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
}

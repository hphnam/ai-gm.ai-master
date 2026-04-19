import { Injectable } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import type { VenueListItem } from '@gm-ai/types'

@Injectable()
export class VenuesService {
  async list(): Promise<VenueListItem[]> {
    return prisma.venue.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, address: true, type: true, timezone: true },
    })
  }
}

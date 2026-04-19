import { Controller, Get } from '@nestjs/common'
import type { VenueListItem } from '@gm-ai/types'
import { VenuesService } from './venues.service'

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  list(): Promise<VenueListItem[]> {
    return this.venuesService.list()
  }
}

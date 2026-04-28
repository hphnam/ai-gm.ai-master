import { Module } from '@nestjs/common'
import { IndexerModule } from '../indexer/indexer.module'
import { VenuesController } from './venues.controller'
import { VenuesService } from './venues.service'

@Module({
  imports: [IndexerModule],
  providers: [VenuesService],
  controllers: [VenuesController],
  exports: [VenuesService],
})
export class VenuesModule {}

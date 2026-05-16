import { Module } from '@nestjs/common'
import { SquareController } from './square.controller'
import { SquareProvider } from './square.provider'
import { SquareService } from './square.service'
import { SquareCatalogExtrasService } from './square-catalog-extras.service'
import { SquareCogsService } from './square-cogs.service'
import { SquareCommerceService } from './square-commerce.service'
import { SquareCrmService } from './square-crm.service'

/// Square provider module. IntegrationsModule is @Global, so IntegrationsService
/// + IntegrationRegistry are injectable here without an explicit import.
@Module({
  controllers: [SquareController],
  providers: [
    SquareService,
    SquareCogsService,
    SquareCommerceService,
    SquareCatalogExtrasService,
    SquareCrmService,
    SquareProvider,
  ],
  exports: [SquareService],
})
export class SquareModule {}

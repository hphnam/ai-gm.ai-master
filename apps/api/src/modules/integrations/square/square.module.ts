import { Module } from '@nestjs/common'
import { SquareController } from './square.controller'
import { SquareProvider } from './square.provider'
import { SquareService } from './square.service'

/// Square provider module. IntegrationsModule is @Global, so IntegrationsService
/// + IntegrationRegistry are injectable here without an explicit import.
@Module({
  controllers: [SquareController],
  providers: [SquareService, SquareProvider],
  exports: [SquareService],
})
export class SquareModule {}

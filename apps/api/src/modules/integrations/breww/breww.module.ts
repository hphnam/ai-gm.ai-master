import { Module } from '@nestjs/common'
import { BrewwProvider } from './breww.provider'
import { BrewwService } from './breww.service'

/// Breww provider module. IntegrationsModule is @Global, so IntegrationsService
/// + IntegrationRegistry are injectable here without an explicit import.
@Module({
  providers: [BrewwService, BrewwProvider],
  exports: [BrewwService],
})
export class BrewwModule {}

import { Global, Module } from '@nestjs/common'
import { IntegrationRegistry } from './integration-registry'
import { IntegrationsController } from './integrations.controller'
import { IntegrationsService } from './integrations.service'

/// Core integrations infrastructure. Marked @Global so any provider module
/// (SquareModule today; XeroModule / ToastModule tomorrow) can inject
/// IntegrationsService + IntegrationRegistry without having to import this
/// module explicitly. The registry is a singleton in-process map — there's
/// only one of them, and providers everywhere need it.
@Global()
@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationRegistry],
  exports: [IntegrationsService, IntegrationRegistry],
})
export class IntegrationsModule {}

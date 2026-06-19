import { Module } from '@nestjs/common'
import { BrainClient } from './brain.client'
import { BrainProvider } from './brain.provider'
import { BrainService } from './brain.service'

/// Proactive Brain provider module. IntegrationsModule is @Global, so
/// IntegrationRegistry is injectable here without an explicit import — adding
/// this module to AppModule.imports is what makes BrainProvider.onModuleInit
/// fire and register the four brain tools (NestJS has no auto-discovery).
@Module({
  providers: [BrainClient, BrainService, BrainProvider],
  exports: [BrainService],
})
export class ProactiveBrainModule {}
